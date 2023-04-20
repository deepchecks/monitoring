# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
# pylint: disable=ungrouped-imports
"""Contains alert scheduling logic."""
import asyncio
import logging
import logging.handlers
import typing as t
from collections import defaultdict

import anyio
import pendulum as pdl
import sqlalchemy as sa
import uvloop
from asyncpg import SerializationError
from sqlalchemy import Column, DateTime, MetaData, Table, Text, func, literal_column, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import joinedload, load_only, sessionmaker

from deepchecks_monitoring import __version__, config
from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.monitoring_utils import TimeUnit, configure_logger, json_dumps
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.schema_models import Check, Model, ModelVersion, Monitor
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_LOGGED_TIME_COL,
                                                             SAMPLE_PRED_COL, SAMPLE_TS_COL,
                                                             get_predictions_columns_by_type)
from deepchecks_monitoring.schema_models.monitor import Frequency
from deepchecks_monitoring.utils import database

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from pendulum.datetime import DateTime as PendulumDateTime

__all__ = ['AlertsScheduler']


# TODO: rename to MonitorScheduler
class AlertsScheduler:
    """Alerts scheduler."""

    def __init__(
        self,
        engine: AsyncEngine,
        sleep_seconds: int = TimeUnit.MINUTE * 5,
        logger: t.Optional[logging.Logger] = None,
    ):
        self.engine = engine
        self.async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        self.sleep_seconds = sleep_seconds
        self.logger = logger or logging.getLogger('alerts-scheduler')

    async def run(self):
        """Start alert scheduler."""
        s = self.sleep_seconds
        try:
            while True:
                await self.run_all_organizations()
                self.logger.info(f'Sleep for the next {s} seconds')
                await asyncio.sleep(s)
        except anyio.get_cancelled_exc_class():
            self.logger.exception('Scheduler coroutine canceled')
            raise
        except Exception:
            self.logger.exception('Failure')
            raise
        except BaseException:
            self.logger.warning('Scheduler interrupted')
            raise

    async def run_all_organizations(self):
        """Enqueue tasks for execution."""
        async with self.async_session_factory() as session:
            organizations = (await session.execute(
                sa.select(Organization).options(load_only(Organization.schema_name))
            )).scalars()

        if not organizations:
            self.logger.info('No organizations')
            return

        for org in organizations:
            await self.run_organization(org)

    async def run_organization(self, organization):
        """Try enqueue monitor execution tasks."""
        async with self.async_session_factory() as session:
            await database.attach_schema_switcher_listener(
                session=session,
                schema_search_path=[organization.schema_name, 'public']
            )
            monitors = await session.scalars(
                select(Monitor)
                .options(
                    joinedload(Monitor.check)
                    .load_only(Check.model_id, Check.is_label_required)
                    .joinedload(Check.model)
                )
                .where(
                    Monitor.latest_schedule.isnot(None),
                    (Monitor.latest_schedule + Monitor.frequency_as_interval) < Model.end_time
                )
            )

            # Aggregate the monitors per model in order to query the versions windows data only once per model
            monitors_per_model = defaultdict(list)
            for m in monitors:
                monitors_per_model[m.check.model].append(m)

            for model, monitors in monitors_per_model.items():
                # Get the minimal time needed to query windows data for. Doing it together for all monitors in order to
                # query the data once
                minimum_time = min(
                    t.cast(Monitor, m).left_edge_of_calculation_window
                    for m in monitors
                )
                versions = await session.scalars(
                    select(ModelVersion)
                    .options(load_only(ModelVersion.model_id))
                    .where(
                        ModelVersion.end_time >= minimum_time,
                        ModelVersion.model_id == model.id
                    )
                )

                versions_windows = await get_versions_hour_windows(model, versions, session, minimum_time)

                # For each monitor enqueue schedules
                for monitor in monitors:
                    schedules = []
                    frequency = monitor.frequency.to_pendulum_duration()
                    schedule_time = monitor.next_schedule

                    # IMPORTANT NOTE: Forwarding the schedule only if the rule is passing for ALL the model versions.
                    while (
                        schedule_time <= model.end_time
                        and rules_pass(versions_windows, monitor, schedule_time, model)
                    ):
                        schedules.append(schedule_time)
                        schedule_time = schedule_time + frequency

                    if schedules:
                        try:
                            await enqueue_tasks(monitor, schedules, organization, session)
                            monitor.latest_schedule = schedules[-1]
                            await session.commit()
                        # NOTE:
                        # We use 'Repeatable Read Isolation Level' to run query therefore transaction serialization
                        # error is possible. In that case we just skip the monitor and try again next time.
                        except (SerializationError, DBAPIError) as error:
                            if isinstance(error, DBAPIError) and not is_serialization_error(error):
                                self.logger.exception('Monitor(id=%s) tasks enqueue failed', monitor.id)
                                raise


