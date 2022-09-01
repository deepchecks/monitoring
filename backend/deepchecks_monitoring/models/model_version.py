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
from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table, func, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, relationship
from typing_extensions import TypedDict

from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.models.column_type import ColumnType, column_types_to_table_columns

if t.TYPE_CHECKING:
    from deepchecks_monitoring.models import Model  # pylint: disable=unused-import
    from deepchecks_monitoring.models.ingestion_errors import IngestionError  # pylint: disable=unused-import

__all__ = ["ModelVersion", "ColumnMetadata", "update_statistics_from_sample"]

CATEGORICAL_STATISTICS_VALUES_LIMIT = 50


class ColumnMetadata(TypedDict):
    """TypedDict containing relavant column metadata."""

    type: ColumnType
    stats: dict


class ModelVersion(Base):
    """ORM model for the model version."""

    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    start_time = Column(DateTime(timezone=True), default=pdl.datetime(3000, 1, 1))
    end_time = Column(DateTime(timezone=True), default=pdl.datetime(1970, 1, 1))
    monitor_json_schema = Column(JSONB)
    reference_json_schema = Column(JSONB)
    features_columns = Column(JSONB)
    non_features_columns = Column(JSONB)
    model_columns = Column(JSONB)
    meta_columns = Column(JSONB)
    feature_importance = Column(JSONB, nullable=True)
    statistics = Column(JSONB)

    model_id = Column(Integer, ForeignKey("models.id"))
    model: Mapped[t.Optional["Model"]] = relationship("Model", back_populates="versions")

    ingestion_errors: Mapped[t.List["IngestionError"]] = relationship("IngestionError", back_populates="model_version")

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
        return f"model_{self.model_id}_monitor_data_{self.id}"

    def get_monitor_table(self, connection) -> Table:
        """Get table object of the monitor table."""
        metadata = MetaData(bind=connection)
        columns = {**self.features_columns, **self.non_features_columns, **self.model_columns, **self.meta_columns}
        columns = {name: ColumnType(col_type) for name, col_type in columns.items()}
        columns_sqlalchemy = column_types_to_table_columns(columns)
        return Table(self.get_monitor_table_name(), metadata, *columns_sqlalchemy)

    def get_reference_table_name(self) -> str:
        """Get name of reference table."""
        return f"model_{self.model_id}_ref_data_{self.id}"

    def get_top_features(self, n_top: int = 30) -> t.Tuple[t.List[str], t.Dict[str, float]]:
        """Get top n features sorted by feature importence and the feature_importance."""
        if self.feature_importance:
            feat_dict = dict(sorted(self.feature_importance.items(), key=lambda item: item[1])[:n_top])
            feat = list(feat_dict.keys())
            return feat, pd.Series(feat_dict)
        return list(self.features_columns.keys())[:n_top], None

    def get_reference_table(self, connection) -> Table:
        """Get table object of the reference table."""
        metadata = MetaData(bind=connection)
        columns_in_ref = {**self.features_columns, **self.non_features_columns, **self.model_columns}
        columns = {name: ColumnType(col_type) for name, col_type in columns_in_ref.items()}
        columns_sqlalchemy = column_types_to_table_columns(columns)
        return Table(self.get_reference_table_name(), metadata, *columns_sqlalchemy)

    async def update_timestamps(self, min_timestamp: datetime, max_timestamp: datetime, session: AsyncSession):
        """Update start and end date if needed based on given timestamp.

        Parameters
        ----------
        timestamp
            Timestamp to update
        session: AsyncSession
            DB session to use
        """
        # Running an update with min/max in order to prevent race condition when running in parallel
        ts_updates = {}
        if self.start_time > min_timestamp:
            ts_updates[ModelVersion.start_time] = func.least(ModelVersion.start_time, min_timestamp)
        if self.end_time < max_timestamp:
            ts_updates[ModelVersion.end_time] = func.greatest(ModelVersion.end_time, max_timestamp)

        if ts_updates:
            await ModelVersion.update(session, self.id, ts_updates)

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


def update_statistics_from_sample(statistics: dict, sample: dict):
    """Update statistics dict inplace, using the sample given."""
    for col in statistics.keys():
        if sample.get(col) is None:
            continue
        col_value = sample[col]
        stats_info = statistics[col]
        if "max" in stats_info:
            stats_info["max"] = col_value if stats_info["max"] is None else max((stats_info["max"], col_value))
        if "min" in stats_info:
            stats_info["min"] = col_value if stats_info["min"] is None else min((stats_info["min"], col_value))
        if ("values" in stats_info and col_value not in stats_info["values"] and
                len(stats_info["values"]) < CATEGORICAL_STATISTICS_VALUES_LIMIT):
            stats_info["values"].append(col_value)


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
