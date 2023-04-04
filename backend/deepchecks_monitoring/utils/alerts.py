"""Alerts utility functions."""
import typing as t

from furl import furl

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Alert  # pylint: disable=unused-import

__all__ = ["prepare_alert_link"]


def prepare_alert_link(alert: "Alert", deepchecks_host: str) -> furl:
    """Return link to the given alert instance."""
    alert_rule = alert.alert_rule
    monitor = alert_rule.monitor
    check = monitor.check
    model = check.model
    alert_link = (furl(deepchecks_host) / "alert-rules")
    return alert_link.add({"models": model.id, "severity": alert_rule.alert_severity.value})
