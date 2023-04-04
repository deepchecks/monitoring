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
import typing as t
from datetime import datetime

import pendulum as pdl
import sqlalchemy as sa
from sqlalchemy import MetaData, PrimaryKeyConstraint, Table, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, Query, relationship

from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, ColumnType,
                                                             column_types_to_table_columns, get_label_column_type)
from deepchecks_monitoring.schema_models.task_type import TaskType

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models.check import Check  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.model_version import ModelVersion  # pylint: disable=unused-import


__all__ = ["Model", "ModelNote"]


class Model(Base, MetadataMixin):
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
    # Indicates the last time the data (labels) was updated.
    last_update_time = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=func.now())
    # Indicates the latest messages offset that was ingested
    ingestion_offset = sa.Column(sa.BigInteger, default=-1)
    # Indicates the total offset in the topic. The lag of messages is `topic_end_offset - ingestion_offset`
    topic_end_offset = sa.Column(sa.BigInteger, default=-1)
    timezone = sa.Column(sa.String(50), nullable=False, server_default=sa.literal("UTC"))

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

    def get_sample_labels_table_name(self):
        """Get table name of the sample labels table."""
        return f"model_{self.id}_sample_labels"

    def get_sample_labels_table(self, connection=None) -> Table:
        """Get table object of the sample labels table."""
        metadata = MetaData(bind=connection)
        columns_sqlalchemy = column_types_to_table_columns(self.get_sample_labels_columns())
        return Table(self.get_sample_labels_table_name(), metadata, *columns_sqlalchemy)

    def get_sample_labels_columns(self):
        return {
            SAMPLE_ID_COL: ColumnType.TEXT,
            SAMPLE_LABEL_COL: get_label_column_type(TaskType(self.task_type))
        }

    def get_samples_versions_map_table_name(self):
        """Get table name of the versions mapping table."""
        return f"model_{self.id}_samples_versions_map"

    def get_samples_versions_map_table(self, connection=None) -> Table:
        """Get table object of the versions mapping table."""
        metadata = MetaData(bind=connection)
        columns = (sa.Column(SAMPLE_ID_COL, sa.Text),
                   sa.Column("version_id", sa.Integer))
        pk_constraint = PrimaryKeyConstraint(SAMPLE_ID_COL, "version_id")
        return Table(self.get_samples_versions_map_table_name(), metadata, *columns, pk_constraint)

    def filter_labels_exist(self, query: Query, data_table, filter_not_null=True) -> Query:
        """Filter query to include only samples that have labels."""
        labels_table = self.get_sample_labels_table()
        if filter_not_null:
            query = query.where(labels_table.c[SAMPLE_LABEL_COL].isnot(None))
        query = query.join(labels_table, onclause=data_table.c[SAMPLE_ID_COL] == labels_table.c[SAMPLE_ID_COL])
        return query


class ModelNote(Base, MetadataMixin):
    """ORM Model to represent model notes."""

    __tablename__ = "model_notes"

    id = sa.Column(sa.Integer, primary_key=True)
    title = sa.Column(sa.String, nullable=False)
    text = sa.Column(sa.Text, nullable=True)

    model_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="notes"
    )
