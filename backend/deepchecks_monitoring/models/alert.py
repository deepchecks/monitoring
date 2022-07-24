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
from dataclasses import dataclass
from typing import Any, Optional

from pydantic import BaseModel
from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType

__all__ = ["DataFilter", "Alert", "Operators", "AlertRule"]


class Operators(enum.Enum):
    """Operators for numeric and categorical filters."""

    GTE = "greater_than_equals"
    GT = "greater_than"
    LTE = "lower_than_equals"
    LT = "lower_than"
    IN = "in"
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"


class DataFilter(BaseModel):
    """Filter to be used on data, column can be feature/non-feature and value can be numeric/string."""

    column: str
    operator: Operators
    value: Any


class AlertRule(BaseModel):
    """Rule to define an alert on check result, value must be numeric."""

    feature: Optional[str]
    operator: Operators
    value: float


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
        Column("data_filter", PydanticType(DataFilter), nullable=True),
        Column("alert_rule", PydanticType(AlertRule)),
        Column("lookback", String(20)),
    )

    name: str
    check_id: int
    lookback: str
    alert_rule: AlertRule
    description: Optional[str] = None
    data_filter: DataFilter = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
        }
    }
