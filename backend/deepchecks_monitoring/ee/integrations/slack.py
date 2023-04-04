"""Represent slack utilities module."""
import abc
import logging
import typing as t

from deepchecks.core.checks import CheckConfig
from furl import furl
from pydantic import BaseModel, ValidationError, validator
from slack_sdk import WebClient as SlackClient
from slack_sdk.errors import SlackApiError
from slack_sdk.oauth import AuthorizeUrlGenerator, OAuthStateUtils
from slack_sdk.webhook import WebhookResponse

from deepchecks_monitoring.config import Settings as OpenSourceSettings
from deepchecks_monitoring.ee.config import SlackSettings
from deepchecks_monitoring.monitoring_utils import CheckParameterTypeEnum as CheckParameterKind
from deepchecks_monitoring.monitoring_utils import MonitorCheckConfSchema as MonitorConfig
from deepchecks_monitoring.schema_models import Alert, AlertRule, AlertSeverity, Check, Model, Monitor

__all__ = ["SlackInstallationSchema", "SlackInstallationError", "SlackAlertNotification", "SlackInstallationUtils",
           "SlackSender"]


class SlackTeamSchema(BaseModel):
    """Schema for Slack team."""

    id: str
    name: str


class SlackIncomingWebhookSchema(BaseModel):
    """Schema for Slack incoming webhook."""

    channel_id: str
    channel: str
    url: str
    configuration_url: str


class AuthedUserSchema(BaseModel):
    """Schema for Slack authed user."""

    id: str


# NOTE:
# current schema does not describe installation response payload completely
# it contains only what we need for now

class SlackInstallationSchema(BaseModel):
    """Schema for Slack installation."""

    ok: bool
    app_id: str
    scope: str
    token_type: str
    access_token: str
    bot_user_id: str
    authed_user: AuthedUserSchema
    team: SlackTeamSchema
    incoming_webhook: SlackIncomingWebhookSchema

    @validator("token_type")
    def validate_token_type(cls, value: str):  # pylint: disable=no-self-argument
        """Validate token type."""
        assert value == "bot", "Expected to receive bot token type"
        return value


class SlackInstallationError(Exception):
    """Exception for Slack installation."""

    pass


class SlackInstallationUtils:
    """Represent Slack installation utilities."""

    def __init__(
        self,
        settings: SlackSettings,
        logger: t.Optional[logging.Logger] = None
    ):
        self.settings = settings
        self.client = SlackClient()
        self.logger = logger or logging.getLogger("slack.installation")
        self.state_utils = OAuthStateUtils()

    def generate_authorization_url(self, state, redirect_path) -> str:
        """Generate the authorization URL."""
        return AuthorizeUrlGenerator(
            client_id=self.settings.slack_client_id,
            scopes=self.settings.slack_scopes.split(","),  # TODO: error prone, consider changing it
            redirect_uri=redirect_path
        ).generate(state=state)

    def finish_installation(self, code: str) -> SlackInstallationSchema:
        """Finish the slack installation."""
        try:
            response = self.client.oauth_v2_access(
                code=code,
                client_id=self.settings.slack_client_id,
                client_secret=self.settings.slack_client_secret.get_secret_value(),
            ).validate()
        except SlackApiError as e:
            msg = "Failed to obtaine access token."
            self.logger.error(f"{msg}\nError: {e}")
            raise SlackInstallationError(msg) from e

        try:
            installation = SlackInstallationSchema(**t.cast(dict, response.data))
        except ValidationError as e:
            msg = "Received response of unsupported structure from 'oauth.v2.access' endpoint."
            self.logger.error("%s\nError: %s", msg, e)
            raise SlackInstallationError(msg) from e

        try:
            self.client.auth_test(token=installation.access_token).validate()
        except SlackApiError as e:
            msg = "Access token validation failed."
            self.logger.error("%s\nError: %s", msg, e)
            raise SlackInstallationError(msg) from e

        return installation

    def generate_state_cookies(self, state) -> str:
        """Generate the state cookies."""
        return self.state_utils.build_set_cookie_for_new_state(state)

    def generate_state_cookies_removal(self) -> str:
        """Remove the state cookies."""
        return self.state_utils.build_set_cookie_for_deletion()

    def is_valid_state_cookies(self, state, headers) -> bool:
        """Check if the state cookies are valid."""
        return self.state_utils.is_valid_browser(state=state, request_headers=headers)


