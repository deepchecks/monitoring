# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the Dashboard ORM model."""
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

if TYPE_CHECKING:
    from deepchecks_monitoring.models.monitor import Monitor


__all__ = ["Dashboard"]


@dataclass
class Dashboard(Base):
    """ORM model for the dashboard."""

    __table__ = Table(
        "dashboards",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
    )
    __table_args__ = {
        "schema": "default"
    }

    id: int = None
    name: Optional[str] = None
    monitors: List["Monitor"] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "monitors": relationship("Monitor"),
        }
    }
