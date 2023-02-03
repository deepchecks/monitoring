# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the model ORM model."""
import enum
import typing as t
from datetime import datetime

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.schema_models.base import Base

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["TaskType", "Model", "ModelNote"]


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    BINARY = "binary"
    MULTICLASS = "multiclass"


class Model(Base):
    """ORM model for the model."""

    __tablename__ = "models"
    __table_args__ = (
        sa.CheckConstraint(
            "alerts_delay_labels_ratio >= 0 AND alerts_delay_labels_ratio <= 1",
            name="labels_ratio_is_0_to_1"
        ),
        sa.CheckConstraint(
            "alerts_delay_seconds >= 0",
            name="alerts_delay_seconds_is_positive"
        ),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String(50), unique=True)
    description = sa.Column(sa.String(200))
    task_type = sa.Column(sa.Enum(TaskType))
    alerts_delay_labels_ratio = sa.Column(sa.Float, nullable=False)
    alerts_delay_seconds = sa.Column(sa.Integer, nullable=False)
    start_time = sa.Column(sa.DateTime(timezone=True), default=pdl.datetime(3000, 1, 1))
    end_time = sa.Column(sa.DateTime(timezone=True), default=pdl.datetime(1970, 1, 1))

    versions: Mapped[t.List["ModelVersion"]] = relationship(
        "ModelVersion",
        back_populates="model",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
        order_by="desc(ModelVersion.end_time)"
    )
    checks: Mapped[t.List["Check"]] = relationship(
        "Check",
        back_populates="model",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
    )
    notes: Mapped[t.List["ModelNote"]] = relationship(
        "ModelNote",
        back_populates="model",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
    )

    async def update_timestamps(self, min_timestamp: datetime, max_timestamp: datetime, session: AsyncSession):
        """Update start and end date if needed based on given timestamps."""
        # Running an update with min/max in order to prevent race condition when running in parallel
        updates = {}
        if min_timestamp < self.start_time:
            updates[Model.start_time] = func.least(Model.start_time, min_timestamp)
        if max_timestamp > self.end_time:
            updates[Model.end_time] = func.greatest(Model.end_time, max_timestamp)

        if updates:
            await session.execute(update(Model).where(Model.id == self.id).values(updates))

    def has_data(self) -> bool:
        """Check if model has data."""
        return self.start_time <= self.end_time


class ModelNote(Base):
    """ORM Model to represent model notes."""

    __tablename__ = "model_notes"

    id = sa.Column(sa.Integer, primary_key=True)
    title = sa.Column(sa.String, nullable=False)
    text = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="notes"
    )
