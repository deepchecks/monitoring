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
import typing as t

import httpx
import sqlalchemy as sa

from deepchecks_monitoring import __version__
from deepchecks_monitoring.ee.integrations.slack import SlackAlertNotification
from deepchecks_monitoring.notifications import AlertNotificator as BaseAlertNotificator
from deepchecks_monitoring.schema_models.alert_webhook import AlertWebhook
from deepchecks_monitoring.schema_models.slack import SlackInstallation

__all__ = ["AlertNotificator"]


class AlertNotificator(BaseAlertNotificator):
    """Class to send notification about alerts."""

    async def send_slack_messages(self) -> bool:
        """Send slack message."""
        org = self.organization
        alert = self.alert
        alert_rule = self.alert_rule

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

        errors: t.List[t.Tuple[SlackInstallation, str]] = []
        settings = self.resources_provider.settings

        for app in slack_apps:
            notification = SlackAlertNotification(alert, settings.deployment_url).blocks()
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
        """Execute organization webhooks."""
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
        """Send notifications."""
        await self.send_emails()
        await self.send_slack_messages()
        await self.execute_webhooks()
