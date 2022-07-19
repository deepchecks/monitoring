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
import enum
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import pendulum as pdl
from sqlalchemy import ARRAY, Boolean, Column, DateTime, Float, ForeignKey, Integer, MetaData, String, Table, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import relationship
from sqlalchemy.sql.type_api import TypeEngine

from deepchecks_monitoring.models.base import Base

__all__ = ["ColumnType", "ModelVersion"]


class ColumnType(enum.Enum):
    """Enum containing possible types of data."""

    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    TEXT = "text"

    def to_sqlalchemy_type(self):
        """Return the SQLAlchemy type of the data type."""
        types_map = {
            ColumnType.NUMERIC: Float,
            ColumnType.CATEGORICAL: Text,
            ColumnType.BOOLEAN: Boolean,
            ColumnType.TEXT: Text,
        }
        return types_map[self]

    def to_json_schema_type(self):
        """Return the json type of the column type."""
        types_map = {
            ColumnType.NUMERIC: "number",
            ColumnType.CATEGORICAL: "string",
            ColumnType.BOOLEAN: "boolean",
            ColumnType.TEXT: "string",
        }
        return types_map[self]


@dataclass
class ModelVersion(Base):
    """ORM model for the model version."""

    __table__ = Table(
        "model_versions",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(100)),
        Column("start_time", DateTime(timezone=True), default=pdl.datetime(3000, 1, 1)),
        Column("end_time", DateTime(timezone=True), default=pdl.datetime(1970, 1, 1)),
        Column("monitor_json_schema", JSONB),
        Column("reference_json_schema", JSONB),
        Column("features", JSONB),
        Column("non_features", JSONB),
        Column("features_importance", JSONB, nullable=True),
        Column("model_id", Integer, ForeignKey("models.id"))
    )

    name: str
    model_id: int
    monitor_json_schema: Dict[Any, Any]
    reference_json_schema: Dict[Any, Any]
    features: Dict[str, ColumnType]
    non_features: Dict[str, ColumnType]
    features_importance: Optional[Dict[str, float]]
    start_time: pdl.datetime = None
    end_time: pdl.datetime = None
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "model": relationship("Model"),
        }
    }

    def get_monitor_table_name(self) -> str:
        """Get name of monitor table."""
        return f"model_{self.model_id}_monitor_data_{self.id}"

    def get_monitor_table(self, connection) -> Table:
        """Get table object of the monitor table."""
        metadata = MetaData(bind=connection)
        columns = json_schema_to_columns(self.monitor_json_schema)
        return Table(self.get_monitor_table_name(), metadata, *columns)

    def get_reference_table_name(self) -> str:
        """Get name of reference table."""
        return f"model_{self.model_id}_ref_data_{self.id}"

    def get_reference_table(self, connection) -> Table:
        """Get table object of the reference table."""
        metadata = MetaData(bind=connection)
        columns = json_schema_to_columns(self.reference_json_schema)
        return Table(self.get_reference_table_name(), metadata, *columns)

    async def update_timestamps(self, timestamp: pdl.datetime, session: AsyncSession):
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
        if self.start_time > timestamp:
            ts_updates[ModelVersion.start_time] = func.least(ModelVersion.start_time, timestamp)
        if self.end_time < timestamp:
            ts_updates[ModelVersion.end_time] = func.greatest(ModelVersion.end_time, timestamp)

        # Update min/max timestamp of version only if needed
        if ts_updates:
            await ModelVersion.update(session, self.id, ts_updates)


def json_schema_to_columns(schema: Dict) -> List[Column]:
    """Translate a given json schema into corresponding SqlAlchemy table columns.

    Parameters
    ----------
    schema: Dict
        Json schema

    Returns
    -------
    List[Columns]
        List of columns to be used in order to generate Table object
    """
    columns = []
    for col_name, col_info in schema["properties"].items():
        columns.append(Column(col_name, json_schema_property_to_sqlalchemy_type(col_info)))
    return columns


def json_schema_property_to_sqlalchemy_type(json_property: Dict) -> TypeEngine:
    """Translate a given property inside json schema object to an SqlAlchemy type.

    Parameters
    ----------
    json_property: Dict

    Returns
    -------
    TypeEngine
        An SqlAlchemy type

    """
    types_map = {
        "number": Float,
        "boolean": Boolean,
        "text": Text,
    }
    json_type = json_property["type"]
    if json_type in types_map:
        return types_map[json_type]
    elif json_type == "string":
        str_format = json_property.get("format")
        if str_format == "datetime":
            return DateTime(timezone=True)
        return Text
    elif json_type == "array":
        items_property = json_property["items"]
        return ARRAY(json_schema_property_to_sqlalchemy_type(items_property))
    else:
        raise Exception(f"unknown json type {json_type}")
