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
import sqlalchemy as sa
import uvloop
from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from deepchecks_monitoring import config
from deepchecks_monitoring.api.v1.alert import AlertCreationSchema
from deepchecks_monitoring.bgtasks.core import Actor, ExecutionStrategy, TasksBroker, Worker, actor
from deepchecks_monitoring.logic.check_logic import SingleCheckRunOptions, reduce_check_window, run_check_window
from deepchecks_monitoring.monitoring_utils import DataFilterList, configure_logger, make_oparator_func
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.schema_models.monitor import Frequency, Monitor, as_pendulum_datetime

__all__ = ["execute_monitor"]


async def _execute_monitor(
        monitor_id: int,
        timestamp: str,
        session: AsyncSession,
        resources_provider: ResourcesProvider,
        organization_id,
        logger: t.Optional[logging.Logger] = None,
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

    monitor_frequency = t.cast(Frequency, monitor.frequency).to_pendulum_duration()
    end_time = as_pendulum_datetime(timestamp)
    start_time = end_time - (monitor_frequency * t.cast(int, monitor.aggregation_window))

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

    # First looking for results in cache if already calculated
    cache_results = {}
    model_versions_without_cache = []
    for model_version in model_versions:
        cache_result = resources_provider.cache_functions.get_monitor_cache(
            organization_id, model_version.id, monitor_id, start_time, end_time)
        if cache_result.found:
            cache_results[model_version] = cache_result.value
        else:
            model_versions_without_cache.append(model_version)
        logger.debug("Cache result: %s", cache_results)

    # For model versions without result in cache running calculation
    if model_versions_without_cache:
        options = SingleCheckRunOptions(
            additional_kwargs=monitor.additional_kwargs,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            filter=t.cast(DataFilterList, monitor.data_filters)
        )
        result_per_version = await run_check_window(
            check,
            monitor_options=options,
            session=session,
            model=model_versions_without_cache[0].model,
            model_versions=model_versions_without_cache,
            parallel=resources_provider.settings.is_cloud,
        )

        result_per_version = reduce_check_window(result_per_version, options)
        # Save to cache
        for version, result in result_per_version.items():
            resources_provider.cache_functions.set_monitor_cache(
                organization_id, version.id, monitor_id, start_time, end_time, result)

        logger.debug("Check execution result: %s", result_per_version)
    else:
        result_per_version = {}

    check_results = {**cache_results, **result_per_version}
    check_results = {k: v for k, v in check_results.items() if v is not None}
    alerts = []

    for alert_rule in alert_rules:
        if alert_rule.start_time is None:
            # The first time we run the alert rule we want to set the start time as the end time of the current window
            await session.execute(update(AlertRule).where(AlertRule.id == alert_rule.id)
                                  .values({AlertRule.start_time: func.least(AlertRule.start_time, end_time)}))
        if not alert_rule.is_active:
            logger.info("AlertRule(id:%s) is not active, skipping it", alert_rule.id)
        elif alert := assert_check_results(alert_rule, check_results):
            alert.start_time = start_time
            # We want to save the end time of the alert as inclusive, so subtracting 1 microsecond
            alert.end_time = end_time.subtract(microseconds=1)
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


@actor(queue_name="monitors", execution_strategy=ExecutionStrategy.NOT_ATOMIC)
async def execute_monitor(
        organization_id: int,
        organization_schema: str,  # pylint: disable=unused-argument
        monitor_id: int,
        timestamp: str,
        session: AsyncSession,
        resources_provider: ResourcesProvider,
        logger: logging.Logger,
        **kwargs  # pylint: disable=unused-argument
) -> t.List[Alert]:
    """Execute alert rule."""
    alerts = await _execute_monitor(
        session=session,
        resources_provider=resources_provider,
        monitor_id=monitor_id,
        timestamp=timestamp,
        logger=logger,
        organization_id=organization_id,
    )
    for alert in alerts:
        # TODO:
        notificator = await resources_provider.ALERT_NOTIFICATOR_TYPE.instantiate(
            alert=alert,
            organization_id=organization_id,
            session=session,
            resources_provider=resources_provider,
            logger=logger.getChild("alert-notificator")
        )
        await notificator.notify()

    return alerts


def assert_check_results(
        alert_rule: AlertRule,
        results: t.Dict[ModelVersion, t.Dict[str, t.Any]]
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

    failed_values: t.Dict[ModelVersion, t.Dict[str, float]] = defaultdict(dict)

    for version, failed_value_name, failed_value_value in failures:
        failed_values[version][failed_value_name] = failed_value_value

    failed_values_by_id = {str(version.id): val for version, val in failed_values.items()}
    if failed_values:
        alert = Alert(
            alert_rule_id=alert_rule.id,
            failed_values=failed_values_by_id,
            resolved=False
        )
        alert.named_failed_values = {version.name: val for version, val in failed_values.items()}
        return alert


class WorkerSettings(
    config.Settings,
):
    """Set of worker settings."""

    worker_logfile: t.Optional[str] = None
    worker_loglevel: str = "INFO"
    worker_logfile_maxsize: int = 10000000  # 10MB
    worker_logfile_backup_count: int = 3


class WorkerBootstrap:
    """Worker initialization script."""

    resources_provider_type: t.ClassVar[t.Type[ResourcesProvider]]
    settings_type: t.ClassVar[t.Type[WorkerSettings]]
    task_broker_type: t.ClassVar[t.Type[TasksBroker]] = TasksBroker
    actors: t.ClassVar[t.Sequence[Actor]] = [execute_monitor]

    try:
        from deepchecks_monitoring import ee  # pylint: disable=import-outside-toplevel
    except ImportError:
        service_name = "deepchecks-worker"
        resources_provider_type = ResourcesProvider
        settings_type = WorkerSettings
    else:
        service_name = "deepchecks-worker-ee"
        resources_provider_type = ee.resources.ResourcesProvider
        settings_type = type(
            "WorkerSettings",
            (WorkerSettings, ee.config.TelemetrySettings, ee.config.SlackSettings),
            {}
        )

    async def run(self):
        settings = self.settings_type()  # type: ignore

        logger = configure_logger(
            name=self.service_name,
            log_level=settings.worker_loglevel,
            logfile=settings.worker_logfile,
            logfile_backup_count=settings.worker_logfile_backup_count,
        )

        async with self.resources_provider_type(settings) as rp:
            rp.initialize_telemetry_collectors(Worker)

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
