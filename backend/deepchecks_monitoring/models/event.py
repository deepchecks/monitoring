# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the event ORM model."""
import typing as t
from dataclasses import dataclass, field

import pendulum as pdl
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

__all__ = ["Event"]


@dataclass
class Event(Base):
    """ORM model for the event."""

    __table__ = Table(
        "events",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("failed_values", JSONB, nullable=False),
        Column("alert_id", Integer, ForeignKey("alerts.id"), nullable=False),
        Column("created_at", DateTime(timezone=True), default=pdl.now),
        Column("start_time", DateTime(timezone=True), nullable=False),
        Column("end_time", DateTime(timezone=True), nullable=False)
    )
    __table_args__ = {
        "schema": "default"
    }

    failed_values: t.Dict[str, t.List[str]]
    alert_id: int
    start_time: pdl.DateTime
    end_time: pdl.DateTime
    created_at: pdl.DateTime = field(init=False)
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "alert": relationship("Alert"),
        }
    }
