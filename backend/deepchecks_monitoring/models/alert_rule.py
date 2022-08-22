# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the alert rule ORM model."""
import enum
import typing as t

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, false, func, select
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import OperatorsEnum

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.monitor import Monitor  # pylint: disable=unused-import

__all__ = ["Condition", "AlertRule", "AlertSeverity"]


class Condition(BaseModel):
    """Condition to define an alert on check result, value must be numeric."""

    operator: OperatorsEnum
    value: float


class AlertSeverity(enum.Enum):
    """Enum for the alert severity."""

    LOW = "low"
    MID = "mid"
    HIGH = "high"
    CRITICAL = "critical"


class AlertRule(Base):
    """ORM model for the alert rule."""

    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True)
    name = Column(String(50))

    condition = Column(PydanticType(pydantic_model=Condition))
    repeat_every = Column(Integer, nullable=False)
    alert_severity = Column(Enum(AlertSeverity), default=AlertSeverity.MID, nullable=False)
    last_run = Column(DateTime(timezone=True), nullable=True)

    monitor_id = Column(Integer, ForeignKey("monitors.id"))
    monitor: Mapped[t.Optional["Monitor"]] = relationship("Monitor")

    alerts: Mapped[t.List["Alert"]] = relationship("Alert")

    @classmethod
    async def get_alerts_per_rule(cls, session, ids: t.List[int] = None) -> dict:
        """Return count of active alerts per alert rule id.

        Parameters
        ----------
        ids: List[int], default None
            alert rules ids to filter by the results
        """
        count_alerts = select(AlertRule.id, func.count()).join(AlertRule.alerts) \
            .where(Alert.resolved == false())
        if ids:
            count_alerts = count_alerts.where(AlertRule.id.in_(ids))
        q = count_alerts.group_by(AlertRule.id)
        results = await session.execute(q)
        total = results.all()
        return dict(total)
