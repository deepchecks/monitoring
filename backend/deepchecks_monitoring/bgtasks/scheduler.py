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
"""Contains alert scheduling logic."""
import asyncio
import logging
import logging.handlers
import typing as t
from textwrap import dedent

import anyio
import sqlalchemy as sa
import uvloop
from asyncpg.exceptions import SerializationError
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from sqlalchemy.sql import Executable

from deepchecks_monitoring import __version__
from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.bgtasks.telemetry import collect_telemetry
from deepchecks_monitoring.config import DatabaseSettings
from deepchecks_monitoring.monitoring_utils import TimeUnit, configure_logger
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.resources import ResourcesProvider

__all__ = ["AlertsScheduler"]


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
        self.sleep_seconds = sleep_seconds
        self.logger = logger or logging.getLogger("alerts-scheduler")

    async def run(self):
        """Start alert scheduler."""
        # TODO: add retry logic in case of database connection lose
        engine = self.engine.execution_options(isolation_level="REPEATABLE READ")
        s = self.sleep_seconds
        try:
            while True:
                async with engine.connect() as connection:
                    await self.enqueue_tasks(connection)
                self.logger.info(f"Sleep for the next {s} seconds")
                await asyncio.sleep(s)
        except anyio.get_cancelled_exc_class():
            self.logger.exception("Scheduler coroutine canceled")
            raise
        except Exception:
            self.logger.exception("Failure")
            raise
        except BaseException:
            self.logger.warning("Scheduler interrupted")
            raise

    async def enqueue_tasks(self, connection: AsyncConnection):
        """Enqueue tasks for execution."""
        async with connection.begin():
            organizations = (await connection.execute(
                sa.select(Organization.id, Organization.schema_name)
            )).all()

        if not organizations:
            self.logger.info("No organizations")
            return

        for record in organizations:
            await self.try_enqueue_tasks(
                connection=connection,
                max_attempts=2,  # TODO: provide parameter for this
                delay=1,  # TODO: provide parameter for this
                statement=create_task_enqueueing_query(
                    org_id=record.id,
                    org_schema=record.schema_name
                )
            )

    async def try_enqueue_tasks(
        self,
        connection: AsyncConnection,
        statement: Executable,
        max_attempts: int = 3,
        delay: int = TimeUnit.SECOND * 2
    ) -> t.Optional[t.List[Task]]:
        """Try enqueue monitor execution tasks."""
        attempts = 0
        max_attempts = 3
        delay = 2  # seconds
        while True:
            try:
                async with connection.begin():
                    self.logger.info("Looking for monitors to enqueue for execution")
                    tasks = t.cast(t.List[Task], (await connection.execute(statement)).all())
                    self.logger.info(f"Enqueued {len(tasks)} new task(s)")
                    return tasks
            except (SerializationError, DBAPIError) as error:
                # NOTE:
                # We use 'Repeatable Read Isolation Level' to run query
                # therefore transaction serialization error is possible.
                # If it occurs then we want to repeat query
                attempts += 1
                if isinstance(error, DBAPIError) and not is_serialization_error(error):
                    self.logger.exception("Monitor(s) enqueue failed")
                    raise
                if attempts > max_attempts:
                    self.logger.warning(f"Max number of attemts reached {max_attempts}")
                    return
                else:
                    self.logger.info(
                        "Serialization error occured, will "
                        f"try again in next {delay} seconds"
                    )
                    await asyncio.sleep(delay)


def is_serialization_error(error: DBAPIError):
    orig = getattr(error, "orig", None)
    orig_code = getattr(orig, "pgcode", -1)
    return (
        isinstance(orig, SerializationError)
        or error.code == "40001"
        or orig_code == "40001"
    )


