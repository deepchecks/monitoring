"""Alerts utility functions."""
import enum
import typing as t

from furl import furl
from pydantic import BaseModel

from deepchecks_monitoring.monitoring_utils import OperatorsEnum

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Alert  # pylint: disable=unused-import

__all__ = ["prepare_alert_link", "Condition", "AlertSeverity"]


def prepare_alert_link(alert: "Alert", deepchecks_host: str) -> furl:
    """Return link to the given alert instance."""
    alert_rule = alert.alert_rule
    monitor = alert_rule.monitor
    check = monitor.check
    model = check.model
    alert_link = (furl(deepchecks_host) / "alert-rules")
    return alert_link.add({"models": model.id, "severity": alert_rule.alert_severity.value})

class Condition(BaseModel):
    """Condition to define an alert on check result, value must be numeric."""

    operator: OperatorsEnum
    value: float

    def __str__(self, prefix: str = "Result") -> str:
        """Return condition string representation."""
        op = self.operator.stringify()
        return f"{prefix} {op} {self.value}"


class AlertSeverity(str, enum.Enum):
    """Enum for the alert severity."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def severity_index(self) -> int:
        return tuple(type(self)).index(self)

    @classmethod
    def from_index(cls, index: int) -> "AlertSeverity":
        return tuple(cls)[index]