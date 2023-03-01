"""Interfaces for the monitoring package."""
from slack_sdk.webhook import WebhookResponse


class EmailSender:
    """Sends emails."""

    @property
    def is_email_available(self) -> bool:
        """Return whether email services are available on this instance (i.e. settings are in place)."""
        return False

    def send(self, subject, recipients, template_name, template_context) -> None:
        """Send email."""
        pass


class SlackSender:
    """Sends slack messages."""

    @property
    def is_slack_available(self) -> bool:
        """Return whether slack services are available on this instance (i.e. settings are in place)."""
        return False

    def send_alert(self, alert, app) -> WebhookResponse:
        """Send slack message."""
        pass
