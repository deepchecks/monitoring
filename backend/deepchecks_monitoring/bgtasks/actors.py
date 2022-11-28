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
"""Alert execution logic."""
import logging
import logging.handlers
import typing as t
from collections import defaultdict

import anyio
import pendulum as pdl
import sqlalchemy as sa
import uvloop
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from deepchecks_monitoring import __version__
from deepchecks_monitoring.api.v1.alert import AlertCreationSchema
from deepchecks_monitoring.bgtasks.core import Actor, ExecutionStrategy, TasksBroker, Worker, actor
from deepchecks_monitoring.bgtasks.telemetry import collect_telemetry
from deepchecks_monitoring.config import DatabaseSettings
from deepchecks_monitoring.logic.check_logic import MonitorOptions, reduce_check_window, run_check_window
from deepchecks_monitoring.logic.monitor_alert_logic import get_time_ranges_for_monitor
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.models.monitor import Monitor
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import DataFilterList, configure_logger, make_oparator_func

__all__ = ["execute_monitor"]


@actor(queue_name="monitors", execution_strategy=ExecutionStrategy.NOT_ATOMIC)
async def execute_monitor(
        monitor_id: int,
        timestamp: str,
        session: AsyncSession,
        logger: t.Optional[logging.Logger] = None,
        **kwargs  # pylint: disable=unused-argument
) -> t.List[Alert]:
    """Execute monitor alert rules."""
    logger = logger or logging.getLogger("monitor-executor")
    logger.info("Execution of Monitor(id:%s) for timestamp %s", monitor_id, timestamp)

    monitor = t.cast(Monitor, await session.scalar(
        sa.select(Monitor)
        .where(Monitor.id == monitor_id)
        .options(
            joinedload(Monitor.check),
            selectinload(Monitor.alert_rules)
        )
    ))

    if monitor is None:
        raise ValueError(f"Did not find monitor with the id {monitor_id}")

    check = monitor.check
    alert_rules = monitor.alert_rules

    if len(alert_rules) == 0:
        logger.info("Monitor(id:%s) does not have alert rules", monitor_id)
        return []

    # round end/start times to monitor intervals
    start_time, _, frequency = get_time_ranges_for_monitor(
        lookback=monitor.frequency,
        frequency=monitor.frequency,
        end_time=pdl.parser.parse(timestamp)
    )

    end_time = start_time + frequency
    start_time = end_time - pdl.duration(seconds=monitor.aggregation_window)

    model_versions = t.cast(t.List[ModelVersion], (await session.scalars(
        sa.select(ModelVersion)
        .where(ModelVersion.model_id == check.model_id)
        .where(ModelVersion.start_time <= end_time)
        .where(ModelVersion.end_time >= start_time)
        .options(joinedload(ModelVersion.model))
    )).all())

    if not model_versions:
        logger.info("Model(id:%s) is empty (does not have versions)", check.model_id)
        return []

    options = MonitorOptions(
        additional_kwargs=monitor.additional_kwargs,
        start_time=start_time.isoformat(),
        end_time=end_time.isoformat(),
        filter=t.cast(DataFilterList, monitor.data_filters)
    )
    check_results = await run_check_window(
        check,
        monitor_options=options,
        session=session,
        model=model_versions[0].model,
        model_versions=model_versions
    )

    check_results = reduce_check_window(check_results, options)

    logger.debug("Check execution result: %s", check_results)
    check_results = {k: v for k, v in check_results.items() if v is not None}
    alerts = []

    for alert_rule in alert_rules:
        if not alert_rule.is_active:
            logger.info("AlertRule(id:%s) is not active, skipping it", alert_rule.id)
        elif alert := assert_check_results(alert_rule, check_results):
            alert.start_time = start_time
            alert.end_time = end_time
            AlertCreationSchema.validate(alert)
            session.add(alert)
            await session.commit()
            logger.info("Alert(id:%s) instance created for monitor(id:%s)", alert.id, monitor.id)
            alerts.append(alert)

    if (n_of_alerts := len(alerts)) > 0:
        logger.info("%s alerts raised for Monitor(id:%s)", n_of_alerts, monitor.id)
        return alerts

    logger.info("No alerts were raised for Monitor(id:%s)", monitor.id)
    return []


def assert_check_results(
        alert_rule: AlertRule,
        results: t.Dict[int, t.Dict[str, t.Any]]
) -> t.Optional[Alert]:
    """Assert check result in accordance to alert rule."""
    alert_condition = t.cast(Condition, alert_rule.condition)
    operator = make_oparator_func(alert_condition.operator)

    def assert_value(v):
        return operator(v, alert_condition.value)

    failures = (
        (
            model_version,
            value_name,
            value
        )
        for model_version, version_results in results.items()
        for value_name, value in version_results.items()
        if assert_value(value)
    )

    failed_values = defaultdict(dict)

    for version_id, failed_value_name, failed_value_value in failures:
        failed_values[version_id][failed_value_name] = failed_value_value

    if failed_values:
        return Alert(
            alert_rule_id=alert_rule.id,
            failed_values=dict(failed_values),
            resolved=False
        )


class WorkerSettings(DatabaseSettings):
    """Set of worker settings."""

    worker_logfile: t.Optional[str] = None
    worker_loglevel: str = "INFO"
    worker_logfile_maxsize: int = 10000000  # 10MB
    worker_logfile_backup_count: int = 3
    uptrace_dsn: t.Optional[str] = None


class WorkerBootstrap:
    """Worer initialization script."""

    resources_provider_type: t.ClassVar[t.Type[ResourcesProvider]] = ResourcesProvider
    settings_type: t.ClassVar[t.Type[WorkerSettings]] = WorkerSettings
    task_broker_type: t.ClassVar[t.Type[TasksBroker]] = TasksBroker
    actors: t.ClassVar[t.Sequence[Actor]] = [execute_monitor]

    async def run(self):
        settings = self.settings_type()  # type: ignore
        service_name = "deepchecks-worker"

        if settings.uptrace_dsn:
            import uptrace  # pylint: disable=import-outside-toplevel
            uptrace.configure_opentelemetry(
                dsn=settings.uptrace_dsn,
                service_name=service_name,
                service_version=__version__,
            )
            collect_telemetry(Worker)

        logger = configure_logger(
            name=service_name,
            log_level=settings.worker_loglevel,
            logfile=settings.worker_logfile,
            logfile_backup_count=settings.worker_logfile_backup_count,
            uptrace_dsn=settings.uptrace_dsn,
        )

        async with self.resources_provider_type(settings) as rp:
            async with anyio.create_task_group() as g:
                g.start_soon(Worker.create(
                    engine=rp.async_database_engine,
                    task_broker_type=self.task_broker_type,
                    actors=self.actors,
                    additional_params={"resources_provider": rp},
                    logger=logger,
                ).start)

    def bootstrap(self):
        uvloop.install()
        anyio.run(self.run)


if __name__ == "__main__":
    WorkerBootstrap().bootstrap()
