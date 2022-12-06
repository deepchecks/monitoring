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
import asyncio
import logging
import logging.handlers
import typing as t
from collections import defaultdict

import anyio
import httpx
import pendulum as pdl
import sqlalchemy as sa
import uvloop
from furl import furl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from deepchecks_monitoring import __version__
from deepchecks_monitoring.api.v1.alert import AlertCreationSchema
from deepchecks_monitoring.bgtasks.core import Actor, ExecutionStrategy, TasksBroker, Worker, actor
from deepchecks_monitoring.bgtasks.telemetry import collect_telemetry
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.integrations.email import EmailMessage
from deepchecks_monitoring.logic.check_logic import MonitorOptions, reduce_check_window, run_check_window
from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
from deepchecks_monitoring.monitoring_utils import DataFilterList, configure_logger, make_oparator_func
from deepchecks_monitoring.public_models import Organization, User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Check, Model
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.schema_models.alert_webhook import AlertWebhook
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.schema_models.monitor import Monitor
from deepchecks_monitoring.schema_models.slack import SlackInstallation
from deepchecks_monitoring.utils import slack

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

    end_time = floor_window_for_time(pdl.parse(timestamp), monitor.frequency)
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

    # First looking for results in cache if already calculated
    cache_results = {}
    model_versions_without_cache = []
    for model_version in model_versions:
        cache_result = resources_provider.cache_functions.get_monitor_cache(
            organization_id, model_version.id, monitor_id, start_time, end_time)
        if cache_result.found:
            cache_results[model_version.name] = cache_result.value
        else:
            model_versions_without_cache.append(model_version)
        logger.debug("Cache result: %s", cache_results)

    # For model versions without result in cache running calculation
    if model_versions_without_cache:
        options = MonitorOptions(
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

        run_check_results = {version.name: val for version, val in result_per_version.items()}
        logger.debug("Check execution result: %s", run_check_results)
    else:
        run_check_results = {}

    check_results = {**cache_results, **run_check_results}
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
        notificator = await AlertNotificator.instantiate(
            alert_id=t.cast(int, alert.id),
            organization_id=organization_id,
            session=session,
            resources_provider=resources_provider,
            logger=logger.getChild("alert-notificator")
        )
        await notificator.notify()

    return alerts


# TODO: consider splitting into three classes/functions
# - AlertEmailNotificator
# - AlertSlackNotificator
# - AlertWebhooksExecutor
class AlertNotificator:
    """Class to send notification about alerts."""

    @classmethod
    async def instantiate(
        cls: t.Type["AlertNotificator"],
        organization_id: int,
        alert_id: int,
        session: AsyncSession,
        resources_provider: ResourcesProvider,
        logger: t.Optional[logging.Logger] = None
    ) -> "AlertNotificator":
        if (org := await session.scalar(
            sa.select(Organization)
            .where(Organization.id == organization_id)
        )) is None:
            raise RuntimeError(f"Not existing organization id:{organization_id}")

        if (alert := await session.scalar(
            sa.select(Alert).where(Alert.id == alert_id).options(
                joinedload(Alert.alert_rule)
                .joinedload(AlertRule.monitor)
                .joinedload(Monitor.check)
                .joinedload(Check.model)
            )
        )) is None:
            raise RuntimeError(f"Not existing alert id:{alert_id}")

        return cls(
            organization=org,
            alert=alert,
            session=session,
            resources_provider=resources_provider,
            logger=logger
        )

    def __init__(
        self,
        organization: Organization,
        alert: Alert,
        session: AsyncSession,
        resources_provider: ResourcesProvider,
        logger: t.Optional[logging.Logger] = None
    ):
        self.organization = organization
        self.alert = alert
        self.session = session
        self.resources_provider = resources_provider
        self.logger = logger or logging.getLogger("alert-notificator")

    async def send_emails(self) -> bool:
        """Send notification emails."""
        org = self.organization
        alert = self.alert

        alert_rule = t.cast(AlertRule, alert.alert_rule)
        monitor = t.cast(Monitor, alert_rule.monitor)
        check = t.cast(Check, monitor.check)
        model = t.cast(Model, check.model)

        if alert_rule.alert_severity not in org.email_notification_levels:
            notification_levels = ",".join(t.cast(t.List[t.Any], org.email_notification_levels))
            self.logger.info(
                "AlertRule(id:%s) severity (%s) is not included in "
                "Organization(id:%s) email notification levels config (%s)",
                alert_rule.id,
                alert_rule.alert_severity,
                org.id,
                notification_levels
            )
            return False

        members_emails = (await self.session.scalars(
            sa.select(User.email).where(User.organization_id == org.id)
        )).all()

        if not members_emails:
            self.logger.error("Organization(id:%s) does not have members", org.id)
            return False

        settings = self.resources_provider.settings
        alert_link = (furl(settings.host) / "alert-rules")
        alert_link = alert_link.add({"models": model.id, "severity": alert_rule.alert_severity.value})

        self.resources_provider.email_sender.send(EmailMessage(
            subject=f"Alert. Model: {model.name}, Monitor: {monitor.name}",
            sender=self.resources_provider.settings.deepchecks_email,
            recipients=members_emails,
            template_name="alert",
            template_context={
                "alert_link": str(alert_link),
                "alert_title": f"New {alert_rule.alert_severity.value} alert: {monitor.name}",
                "alert_check_value": "|".join([f"{key}: {value}" for key, value in alert.failed_values.items()]),
                "alert_date": alert.created_at.strftime("%d/%m/%Y, %H:%M"),
                "model": model.name,
                "check": check.name,
                "condition": str(alert_rule.condition),
            }
        ))

        self.logger.info(
            "Alert(id:%s) email notification was sent to Organization(id:%s) members %s",
            alert.id,
            org.id,
            ", ".join(members_emails)
        )

        return True

    async def send_slack_messages(self) -> bool:
        """Send slack message."""
        org = self.organization
        alert = self.alert
        alert_rule = t.cast(AlertRule, alert.alert_rule)

        if alert_rule.alert_severity not in org.slack_notification_levels:
            notification_levels = ",".join(t.cast(t.List[t.Any], org.slack_notification_levels))
            self.logger.info(
                "AlertRule(id:%s) severity (%s) is not included in "
                "Organization(id:%s) slack notification levels config (%s)",
                alert_rule.id,
                alert_rule.alert_severity,
                org.id,
                notification_levels
            )
            return False

        q = sa.select(SlackInstallation)
        slack_apps = (await self.session.scalars(q)).all()
        slack_apps = t.cast(t.List[SlackInstallation], slack_apps)

        if not slack_apps:
            self.logger.info(
                "Organization(id:%s) does not have connected slack bots",
                org.id,
            )
            return False

        deepchecks_host = self.resources_provider.settings.host
        errors: t.List[t.Tuple[SlackInstallation, str]] = []
        notification = slack.SlackAlertNotification(alert, deepchecks_host).blocks()

        for app in slack_apps:
            response = app.webhook_client().send(blocks=notification)
            if response.status_code != 200:
                errors.append((app, response.body))
            else:
                self.logger.info(
                    "Alert(id:%s) slack notification was sent to Organization(id:%s) %s:%s:%s slack workspace",
                    alert.id, org.id, app.app_id, app.team_name, app.team_id,
                )

        if errors:
            msg = ";\n".join(
                f"app:{app.id} - {message}"
                for app, message in errors
            )
            self.logger.error(
                "Failed to send Alert(id:%s) slack notification to the "
                "next Organization(id:%s) slack workspaces.\n%s",
                alert.id, org.id, msg
            )

        return len(errors) < len(slack_apps)

    async def execute_webhooks(self) -> bool:
        org = self.organization
        alert = self.alert
        webhooks = await self.session.scalars(sa.select(AlertWebhook))

        if not webhooks:
            return False

        webhooks = t.cast(t.Sequence[AlertWebhook], webhooks)

        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(
                *(
                    w.execute(
                        alert=alert,
                        client=client,
                        settings=self.resources_provider.settings,
                        logger=self.logger
                    )
                    for w in webhooks
                ),
                return_exceptions=True
            )

            if any(isinstance(it, Exception) or it is False for it in results):
                self.logger.warning(
                    f"Execution of not all Organization(id:{org.id}) "
                    "webhooks were successful"
                )
                return False

            await self.session.flush()
            await self.session.commit()
            return True

    async def notify(self):
        await self.send_emails()
        await self.send_slack_messages()
        await self.execute_webhooks()


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


class WorkerSettings(Settings):
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