async def get_versions_hour_windows(
    model: Model,
    versions: t.List[ModelVersion],
    session: AsyncSession,
    minimum_time: 'PendulumDateTime'
) -> t.List[t.Dict[int, t.Dict]]:
    """Get windows data for all given versions starting from minimum time.

    Returns
    -------
    List[Dict[int, Dict]]
        A list of dictionaries of hour (timestamp) to a dictionary window data
    """
    results = []
    labels_table = model.get_sample_labels_table(session)
    for version in versions:
        label_type = get_predictions_columns_by_type(model.task_type, False)[0][SAMPLE_PRED_COL].to_sqlalchemy_type()
        # We don't need to load all columns, just initializing the needed columns
        mon_table = Table(version.get_monitor_table_name(), MetaData(), Column(SAMPLE_ID_COL, Text),
                          Column(SAMPLE_LOGGED_TIME_COL, DateTime(timezone=True)),
                          Column(SAMPLE_TS_COL, DateTime(timezone=True)),
                          Column(SAMPLE_PRED_COL, label_type))

        hour_window = literal_column(
            f'date_trunc(\'hour\', "{SAMPLE_TS_COL}") + interval \'1 hour\''
        ).label('hour_window')

        # The hour window represents the end of the hour, so we are looking for hour windows which are larger than the
        # minimum time. For example if minimum time is 2:00 We want the windows of 3:00 and above
        query = select(
            hour_window,
            func.count(mon_table.c[SAMPLE_PRED_COL]).label('count_predictions'),
            func.max(mon_table.c[SAMPLE_LOGGED_TIME_COL]).label('max_logged_timestamp'),
            func.count(labels_table.c[SAMPLE_LABEL_COL]).label('count_labels')
        ).join(labels_table, mon_table.c[SAMPLE_ID_COL] == labels_table.c[SAMPLE_ID_COL], isouter=True)\
            .where(hour_window > minimum_time)\
            .group_by(hour_window)

        records = (await session.execute(query)).all()
        results.append({int(r['hour_window'].timestamp()): r for r in records})
    return results


def rules_pass(
    versions_windows: t.List[t.Dict[int, t.Dict]],
    monitor: Monitor,
    schedule_time: pdl.DateTime,
    model: Model
):
    """Check the versions windows for given schedule time. If in all versions at least one of the alerts delay rules \
    passes, return True. Otherwise, return False."""
    # Rules applies only for monitors that are related to labels
    check: Check = monitor.check
    if not check.is_label_required:
        return True
    # Adding 1 hour since the time in version info represents the end of the hour. For example if my schedule time is
    # 14:00 and 2 hours aggregation window, I need to hour windows of [13:00, 14:00] (as they represent the end of the
    # hour)
    frequency = t.cast(Frequency, monitor.frequency).to_pendulum_duration()
    aggregation_window = t.cast(int, monitor.aggregation_window)
    start_hour = int((schedule_time - (frequency * aggregation_window)).int_timestamp) + 3600
    hours = list(range(start_hour, schedule_time.int_timestamp + 1, 3600))
    # Test each version
    for windows in versions_windows:
        total_preds_count = 0
        total_label_count = 0
        max_timestamp = None
        # Accumulate the total windows values for the given range in this version
        for hour in hours:
            # Not all windows exists in all versions, if doesn't exist there is no data in this version for this window
            if window := windows.get(hour):
                total_preds_count += window['count_predictions']
                total_label_count += window['count_labels']
                max_timestamp = max(max_timestamp, window['max_logged_timestamp']) if max_timestamp else \
                    window['max_logged_timestamp']

        # Only test rules if found anything (if count is 0 then there is no data for this version for those windows)
        if total_preds_count > 0:
            labels_percent = total_label_count / total_preds_count
            # Test the rules. If both rules don't pass, return False.
            if (
                labels_percent < model.alerts_delay_labels_ratio
                and max_timestamp and pdl.instance(max_timestamp).add(seconds=model.alerts_delay_seconds) > pdl.now()
            ):
                return False
    # In all versions at least one of the rules passed, return True
    return True


