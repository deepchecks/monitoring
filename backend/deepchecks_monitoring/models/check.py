# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the check ORM model."""
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

if TYPE_CHECKING:
    from deepchecks_monitoring.models.alert import Alert


__all__ = ["Check"]


@dataclass
class Check(Base):
    """ORM model for the check."""

    __table__ = Table(
        "checks",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("config", JSONB),
        Column("model_id", Integer, ForeignKey("models.id"))
    )
    config: JSONB
    model_id: int
    id: int = None
    name: Optional[str] = None
    alerts: List["Alert"] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "alerts": relationship("Alert"),
        }
    }
