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

import pendulum as pdl
import sqlalchemy as sa
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
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

    def __str__(self) -> str:
        """Return condition string representation."""
        if self.operator == OperatorsEnum.EQ:
            op = "=="
        elif self.operator == OperatorsEnum.NOT_EQ:
            op = "!="
        elif self.operator == OperatorsEnum.GT:
            op = ">"
        elif self.operator == OperatorsEnum.GE:
            op = ">="
        elif self.operator == OperatorsEnum.LT:
            op = "<"
        elif self.operator == OperatorsEnum.LE:
            op = "<="
        elif self.operator == OperatorsEnum.CONTAINS:
            op = "contains"
        else:
            raise TypeError(f"Unknown operator - {self.operator}")
        return f"Result {op} {self.value}"


class AlertSeverity(str, enum.Enum):
    """Enum for the alert severity."""

    LOW = "low"
    MID = "mid"
    HIGH = "high"
    CRITICAL = "critical"


class AlertRule(Base):
    """ORM model for the alert rule."""

    __tablename__ = "alert_rules"
    __table_args__ = (
        sa.UniqueConstraint("name", "monitor_id"),
        sa.CheckConstraint("repeat_every >= 0"),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50), nullable=False)
    condition = sa.Column(PydanticType(pydantic_model=Condition))
    repeat_every = sa.Column(sa.Integer, nullable=False)
    alert_severity = sa.Column(sa.Enum(AlertSeverity), default=AlertSeverity.MID, nullable=False, index=True)
    is_active = sa.Column(sa.Boolean, default=True)

    # TODO: rename to latest_schedule
    last_run = sa.Column(sa.DateTime(timezone=True), nullable=True)
    scheduling_start = sa.Column(sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now())

    monitor_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("monitors.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    monitor: Mapped["Monitor"] = relationship(
        "Monitor",
        back_populates="alert_rules"
    )
    alerts: Mapped[t.List["Alert"]] = relationship(
        "Alert",
        back_populates="alert_rule",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True
    )

    @classmethod
    async def get_alerts_per_rule(
        cls,
        session: AsyncSession,
        ids: t.Optional[t.List[int]] = None
    ) -> t.Dict[int, int]:
        """Return count of active alerts per alert rule id.

        Parameters
        ----------
        ids: List[int], default None
            alert rules ids to filter by the results
        """
        q = UnresolvedAlertsCount

        if ids is not None:
            q = q.where(Alert.alert_rule_id.in_(ids))

        results = (await session.execute(q)).all()
        return {r.alert_rule_id: r.alerts_count for r in results}

    def forward_last_run_to_closest_window(self):
        """Update last_run to the closest window before current time."""
        start = pdl.instance(self.scheduling_start)
        duration_seconds = (pdl.now() - start).in_seconds()
        seconds_to_add = duration_seconds - duration_seconds % self.repeat_every
        self.last_run = start.add(seconds=seconds_to_add)


UnresolvedAlertsCount = (
    sa.select(
        Alert.alert_rule_id.label("alert_rule_id"),
        sa.func.count(Alert.id).label("alerts_count")
    )
    .where(Alert.resolved.is_(False))
    .group_by(Alert.alert_rule_id)
)