async def enqueue_tasks(monitor, schedules, organization, session):
    tasks = []
    for schedule in schedules:
        tasks.append(dict(
            name=f'Monitor:{monitor.id}:ts:{schedule.int_timestamp}',
            executor='execute_monitor',
            queue='monitors',
            params={'monitor_id': monitor.id, 'timestamp': schedule.to_iso8601_string(),
                     'organization_id': organization.id, 'organization_schema': organization.schema_name},
            priority=1,
            description='Monitor alert rules execution task',
            reference=f'Monitor:{monitor.id}',
            execute_after=schedule
         ))

    await session.execute(insert(Task).values(tasks).on_conflict_do_nothing(constraint='name_uniqueness'))


def is_serialization_error(error: DBAPIError):
    orig = getattr(error, 'orig', None)
    orig_code = getattr(orig, 'pgcode', -1)
    return (
        isinstance(orig, SerializationError)
        or error.code == '40001'
        or orig_code == '40001'
    )


class BaseSchedulerSettings(config.DatabaseSettings):
    """Scheduler settings."""

    scheduler_sleep_seconds: int = 30
    scheduler_logfile: t.Optional[str] = None
    scheduler_loglevel: str = 'INFO'
    scheduler_logfile_maxsize: int = 10000000  # 10MB
    scheduler_logfile_backup_count: int = 3


try:
    from deepchecks_monitoring import ee  # pylint: disable=import-outside-toplevel

    with_ee = True

    class SchedulerSettings(BaseSchedulerSettings, ee.config.TelemetrySettings):
        """Set of worker settings."""
        pass
except ImportError:
    with_ee = False

    class SchedulerSettings(BaseSchedulerSettings):
        """Set of worker settings."""
        pass


def execute_alerts_scheduler(scheduler_implementation: t.Type[AlertsScheduler]):
    """Execute alrets scheduler."""
    async def main():
        settings = SchedulerSettings()  # type: ignore
        service_name = 'alerts-scheduler'

        if with_ee:
            if settings.sentry_dsn:
                import sentry_sdk  # pylint: disable=import-outside-toplevel
                sentry_sdk.init(
                    dsn=settings.sentry_dsn,
                    traces_sample_rate=0.6,
                    environment=settings.sentry_env
                )
                ee.utils.telemetry.collect_telemetry(scheduler_implementation)

        logger = configure_logger(
            name=service_name,
            log_level=settings.scheduler_loglevel,
            logfile=settings.scheduler_logfile,
            logfile_backup_count=settings.scheduler_logfile_backup_count,
        )

        async_engine = create_async_engine(
            str(settings.async_database_uri),
            json_serializer=json_dumps,
            pool_pre_ping=True,
            isolation_level='REPEATABLE READ'
        )

        async with anyio.create_task_group() as g:
            g.start_soon(scheduler_implementation(
                async_engine,
                sleep_seconds=settings.scheduler_sleep_seconds,
                logger=logger
            ).run)

    uvloop.install()
    anyio.run(main)


if __name__ == '__main__':
    # NOTE:
    # it looks weird but a problem is that python creates
    # a __main__ module by copying deepchecks_monitoring.bgtasks.scheduler
    # module as a result of this, we will have two types of alert scheduler:
    # 1. __main__.AlertsSchedulers
    # 2. deepchecks_monitoring.bgtasks.scheduler.AlertsSchedulers
    # this might cause 'execute_alerts_scheduler' to fail, therefore
    # we need to reimport AlertsScheduler type
    #
    from deepchecks_monitoring.bgtasks import scheduler
    execute_alerts_scheduler(scheduler.AlertsScheduler)
