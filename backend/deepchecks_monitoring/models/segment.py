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

from sqlalchemy import JSON, Column, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models.model import Model  # pylint: disable=unused-import

__all__ = ["Segment"]


class Segment(Base):
    """ORM model for the segment."""

    __tablename__ = "segment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    rule = Column(JSON, nullable=False)

    model_id = Column(Integer, ForeignKey("model.id"))
    model: Mapped[t.Optional["Model"]] = relationship("Model")
