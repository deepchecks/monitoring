# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the ModelVersion ORM model."""
import typing as t
from collections import defaultdict
from datetime import datetime
from itertools import chain

import pandas as pd
import pendulum as pdl
import sqlalchemy as sa
from pydantic.main import BaseModel
from sqlalchemy import (ARRAY, BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, MetaData, String, Table,
                        UniqueConstraint, func, select, update)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.monitoring_utils import DataFilterList, MetadataMixin
from deepchecks_monitoring.schema_models.base import Base
from deepchecks_monitoring.schema_models.column_type import ColumnType, column_types_to_table_columns

if t.TYPE_CHECKING:
    from deepchecks_monitoring.schema_models import Model  # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.ingestion_errors import IngestionError  # pylint: disable=unused-import

__all__ = ["ModelVersion", "ColumnMetadata", "update_statistics_from_sample", "get_monitor_table_name"]

CATEGORICAL_STATISTICS_VALUES_LIMIT = 200


class ColumnStatistics(BaseModel):
    """A typed object represents a numeric column statistic."""

    max: t.Optional[float]
    min: t.Optional[float]
    values: t.Optional[t.List[str]]


class ColumnMetadata(BaseModel):
    """TypedDict containing relevant column metadata."""

    type: ColumnType
    stats: ColumnStatistics


