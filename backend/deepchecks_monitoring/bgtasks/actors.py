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
import sys
import typing as t
from collections import defaultdict

import anyio
import pendulum as pdl
import sqlalchemy as sa
import uvloop
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.bgtasks.task import Actor, ExecutionStrategy, Worker, actor
from deepchecks_monitoring.config import DatabaseSettings
from deepchecks_monitoring.logic.check_logic import MonitorOptions, run_check_window
from deepchecks_monitoring.logic.monitor_alert_logic import get_time_ranges_for_monitor
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.models.monitor import Monitor
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import DataFilterList, make_oparator_func

__all__ = ["execute_monitor"]


@actor(queue_name="monitors", execution_strategy=ExecutionStrategy.NOT_ATOMIC)
async def execute_monitor(
    monitor_id: int,
    timestamp: str,
    session: AsyncSession,
    logger: t.Optional[logging.Logger] = None,
    **kwargs  # pylint: disable=unused-argument
):
    """Execute alert rule."""
    logger = logger or logging.getLogger("execute_monitor")

    logger.info(
        "Executiong Monitor(id:%s) for timestamp %s",
        monitor_id,
        timestamp
    )
    monitor = t.cast(Monitor, await session.scalar(
        sa.select(Monitor)
        .where(Monitor.id == monitor_id)
        .options(joinedload(Monitor.check)),
    ))
    check = monitor.check

    if monitor is None:
        raise ValueError(f"Did not find monitor with the id {monitor_id}")

    alert_rules = t.cast(t.List[AlertRule], (await session.execute(
        sa.select(AlertRule)
        .where(AlertRule.monitor_id == monitor_id)
    )).scalars().all())

    if len(alert_rules) == 0:
        raise ValueError(f"Did not find alert rules for monitor {monitor_id}")

    alerts = []

    # round end/start times to monitor intervals
    end_time = pdl.parser.parse(timestamp)
    start_time, _, frequency = get_time_ranges_for_monitor(
        lookback=monitor.frequency, frequency=monitor.frequency, end_time=end_time)
    end_time = start_time + frequency
    start_time = end_time - pdl.duration(seconds=monitor.aggregation_window)

    monitor_options = MonitorOptions(
        additional_kwargs=monitor.additional_kwargs,
        start_time=start_time.isoformat(),
        end_time=end_time.isoformat(),
        filter=t.cast(DataFilterList, monitor.data_filters)
    )

    model_versions = t.cast(t.List[ModelVersion], (await session.scalars(
        sa.select(ModelVersion)
        .where(ModelVersion.model_id == check.model_id)
        .where(ModelVersion.start_time <= end_time)
        .where(ModelVersion.end_time >= start_time)
        .options(joinedload(ModelVersion.model))
    )).all())

    if not model_versions:
        logger.info("Model(id:%s) is empty (does not have versions)", check.model_id)
        return

    model = model_versions[0].model

    check_results = await run_check_window(check, monitor_options, session, model, model_versions)
    logger.info("Check execution result: %s", check_results)
    check_results = {k: v for k, v in check_results.items() if v is not None}

    for alert_rule in alert_rules:
        if not alert_rule.is_active:
            logger.info("AlertRule(id:%s) is not active", alert_rule.id)
            continue

        if alert := assert_check_results(alert_rule, check_results):
            alert.start_time = start_time
            alert.end_time = end_time
            session.add(alert)
            await session.commit()
            logger.info("Alert instance created for monitor(id:%s)", monitor.id)
            alerts.append(alert)

    if len(alerts) > 0:
        return alerts

    logger.info("No alerts instances were created for monitor(id:%s)", monitor.id)


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
            # JSON serialization fails with numerical keys,
            # therefore we cast id to string
            str(model_version),
            value_name
        )
        for model_version, version_results in results.items()
        for value_name, value in version_results.items()
        if assert_value(value)
    )

    failed_values = defaultdict(list)

    for version_id, failed_value_name in failures:
        failed_values[version_id].append(failed_value_name)

    if failed_values:
        return Alert(
            alert_rule_id=alert_rule.id,
            failed_values=failed_values
        )


class WorkerSettings(DatabaseSettings):
    """Set of worker settings."""

    worker_logfile: t.Optional[str] = None  # scheduler.log
    worker_loglevel: str = "INFO"
    worker_logfile_maxsize: int = 10000000  # 10MB
    worker_logfile_backup_count: int = 3

    class Config:
        """Model config."""

        env_file = ".env"
        env_file_encoding = "utf-8"


class WorkerBootstrap:
    """Worer initialization script."""

    resources_provider_type: t.ClassVar[t.Type[ResourcesProvider]] = ResourcesProvider
    settings_type: t.ClassVar[t.Type[WorkerSettings]] = WorkerSettings
    actors: t.ClassVar[t.Sequence[Actor]] = [execute_monitor]

    async def run(self):
        settings = self.settings_type()  # type: ignore

        logger = logging.getLogger("alerts-executor")
        logger.setLevel(settings.worker_loglevel)
        logger.propagate = True

        h = logging.StreamHandler(sys.stdout)
        h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        h.setLevel(settings.worker_loglevel)
        logger.addHandler(h)

        if settings.worker_logfile:
            h = logging.handlers.RotatingFileHandler(
                filename=settings.worker_logfile,
                maxBytes=settings.worker_logfile_backup_count,
            )
            h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
            h.setLevel(settings.worker_loglevel)
            logger.addHandler(h)

        async with self.resources_provider_type(settings) as rp:
            async with anyio.create_task_group() as g:
                g.start_soon(Worker(
                    engine=rp.async_database_engine,
                    actors=self.actors,
                    additional_params={"resources_provider": rp},
                    logger=logger
                ).start)

    def bootstrap(self):
        uvloop.install()
        anyio.run(self.run)


if __name__ == "__main__":
    WorkerBootstrap().bootstrap()
