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
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.pydantic_type import PydanticType
from deepchecks_monitoring.utils import DataFilterList

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
    )

    name: str
    check_id: int
    lookback: int
    dashboard_id:  Optional[int]
    description: Optional[str] = None
    data_filters: DataFilterList = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "check": relationship("Check"),
            "dashboard": relationship("Dashboard"),
        }
    }
