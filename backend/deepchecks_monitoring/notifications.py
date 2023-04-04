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

import sqlalchemy as sa
from furl import furl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from typing_extensions import Self

from deepchecks_monitoring import __version__
from deepchecks_monitoring.public_models import Organization, User
from deepchecks_monitoring.schema_models import Check, Model
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule
from deepchecks_monitoring.schema_models.monitor import Monitor

if t.TYPE_CHECKING:
    from deepchecks_monitoring.resources import ResourcesProvider  # pylint: disable=unused-import


__all__ = ["AlertNotificator"]


class AlertNotificator:
    """Class to send notification about alerts."""

    @classmethod
    async def instantiate(
        cls: t.Type[Self],
        organization_id: int,
        alert: Alert,
        session: AsyncSession,
        resources_provider: "ResourcesProvider",
        logger: t.Optional[logging.Logger] = None
    ) -> Self:
        """Create alert notificator instance."""
        if (org := await session.scalar(
            sa.select(Organization)
            .where(Organization.id == organization_id)
        )) is None:
            raise RuntimeError(f"Not existing organization id:{organization_id}")

        if (alert_rule := await session.scalar(
            sa.select(AlertRule).where(AlertRule.id == alert.alert_rule_id).options(
                joinedload(AlertRule.monitor)
                .joinedload(Monitor.check)
                .joinedload(Check.model)
            )
        )) is None:
            raise RuntimeError(f"Not existing alert id:{alert.id}")

        return cls(
            organization=org,
            alert=alert,
            alert_rule=alert_rule,
            session=session,
            resources_provider=resources_provider,
            logger=logger
        )

    def __init__(
        self,
        organization: Organization,
        alert: Alert,
        alert_rule: AlertRule,
        session: AsyncSession,
        resources_provider: "ResourcesProvider",
        logger: t.Optional[logging.Logger] = None
    ):
        self.organization = organization
        self.alert = alert
        self.alert_rule = alert_rule
        self.session = session
        self.resources_provider = resources_provider
        self.logger = logger or logging.getLogger("alert-notificator")

    async def send_emails(self) -> bool:
        """Send notification emails."""
        email_sender = self.resources_provider.email_sender
        if email_sender.is_email_available is False:
            return False

        org = self.organization
        alert = self.alert
        alert_rule = self.alert_rule

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

        deepchecks_host = self.resources_provider.settings.deployment_url
        alert_link = (furl(deepchecks_host) / "alert-rules")
        alert_link = alert_link.add({"models": model.id, "severity": alert_rule.alert_severity.value})

        email_failed_values = alert.named_failed_values if \
            hasattr(alert, "named_failed_values") else alert.failed_values

        email_sender.send(
            subject=f"Alert. Model: {model.name}, Monitor: {monitor.name}",
            recipients=members_emails,
            template_name="alert",
            template_context={
                "alert_link": str(alert_link),
                "alert_title": f"New {alert_rule.alert_severity.value} alert: {monitor.name}",
                "alert_check_value": "|".join([f"{key}: {value}" for key, value in email_failed_values.items()]),
                "alert_date": alert.created_at.strftime("%d/%m/%Y, %H:%M"),
                "model": model.name,
                "check": check.name,
                "condition": str(alert_rule.condition),
            }
        )

        self.logger.info(
            "Alert(id:%s) email notification was sent to Organization(id:%s) members %s",
            alert.id,
            org.id,
            ", ".join(members_emails)
        )

        return True

    async def notify(self):
        """Send notifications."""
        await self.send_emails()
