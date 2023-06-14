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

import sqlalchemy as sa
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from deepchecks_monitoring.api.v1.alert import AlertCreationSchema
from deepchecks_monitoring.logic.check_logic import SingleCheckRunOptions, reduce_check_window, run_check_window
from deepchecks_monitoring.monitoring_utils import DataFilterList, make_oparator_func
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.schema_models.monitor import Frequency, Monitor, as_pendulum_datetime
from deepchecks_monitoring.utils import database
from deepchecks_monitoring.utils.mixpanel import AlertTriggeredEvent

__all__ = ["AlertsTask"]


class AlertsTask(BackgroundWorker):
    """Worker to calculate alerts"""

    def __init__(self):
        super().__init__()
        self._logger = logging.getLogger(__name__)

    @classmethod
    def queue_name(cls) -> str:
        return "alerts"

    @classmethod
    def delay_seconds(cls) -> int:
        return 0

    async def run(self, task: Task, session: AsyncSession, resources_provider: ResourcesProvider, lock):
        organization_id = task.params["organization_id"]
        monitor_id = task.params["monitor_id"]
        timestamp = task.params["timestamp"]

        organization_schema = (await session.execute(
            select(Organization.schema_name).where(Organization.id == organization_id)
        )).scalar_one_or_none()

        # If organization was removed doing nothing
        if organization_schema is not None:
            await database.attach_schema_switcher_listener(
                session=session,
                schema_search_path=[organization_schema, "public"]
            )
            alerts = await execute_monitor(
                session=session,
                resources_provider=resources_provider,
                monitor_id=monitor_id,
                timestamp=timestamp,
                logger=self._logger,
                organization_id=organization_id,
            )
        else:
            alerts = []

        # Deleting the task
        await session.execute(delete(Task).where(Task.id == task.id))
        await session.commit()

        for alert in alerts:
            # TODO: move to different worker?
            notificator = await resources_provider.ALERT_NOTIFICATOR_TYPE.instantiate(
                alert=alert,
                organization_id=organization_id,
                session=session,
                resources_provider=resources_provider,
                logger=self._logger.getChild("alert-notificator")
            )
            await resources_provider.report_mixpanel_event(
                AlertTriggeredEvent.create_event,
                alert=alert,
                organization=await session.get(Organization, organization_id)
            )
            await notificator.notify()


async def execute_monitor(
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
            model_versions=model_versions_without_cache
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
            alert.end_time = end_time
            AlertCreationSchema.validate(alert)
            session.add(alert)
            logger.info("Alert(id:%s) instance created for monitor(id:%s)", alert.id, monitor.id)
            alerts.append(alert)

    if (n_of_alerts := len(alerts)) > 0:
        logger.info("%s alerts raised for Monitor(id:%s)", n_of_alerts, monitor.id)
        return alerts

    logger.info("No alerts were raised for Monitor(id:%s)", monitor.id)
    return []


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