class BaseSlackNotification(abc.ABC):
    """Represent the abstract class for the slack notification."""

    @abc.abstractmethod
    def blocks(self, *args, **kwargs) -> t.Dict[str, t.Any]:
        """Return the slack blocks."""
        raise NotImplementedError()


class SlackAlertNotification(BaseSlackNotification):
    """Represent the slack alert notification."""

    def __init__(self, alert: Alert, deepchecks_host: str):
        super().__init__()
        self.alert = alert
        self.rule = t.cast(AlertRule, self.alert.alert_rule)
        self.monitor = t.cast(Monitor, self.rule.monitor)
        self.check = t.cast(Check, self.monitor.check)
        self.check_config = t.cast(CheckConfig, self.check.config)
        self.model = t.cast(Model, self.check.model)

        self.alert_link = (furl(deepchecks_host) / "alert-rules").add({
            "models": self.model.id,
            "severity": self.rule.alert_severity.value
        })
        self.monitor_config = t.cast(
            t.Optional[MonitorConfig],
            self.monitor.additional_kwargs
        )
        self.features = (
            t.cast(t.List[str], self.monitor_config.check_conf.get(CheckParameterKind.FEATURE, []))
            if self.monitor_config is not None
            else []
        )

    def prepare_header(self) -> t.Dict[str, t.Any]:
        """Prepare the header for the notification."""
        # TODO:
        return {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": self.monitor.name,
                "emoji": True
            }
        }

    def prepare_alert_status_section(self) -> t.Dict[str, t.Any]:
        """Prepare the alert status section in the notification."""
        rule = t.cast(AlertRule, self.alert.alert_rule)
        icons = {
            # TODO:
            # ask for a list of icons
            AlertSeverity.CRITICAL: "🔥",
            AlertSeverity.HIGH: "🚨",
            AlertSeverity.MEDIUM: "⚠",
            AlertSeverity.LOW: "😟",
        }
        return {
            "type": "context",
            "elements": [
                # {
                #     "type": "image",
                #     "image_url": icons[rule.alert_severity],
                #     "alt_text": "alert icon"
                # },
                {
                    "type": "mrkdwn",
                    "text": icons[rule.alert_severity]  # type: ignore
                },
                {
                    "type": "mrkdwn",
                    "text": f"Severity: {rule.alert_severity.value.capitalize()}"
                }
            ]
        }

    def prepare_check_result_status_section(self) -> t.Dict[str, t.Any]:
        """Prepare the check result section."""
        return {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"{self.check.name}={{Value}}"  # TODO:
            },
            "accessory": {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View On Deepchecks",
                    "emoji": True
                },
                "url": str(self.alert_link),
                "value": "click_me_123",
                "action_id": "button-action"
            }
        }

    def prepare_metadata_section(self) -> t.List[t.Dict[str, t.Any]]:
        """Prepare the metadata section."""
        features = ", ".join(self.features)
        return [
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": f"Model: {self.model.name}",
                        "emoji": True
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": f"Check: {self.check_config['class_name']}",
                        "emoji": True
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": f"Feature: {features}",
                        "emoji": True
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": f"Alert Condition: {str(self.rule.condition)}",
                        "emoji": True
                    }
                ]
            }
        ]

    def blocks(self) -> t.List[t.Any]:
        """Contain the notification message blocks."""
        return [
            self.prepare_header(),
            self.prepare_alert_status_section(),
            self.prepare_check_result_status_section(),
            {"type": "divider"},
            *self.prepare_metadata_section()
        ]


class SlackSenderSettings(OpenSourceSettings, SlackSettings):
    pass


class SlackSender:
    """Sends slack messages."""

    settings: SlackSenderSettings

    def __init__(self, settings: SlackSenderSettings):
        self.settings = settings

    @property
    def is_slack_available(self) -> bool:
        """Return whether slack services are available on this instance (i.e. settings are in place)."""
        # TODO: improve this
        return self.settings.slack_client_id is not None

    def send_alert(self, alert, app) -> WebhookResponse:
        """Send slack message."""
        notification = SlackAlertNotification(alert, self.settings.deployment_url).blocks()
        return app.webhook_client().send(blocks=notification)
