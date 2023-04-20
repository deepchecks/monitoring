"""Alert webhook ORM model."""
import enum
import logging
import re
import typing as t
from datetime import datetime, timezone

import httpx
import pendulum as pdl
import sqlalchemy as sa
from pydantic import AnyUrl, BaseModel, validator
from sqlalchemy.dialects.postgresql import JSONB

from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models import AlertSeverity, Base

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from deepchecks_monitoring.config import Settings
    from deepchecks_monitoring.schema_models import Alert, AlertRule, Check, Model, Monitor

__all__ = ["AlertWebhook", "WebhookHttpMethod"]


class WebhookHttpMethod(str, enum.Enum):
    """HTTP method used by webhook."""

    GET = "GET"
    POST = "POST"


class WebhookKind(str, enum.Enum):
    """Kind of request payload that webhook will form."""

    STANDART = "STANDART"
    PAGER_DUTY = "PAGER_DUTY"  # https://www.pagerduty.com


# TODO:
# should not we attach a webhook to a particular alert-rule/monitor?


class AlertWebhook(Base, MetadataMixin):
    """ORM model representing alert webhooks."""

    __tablename__ = "alert_webhooks"

    __table_args__ = (
        sa.CheckConstraint(
            "JSONB_TYPEOF(http_headers) = 'object'",
            name="headers_value_correctness"
        ),
        sa.CheckConstraint(
            """
            JSONB_TYPEOF(latest_execution_status) = 'object'
            AND latest_execution_status ? 'status'
            AND latest_execution_status ? 'reason'
            AND latest_execution_status ? 'message'
            AND JSONB_TYPEOF(latest_execution_status -> 'status') = ANY(ARRAY['string', 'number'])
            AND JSONB_TYPEOF(latest_execution_status -> 'reason') = 'string'
            AND JSONB_TYPEOF(latest_execution_status -> 'message') = 'string'
            """,
            name="execution_status_value_correctness"
        ),
        sa.CheckConstraint(
            """
            JSONB_TYPEOF(additional_arguments) = 'object'
            AND CASE
                WHEN kind = 'STANDART' THEN
                    TRUE
                WHEN kind = 'PAGER_DUTY' THEN
                    additional_arguments ? 'routing_key'
                    AND JSONB_TYPEOF(additional_arguments -> 'routing_key') = 'string'
                    AND additional_arguments ? 'group'
                    AND JSONB_TYPEOF(additional_arguments -> 'group') = 'string'
                    AND additional_arguments ? 'class'
                    AND JSONB_TYPEOF(additional_arguments -> 'class') = 'string'
                ELSE
                    FALSE
            END
            """,
            name="additional_arguments_value_correctness"
        ),
    )

    id = sa.Column(sa.Integer, primary_key=True)

    name = sa.Column(sa.String, nullable=False)
    description = sa.Column(sa.Text, nullable=False, default="")
    kind = sa.Column(sa.Enum(WebhookKind), nullable=False)
    http_url = sa.Column(sa.String, nullable=False)
    http_method = sa.Column(sa.Enum(WebhookHttpMethod), nullable=False)
    http_headers = sa.Column(JSONB, nullable=False, default={})
    latest_execution_date = sa.Column(sa.DateTime(timezone=True), nullable=True)
    latest_execution_status = sa.Column(JSONB, nullable=True)

    # Webhook kind dependent parameters are stored in this field
    additional_arguments = sa.Column(JSONB, nullable=False, default={})

    # Set of alert severities for which to execute the current webhook instance
    notification_levels = sa.Column(
        sa.ARRAY(sa.Enum(AlertSeverity)),
        default=[AlertSeverity.CRITICAL, AlertSeverity.HIGH, AlertSeverity.MEDIUM],
        nullable=False
    )

    # =========

    @classmethod
    def pagerduty(
        cls,
        props: "PagerDutyWebhookProperties",
    ):
        """Create a webhook instance to push notifications to PagerDUty service.

        PagerDuty: https://www.pagerduty.com

        Parameters
        ==========
        props : PagerDutyWebhookProperties
            webhook properties

        Returns
        =======
        AlertWebhook
        """
        return cls(**props.as_values())

    async def execute(
        self,
        *,
        alert: "Alert",
        client: httpx.AsyncClient,
        settings: "Settings",
        request_timeout: int = 60,
        logger: t.Optional[logging.Logger] = None
    ) -> bool:
        """Execute alert webhook instance.

        Parameters
        ==========
        alert : Alert
            alert instance that triggered webhooks execution
        client : httpx.AsyncCLient
            http client which will be used to send request
        settings : Settings
            application settings instance
        request_timeout : int , default 60
            request timeout in seconds
        logger : Optional[logging.Logger] , default None
            logger instance

        Returns
        =======
        bool:
            True - if webhook executes succesfully
            False - if webhook execution fails or request returns not successful response status
        """
        logger = logger or logging.getLogger(f"webhook-{self.name}")

        if alert.alert_rule.alert_severity not in self.notification_levels:
            logger.info(
                f"Webhook(id:{self.id}) is not configured to run "
                f"for alers with severity '{alert.alert_rule.alert_severity}'"
            )
            return False

        try:
            response = await client.request(
                timeout=request_timeout,
                follow_redirects=False,
                **self.prepare_request_parameters(alert=alert, settings=settings)
            )
        except Exception:
            logger.exception("Execution of Webhook(id:%s) failed with an exception", self.id)
            self.latest_execution_date = datetime.now(timezone.utc)
            self.latest_execution_status = {
                "status": "EXCEPTION",
                "reason": "Webhook execution failure",
                "message": "Execution of webhook failed with an exception, contact support team for more info."
            }
            raise
        else:
            if 200 <= response.status_code <= 299:
                self.latest_execution_date = datetime.now(timezone.utc)
                self.latest_execution_status = {
                    "status": response.status_code,
                    "reason": response.reason_phrase,
                    "message": "",
                }
                return True
            elif 300 <= response.status_code <= 399:
                self.latest_execution_date = datetime.now(timezone.utc)
                self.latest_execution_status = {
                    "status": response.status_code,
                    "reason": response.reason_phrase,
                    "message": "Deepchecks does not follow redirects"
                }
                return True
            else:
                self.latest_execution_date = datetime.now(timezone.utc)
                self.latest_execution_status = {
                    "status": response.status_code,
                    "reason": response.reason_phrase,
                    "message": "Webhook returned unsuccessful response status"
                }
                logger.warning(
                    "Webhook returned unsuccessful response status:\n"
                    "- Status: %s;\n"
                    "- Reason: %s;\n",
                    response.status_code,
                    response.reason_phrase
                )
                return False

    def prepare_request_parameters(self, alert: "Alert", settings: "Settings") -> t.Dict[str, t.Any]:
        """Prepare request parameters.

        Webhook kind will be taken into account and a corresponding payload will be prepared.

        Parameters
        ==========
        alert : Alert
            alert instance that triggered webhooks execution
        settings : Settings
            application settings instance

        Returns
        =======
        Dict[str, Any] :
            set of arguments that can be passed to http client to make a request
        """
        if self.kind == WebhookKind.STANDART:
            return {
                "url": self.http_url,
                "method": self.http_method,
                "headers": self.http_headers,
                "json": {
                    "alert_id": alert.id,
                    # TODO:
                }
            }

        if self.kind == WebhookKind.PAGER_DUTY:
            from deepchecks_monitoring.utils.alerts import prepare_alert_link  # pylint: disable=import-outside-toplevel

            alert_rule = t.cast("AlertRule", alert.alert_rule)
            monitor = t.cast("Monitor", alert_rule.monitor)
            check = t.cast("Check", monitor.check)
            model = t.cast("Model", check.model)
            additional_arguments = t.cast(t.Dict[str, t.Any], self.additional_arguments)

            if alert_rule.alert_severity == AlertSeverity.CRITICAL:
                severity = "critical"
            elif alert_rule.alert_severity in {AlertSeverity.HIGH, AlertSeverity.MEDIUM}:
                severity = "error"
            elif alert_rule.alert_severity == AlertSeverity.LOW:
                severity = "warning"
            else:
                raise ValueError(f"Unknown alert severity value - {alert_rule.alert_severity}")

            return {
                "url": self.http_url,
                "method": self.http_method,
                "headers": self.http_headers,
                "json": {
                    "payload": {
                        "summary": f"New {alert_rule.alert_severity.value} alert: {monitor.name}",
                        "timestamp": pdl.instance(t.cast(datetime, alert.created_at)).to_iso8601_string(),
                        "source": f"models/{model.name}/monitors/{monitor.name}",
                        "severity": severity,
                        "component": "deepchecks",
                        "group": additional_arguments.get("group") or "deepchecks",
                        "class": additional_arguments.get("class"),
                        "custom_details": {
                            "deepchecks_alert_id": alert.id,
                            "deepchecks_alert_start_time": str(alert.start_time),
                            "deepchecks_alert_end_time": str(alert.end_time),
                            "deepchecks_alert_failed_values": alert.failed_values,
                        }
                    },
                    "routing_key": additional_arguments["routing_key"],
                    "links": [{
                        "href": str(prepare_alert_link(alert=alert, deepchecks_host=settings.deployment_url)),
                        "text": "Deepchecks Alert"
                    }],
                    "event_action": "trigger",
                    "client": "Deepchecks",
                    "client_url": settings.deployment_url
                }
            }

        raise NotImplementedError()


