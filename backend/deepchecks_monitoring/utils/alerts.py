"""Alerts utility functions."""
import enum
import typing as t

import pendulum as pdl
from furl import furl
from pydantic import BaseModel

from deepchecks_monitoring.monitoring_utils import OperatorsEnum

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Alert  # pylint: disable=unused-import

__all__ = ["prepare_alert_link", "Condition", "AlertSeverity", "Frequency"]


def prepare_alert_link(
    deepchecks_host: str,
    model_id: int | None = None,
    severity: str | None = None
) -> furl:
    """Return link to the given alert instance."""
    alert_link = (furl(deepchecks_host) / "configuration" / "alert-rules")
    params = {}
    if model_id is not None:
        params["modelId"] = model_id
    if severity is not None:
        params["severity"] = severity
    return alert_link.add(params)


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


class Frequency(str, enum.Enum):
    """Monitor execution frequency."""

    HOUR = "HOUR"
    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"

    def to_pendulum_duration_unit(self):
        return f"{self.value.lower()}s"

    def to_pendulum_duration(self):
        unit = self.to_pendulum_duration_unit()
        return pdl.duration(**{unit: 1})

    def to_postgres_interval(self):
        return f"INTERVAL '1 {self.value}'"
