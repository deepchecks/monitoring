# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the monitor ORM model."""
import typing as t
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilterList

if TYPE_CHECKING:
    from deepchecks_monitoring.models.alert_rule import AlertRule

__all__ = ["Monitor"]


@dataclass
class Monitor(Base):
    """ORM model for the monitor."""

    __table__ = Table(
        "monitors",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("description", String(200), default=""),
        Column("check_id", Integer, ForeignKey("checks.id"), nullable=False),
        Column("dashboard_id", Integer, ForeignKey("dashboards.id", ondelete="SET NULL"), nullable=True),
        Column("data_filters", PydanticType(pydantic_model=DataFilterList), nullable=True),
        Column("lookback", Integer),
        Column("filter_key", String(50), default=None, nullable=True),
    )

    name: str
    check_id: int
    lookback: int
    dashboard_id:  t.Optional[int]
    description: t.Optional[str] = None
    alert_rules: t.List["AlertRule"] = field(default_factory=list)
    data_filters: DataFilterList = None
    filter_key: str = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
            "dashboard": relationship("Dashboard"),
            "alert_rules": relationship("AlertRule")
        }
    }