# TODO: move to utils or create separate module for it
class HttpsUrl(AnyUrl):
    allowed_schemes = {"https"}
    __slots__ = ()


class PagerDutyWebhookProperties(BaseModel):
    """PagerDuty service webhook initialization properties."""

    kind: t.Literal[WebhookKind.PAGER_DUTY] = WebhookKind.PAGER_DUTY
    http_url: HttpsUrl = "https://events.pagerduty.com/v2/enqueue"
    name: str
    description: str
    notification_levels: t.Optional[t.List[AlertSeverity]] = None
    api_access_key: t.Optional[str] = None
    event_routing_key: str
    event_group: str = "deepchecks"
    event_class: str = ""

    URL_REGEXP: t.ClassVar[t.Pattern] = re.compile(
        r"https:\/\/events\.([a-zA-z0-9]+\.)?pagerduty\.com\/v2\/enqueue"
    )

    @validator("http_url")
    @classmethod
    def validate_url(cls, value: str):
        """Validate PagerDuty url."""
        if not cls.URL_REGEXP.match(value):
            raise ValueError("Incorrect PagerDuty alert event creation url")
        return value

    @property
    def access_token(self) -> str:
        """Return PagerDuty 'Authorization' header value."""
        return f"Token token={self.api_access_key}" if self.api_access_key else ""

    def as_webhook(self) -> "AlertWebhook":
        """Create a webhook instance from properties.

        Returns
        =======
        AlertWebhook
        """
        return AlertWebhook.pagerduty(props=self)

    def as_values(self) -> t.Dict[str, t.Any]:
        """Return a set of webhook arguments in form of a dictionary instance.

        Returns
        =======
        Dict[str, Any]
        """
        return {
            "name": self.name,
            "description": self.description,
            "kind": self.kind,
            "http_url": self.http_url,
            "http_method": WebhookHttpMethod.POST,
            "http_headers": {"Authorization": self.access_token} if self.api_access_key else {},
            "notification_levels": list(set(self.notification_levels)) if self.notification_levels else [],
            "additional_arguments": {
                "routing_key": self.event_routing_key,
                "group": self.event_group,
                "class": self.event_class,
            },
        }


class StandartWebhookProperties(BaseModel):
    """Standart webhook initialization properties."""

    kind: t.Literal[WebhookKind.STANDART] = WebhookKind.STANDART
    name: str
    description: str = ""
    http_url: HttpsUrl
    http_method: WebhookHttpMethod
    http_headers: t.Optional[t.Dict[str, str]] = None
    notification_levels: t.Optional[t.List[AlertSeverity]] = None

    def as_webhook(self) -> "AlertWebhook":
        """Create a webhook instance from properties.

        Returns
        =======
        AlertWebhook
        """
        return AlertWebhook(self.as_values())

    def as_values(self) -> t.Dict[str, t.Any]:
        """Return a set of webhook arguments in form of a dictionary instance.

        Returns
        =======
        Dict[str, Any]
        """
        output = self.dict(exclude_none=True)

        if "notification_levels" in output:
            output["notification_levels"] = list(set(output["notification_levels"]))

        return self.dict(exclude_none=True)
