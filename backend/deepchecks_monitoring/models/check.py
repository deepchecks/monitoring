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
import typing as t

from deepchecks import BaseCheck, SingleDatasetBaseCheck, TrainTestBaseCheck
from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models import Model, Monitor  # pylint: disable=unused-import

__all__ = ["Check"]


class Check(Base):
    """ORM model for the check."""

    __tablename__ = "checks"
    __table_args__ = (UniqueConstraint("name", "model_id"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    config = Column(JSONB)

    model_id = Column(
        Integer,
        ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped[t.Optional["Model"]] = relationship(
        "Model",
        back_populates="checks"
    )

    monitors: Mapped[t.List["Monitor"]] = relationship(
        "Monitor",
        back_populates="check",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True
    )

    def initialize_check(self):
        """Initialize an instance of Deepchecks' check.

        Returns
        -------
        Deepchecks' check.
        """
        dp_check = BaseCheck.from_config(self.config)
        if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
            raise ValueError("incompatible check type")
        return dp_check
