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

import sqlalchemy as sa
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, column_property, relationship

from deepchecks_monitoring.monitoring_utils import MetadataMixin, OperatorsEnum
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.pydantic_type import PydanticType

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.monitor import Monitor  # pylint: disable=unused-import

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
        else:
            raise TypeError(f"Unknown operator - {self.operator}")
        return f"Result {op} {self.value}"


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


class AlertRule(Base, MetadataMixin):
    """ORM model for the alert rule."""

    __tablename__ = "alert_rules"

    id = sa.Column(sa.Integer, primary_key=True)
    condition = sa.Column(PydanticType(pydantic_model=Condition))
    alert_severity = sa.Column(sa.Enum(AlertSeverity), default=AlertSeverity.MEDIUM, nullable=False, index=True)
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    start_time = sa.Column(sa.DateTime(timezone=True), nullable=True)

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


AlertRule.alert_severity_index = column_property(sa.case(
    *(
        (AlertRule.alert_severity == it.value, it.severity_index)
        for it in AlertSeverity
    ),
    else_=-1
))


UnresolvedAlertsCount = (
    sa.select(
        Alert.alert_rule_id.label("alert_rule_id"),
        sa.func.count(Alert.id).label("alerts_count")
    )
    .where(Alert.resolved.is_(False))
    .group_by(Alert.alert_rule_id)
)