class ModelVersion(Base, MetadataMixin):
    """ORM model for the model version."""

    __tablename__ = "model_versions"
    __table_args__ = (
        UniqueConstraint("model_id", "name", name="model_version_name_uniqueness"),
    )

    # TODO: modify next fields to not nullable
    # - name
    # - monitor_json_schema
    # - features_columns
    # - additional_data_columns
    # - model_columns
    # - meta_columns

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    start_time = Column(DateTime(timezone=True), default=pdl.datetime(3000, 1, 1))
    end_time = Column(DateTime(timezone=True), default=pdl.datetime(1970, 1, 1))
    monitor_json_schema = Column(JSONB)
    reference_json_schema = Column(JSONB)
    features_columns = Column(JSONB)
    additional_data_columns = Column(JSONB)
    model_columns = Column(JSONB)
    meta_columns = Column(JSONB)
    private_columns = Column(JSONB, nullable=False, default={})
    private_reference_columns = Column(JSONB, nullable=False, default={}, server_default=sa.text("'{}'::jsonb"))
    feature_importance = Column(JSONB, nullable=True)
    statistics = Column(JSONB)
    classes = Column(ARRAY(String), nullable=True)
    label_map = Column(JSONB, nullable=True)
    # Indicates the last time the data of this version was updated.
    last_update_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # Indicates the latest messages offset that was ingested
    ingestion_offset = Column(BigInteger, default=-1)
    # Indicates the total offset in the topic. The lag of messages is `topic_end_offset - ingestion_offset`
    topic_end_offset = Column(BigInteger, default=-1)
    balance_classes = Column(Boolean, nullable=False, default=False)

    model_id = Column(
        Integer,
        ForeignKey("models.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    model: Mapped["Model"] = relationship(
        "Model",
        back_populates="versions"
    )

    ingestion_errors: Mapped[t.List["IngestionError"]] = relationship(
        "IngestionError",
        back_populates="model_version",
        cascade="save-update, merge, delete",
        passive_deletes=True,
        passive_updates=True,
    )

    _optional_fields: t.List[str] = None

    @property
    def optional_fields(self) -> t.List[str]:
        """Fields of monitor schema with are optional."""
        if self._optional_fields is None:
            self._optional_fields = list(set(self.monitor_json_schema["properties"].keys()) -
                                         set(self.monitor_json_schema["required"]))
        return self._optional_fields

    def get_monitor_table_name(self) -> str:
        """Get name of monitor table."""
        return get_monitor_table_name(self.model_id, self.id)

    def get_monitor_table(self, connection) -> Table:
        """Get table object of the monitor table."""
        metadata = MetaData(bind=connection)
        columns = {**self.features_columns, **self.additional_data_columns, **self.model_columns, **self.meta_columns,
                   **self.private_columns}
        columns = {name: ColumnType(col_type) for name, col_type in columns.items()}
        columns_sqlalchemy = column_types_to_table_columns(columns)
        return Table(self.get_monitor_table_name(), metadata, *columns_sqlalchemy)

    def get_reference_table_name(self) -> str:
        """Get name of reference table."""
        return f"model_{self.model_id}_ref_data_{self.id}"

    def get_top_features(self, n_top: int = 30) -> t.Tuple[t.List[str], t.Optional[pd.Series]]:
        """Get top n features sorted by feature importance and the feature_importance."""
        if self.feature_importance:
            # Sort by descending feature importance and then by ascending feature name
            most_important_features = sorted(self.feature_importance.items(),
                                             key=lambda item: (-item[1], item[0]))[:n_top]
            return [feat[0] for feat in most_important_features], pd.Series(dict(most_important_features))
        return list(sorted(self.features_columns.keys()))[:n_top], None

    def get_reference_table(self, connection) -> Table:
        """Get table object of the reference table."""
        metadata = MetaData(bind=connection)
        columns_in_ref = {
            **self.features_columns,
            **self.additional_data_columns,
            **self.model_columns,
            **self.private_reference_columns
        }
        columns = {name: ColumnType(col_type) for name, col_type in columns_in_ref.items()}
        columns_sqlalchemy = column_types_to_table_columns(columns)
        return Table(self.get_reference_table_name(), metadata, *columns_sqlalchemy)

    async def update_timestamps(self, min_timestamp: datetime, max_timestamp: datetime, session: AsyncSession):
        """Update start and end date if needed based on given timestamps."""
        # Running an update with min/max in order to prevent race condition when running in parallel
        updates = {}
        if min_timestamp < self.start_time:
            updates[ModelVersion.start_time] = func.least(ModelVersion.start_time, min_timestamp)
        if max_timestamp > self.end_time:
            updates[ModelVersion.end_time] = func.greatest(ModelVersion.end_time, max_timestamp)
        if updates:
            await session.execute(update(ModelVersion).where(ModelVersion.id == self.id).values(updates))

    async def update_statistics(self, new_statistics: dict, session: AsyncSession):
        """Update the statistics with a lock on the row."""
        # Locking the row before updating to prevent race condition, since we are updating json column.
        # after a commit the row will be unlocked
        locked_model_version_query = await session.execute(select(ModelVersion).filter(ModelVersion.id == self.id)
                                                           .with_for_update())
        locked_model_version = locked_model_version_query.scalar()
        # Statistics might have changed by another concurrent insert, so unify the latest statistics from the db
        # with the updated statistics
        # NOTE: in order to update json column with ORM the `unify_statistics` must return a new dict instance
        locked_model_version.statistics = unify_statistics(locked_model_version.statistics, new_statistics)

    def fill_optional_fields(self, sample: dict):
        """Add to given sample all the optional fields which are missing, with value of None. Used to enable multi \
        insert on samples."""
        for field in self.optional_fields:
            if field not in sample:
                sample[field] = None

    def is_filter_fit(self, data_filter: DataFilterList):
        """Check if columns defined on filter exists on the model version."""
        if data_filter is None or len(data_filter.filters) == 0:
            return True
        filter_columns = [f.column for f in data_filter.filters]
        columns = (set(self.features_columns.keys()) | set(self.additional_data_columns.keys()) |
                   set(self.model_columns.keys()))
        return columns.issuperset(filter_columns)

    def is_in_range(self, start_date, end_date):
        """Check if given start and end dates are overlapping with the model version dates."""
        return start_date <= self.end_time and end_date >= self.start_time


def _add_col_value(stats_values, col_value):
    if (col_value not in stats_values and len(stats_values) < CATEGORICAL_STATISTICS_VALUES_LIMIT):
        stats_values.append(col_value)


def update_statistics_from_sample(statistics: dict, sample: dict):
    """Update statistics dict inplace, using the sample given."""
    for col, stats_info in statistics.items():
        if sample.get(col) is None:
            continue
        col_value = sample[col]
        if isinstance(col_value, datetime):
            col_value = col_value.timestamp()
        if "max" in stats_info:
            max_val = stats_info["max"]
            stats_info["max"] = col_value if max_val is None else max((max_val, col_value))
        if "min" in stats_info:
            min_val = stats_info["min"]
            stats_info["min"] = col_value if min_val is None else min((min_val, col_value))
        if "values" in stats_info:
            _add_col_value(stats_info["values"], col_value)


def unify_statistics(original_statistics: dict, added_statistics: dict):
    cols = set(original_statistics.keys()).union(added_statistics.keys())
    unified_dict = defaultdict(dict)
    for col in cols:
        col_stats = [original_statistics[col], added_statistics[col]]
        if any(("max" in v for v in col_stats)):
            max_values = [v["max"] for v in col_stats if v["max"] is not None]
            unified_dict[col]["max"] = max(max_values) if max_values else None
        if any(("min" in v for v in col_stats)):
            min_values = [v["min"] for v in col_stats if v["min"] is not None]
            unified_dict[col]["min"] = min(min_values) if min_values else None
        if any(("values" in v for v in col_stats)):
            if len(original_statistics[col]["values"]) < CATEGORICAL_STATISTICS_VALUES_LIMIT:
                values = list(set(chain(*(v["values"] for v in col_stats))))[:CATEGORICAL_STATISTICS_VALUES_LIMIT]
            else:
                values = original_statistics[col]["values"]
            unified_dict[col]["values"] = values
    return unified_dict


def get_monitor_table_name(model_id, model_version_id):
    return f"model_{model_id}_monitor_data_{model_version_id}"


# ~~~~~ Automatic triggers to delete the data tables when a model version is deleted ~~~~~~

# NOTE: they cause deadlocks therefore currently we do not use them

PGDataTableDropFunc = sa.DDL("""
CREATE OR REPLACE FUNCTION drop_model_version_tables()
RETURNS TRIGGER AS $$
BEGIN
    EXECUTE "DROP TABLE IF EXISTS model_" || OLD.model_id || "_monitor_data_" || OLD.id;
    EXECUTE "DROP TABLE IF EXISTS model_" || OLD.model_id || "_ref_data_" || OLD.id;
    RETURN null;
END; $$ LANGUAGE PLPGSQL
""")

PGDataTableDropTrigger = sa.DDL("""
CREATE OR REPLACE TRIGGER trigger_model_version_delete AFTER DELETE ON model_versions
FOR EACH ROW EXECUTE PROCEDURE drop_model_version_tables();
""")

# event.listen(
#     Base.metadata,
#     "after_create",
#     PGDataTableDropFunc.execute_if(dialect="postgresql")
# )

# event.listen(
#     Base.metadata,
#     "after_create",
#     PGDataTableDropTrigger.execute_if(dialect="postgresql")
# )
