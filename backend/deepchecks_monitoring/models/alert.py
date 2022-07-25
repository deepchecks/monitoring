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
import typing as t
from dataclasses import dataclass

from pydantic import BaseModel
from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilter, OperatorsEnum

__all__ = ["AlertRule", "Alert"]


class AlertRule(BaseModel):
    """Rule to define an alert on check result, value must be numeric."""

    feature: t.Optional[str]
    operator: OperatorsEnum
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
        Column("data_filter", PydanticType(pydantic_model=DataFilter), nullable=True),
        Column("alert_rule", PydanticType(pydantic_model=AlertRule)),
        Column("lookback", Integer),
    )

    __table_args__ = {
        "schema": "default"
    }

    name: str
    check_id: int
    lookback: int
    alert_rule: AlertRule
    description: t.Optional[str] = None
    data_filter: DataFilter = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
        }
    }
