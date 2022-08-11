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
from dataclasses import dataclass, field

import pendulum as pdl
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

__all__ = ["Alert"]


@dataclass
class Alert(Base):
    """ORM model for the alert."""

    __table__ = Table(
        "alerts",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("failed_values", JSONB, nullable=False),
        Column("alert_rule_id", Integer, ForeignKey("alert_rules.id"), nullable=False),
        Column("created_at", DateTime(timezone=True), default=pdl.now),
        Column("start_time", DateTime(timezone=True), nullable=False),
        Column("end_time", DateTime(timezone=True), nullable=False),
        Column("resolved", Boolean, nullable=False, default=False)
    )
    __table_args__ = {
        "schema": "default"
    }

    failed_values: t.Dict[str, t.List[str]]
    alert_rule_id: int
    start_time: pdl.DateTime
    end_time: pdl.DateTime
    resolved: bool = None
    created_at: pdl.DateTime = field(init=False)
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "alert_rule": relationship("AlertRule"),
        }
    }
