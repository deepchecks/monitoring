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
from dataclasses import dataclass, field

import pendulum as pdl
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Table, false, func, select
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilterList, OperatorsEnum

__all__ = ["Condition", "AlertRule", "AlertSeverity"]


class Condition(BaseModel):
    """Condition to define an alert on check result, value must be numeric."""

    feature: t.Optional[str]
    operator: OperatorsEnum
    value: float


class AlertSeverity(enum.Enum):
    """Enum for the alert severity."""

    LOW = "low"
    MID = "mid"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AlertRule(Base):
    """ORM model for the alert rule."""

    __table__ = Table(
        "alert_rules",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("description", String(200), default=""),
        Column("check_id", Integer, ForeignKey("checks.id")),
        Column("data_filters", PydanticType(pydantic_model=DataFilterList), nullable=True),
        Column("condition", PydanticType(pydantic_model=Condition)),
        Column("lookback", Integer),
        Column("repeat_every", Integer, nullable=False),
        Column("alert_severity", Enum(AlertSeverity), default=AlertSeverity.MID, nullable=False),
        Column("last_run", DateTime(timezone=True), nullable=True),
    )

    __table_args__ = {
        "schema": "default"
    }

    name: str
    check_id: int
    lookback: int
    repeat_every: int
    condition: Condition
    alert_severity: AlertSeverity
    alerts: t.List["Alert"] = field(default_factory=list)
    description: t.Optional[str] = None
    data_filters: DataFilterList = None
    last_run: pdl.DateTime = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
            "alerts": relationship("Alert"),
        }
    }

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