# NOTE: important
# this query relies on two things
# - it must be run with 'Repeatable Read' isolation level
# - 'tasks' table must contain 'unique' constraint for the 'name' column
# without this two points query below will corrupt 'monitors' table
# logical state and will create task duplicates
#
def create_task_enqueueing_query(org_id: int, org_schema: str):
    """Create task enqueueing query.

    FOr more info take a look at the 'deepchecks_monitoring.bgtasks.scheduler.EnqueueTasks'
    """
    # TODO: make query (query parts) more reusable
    return sa.text(dedent(f"""
        WITH
            monitors_info AS (
                SELECT
                    m.id AS monitor_id,
                    (m.frequency || ' seconds')::INTERVAL AS frequency,
                    MAX(mv.end_time) AS end_time,
                    CASE
                        WHEN m.latest_schedule IS NULL THEN m.scheduling_start
                        ELSE m.latest_schedule
                    END AS last_scheduling
                FROM "{org_schema}".monitors       AS m
                JOIN "{org_schema}".checks         AS c ON c.id = m.check_id
                JOIN "{org_schema}".model_versions AS mv ON mv.model_id = c.model_id
                GROUP BY m.id
            ),
            scheduling_series AS (
                SELECT
                    monitor_id AS monitor_id,
                    GENERATE_SERIES(last_scheduling, series_limit, frequency) AS timestamp
                FROM monitors_info,
                LATERAL LEAST(NOW(), end_time) AS series_limit
                WHERE (last_scheduling + frequency) <= series_limit
            ),
            latest_schedule AS (
                SELECT
                    monitor_id,
                    MAX(timestamp) AS timestamp
                FROM scheduling_series
                GROUP BY monitor_id
            ),
            updated_monitors AS (
                UPDATE "{org_schema}".monitors
                SET latest_schedule = latest_schedule.timestamp
                FROM latest_schedule
                WHERE latest_schedule.monitor_id = "{org_schema}".monitors.id
            ),
            enqueued_tasks AS (
                INSERT INTO "{org_schema}".tasks(name, executor, queue, params, priority, description, reference,
                execute_after)
                    SELECT
                        'Monitor:' || monitor_id || ':ts:' || info.epoch,
                        'execute_monitor',
                        'monitors',
                        JSONB_BUILD_OBJECT(
                            'monitor_id', s.monitor_id,
                            'timestamp', info.stringified_timestamp,
                            'organization_id', :org_id,
                            'organization_schema', :org_schema
                        ),
                        1,
                        'Monitor alert rules execution task',
                        'Monitor:' || s.monitor_id,
                        s.timestamp
                    FROM
                        scheduling_series as s,
                        LATERAL (
                            SELECT
                                s.timestamp::varchar,
                                extract(epoch from s.timestamp)::int
                        ) as info(stringified_timestamp, epoch)
                ON CONFLICT ON CONSTRAINT name_uniqueness DO NOTHING
                RETURNING
                    "{org_schema}".tasks.id,
                    "{org_schema}".tasks.name,
                    "{org_schema}".tasks.queue,
                    "{org_schema}".tasks.executor,
                    "{org_schema}".tasks.reference,
                    "{org_schema}".tasks.priority
            )
        SELECT id, name, queue, reference, priority
        FROM enqueued_tasks
    """)).bindparams(org_id=org_id, org_schema=org_schema).columns(
        sa.Column("id", sa.Integer),
        sa.Column("name", sa.String),
        sa.Column("queue", sa.String),
        sa.Column("reference", sa.String),
        sa.Column("priority", sa.Integer)
    )


class SchedulerSettings(DatabaseSettings):
    """Scheduler settings."""

    scheduler_sleep_seconds: int = 30
    scheduler_logfile: t.Optional[str] = None
    scheduler_loglevel: str = "INFO"
    scheduler_logfile_maxsize: int = 10000000  # 10MB
    scheduler_logfile_backup_count: int = 3
    uptrace_dsn: t.Optional[str] = None

    class Config:
        """Model config."""

        env_file = ".env"
        env_file_encoding = "utf-8"


def execute_alerts_scheduler(scheduler_implementation: t.Type[AlertsScheduler]):
    """Execute alrets scheduler."""
    async def main():
        settings = SchedulerSettings()  # type: ignore
        service_name = "alerts-scheduler"

        if settings.uptrace_dsn:
            import uptrace  # pylint: disable=import-outside-toplevel
            uptrace.configure_opentelemetry(
                dsn=settings.uptrace_dsn,
                service_name=service_name,
                service_version=__version__,
            )
            collect_telemetry(scheduler_implementation)

        logger = configure_logger(
            name=service_name,
            log_level=settings.scheduler_loglevel,
            logfile=settings.scheduler_logfile,
            logfile_backup_count=settings.scheduler_logfile_backup_count,
            uptrace_dsn=settings.uptrace_dsn,
        )

        async with ResourcesProvider(settings) as rp:
            async with anyio.create_task_group() as g:
                g.start_soon(scheduler_implementation(
                    rp.async_database_engine,
                    sleep_seconds=settings.scheduler_sleep_seconds,
                    logger=logger
                ).run)

    uvloop.install()
    anyio.run(main)


if __name__ == "__main__":
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
