# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the alert ORM model."""
import enum
import typing as t
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import pendulum as pdl
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilter, OperatorsEnum

if TYPE_CHECKING:
    from deepchecks_monitoring.models.event import Event

__all__ = ["AlertRule", "Alert", "AlertSeverity"]


class AlertRule(BaseModel):
    """Rule to define an alert on check result, value must be numeric."""

    feature: t.Optional[str]
    operator: OperatorsEnum
    value: float


class AlertSeverity(enum.Enum):
    """Enum for the alert severity."""

    LOW = "low"
    MID = "mid"
    HIGH = "high"
    CRITICAL = "Critical"


@dataclass
class Alert(Base):
    """ORM model for the alert."""

    __table__ = Table(
        "alerts",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("description", String(200), default=""),
        Column("check_id", Integer, ForeignKey("checks.id")),
        Column("data_filter", PydanticType(pydantic_model=DataFilter), nullable=True),
        Column("alert_rule", PydanticType(pydantic_model=AlertRule)),
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
    alert_rule: AlertRule
    alert_severity: AlertSeverity
    events: t.List["Event"] = field(default_factory=list)
    description: t.Optional[str] = None
    data_filter: DataFilter = None
    last_run: pdl.DateTime = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
            "events": relationship("Event"),
        }
    }
