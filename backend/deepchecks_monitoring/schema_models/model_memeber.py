# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the model members ORM model."""
import typing as t

from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Model  # pylint: disable=unused-import

__all__ = ["ModelMember"]


class ModelMember(Base):
    """ORM model for the model members."""

    __tablename__ = "model_members"
    __table_args__ = (UniqueConstraint("user_id", "model_id"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)

    model_id = Column(
        Integer,
        ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="members"
    )
