# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the Segment ORM model."""
import typing as t
from dataclasses import dataclass, field

from sqlalchemy import JSON, Column, ForeignKey, Integer, String, Table

from deepchecks_monitoring.models.base import Base

__all__ = ["Segment"]


@dataclass
class Segment(Base):
    """ORM model for the segment."""

    __table__ = Table(
        "segment",
        Base.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50), nullable=False),
        Column("rule", JSON, nullable=False),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    __table_args__ = {
        "schema": "default"
    }

    id: int = field(init=False)
    name: t.Optional[str] = None
    rule: str = field(init=False)
    model_id: int = field(init=False)
