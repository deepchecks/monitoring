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
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base

__all__ = ["ColumnType", "ModelVersion"]


class ColumnType(enum.Enum):
    """Enum containing possible types of data, according to json schema standard."""

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
            ColumnType.TEXT: Text
        }
        return types_map[self]

    def to_json_schema_type(self):
        """Return the json type of the column type."""
        types_map = {
            ColumnType.NUMERIC: "number",
            ColumnType.CATEGORICAL: "string",
            ColumnType.BOOLEAN: "boolean",
            ColumnType.TEXT: "string"
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
        Column("start_time", DateTime(timezone=True), nullable=True),
        Column("end_time", DateTime(timezone=True), nullable=True),
        Column("json_schema", JSONB),
        Column("features", JSONB),
        Column("non_features", JSONB),
        Column("features_importance", JSONB, nullable=True),
        Column("model_id", Integer, ForeignKey("models.id"))
    )

    name: str
    model_id: int
    json_schema: Dict[Any, Any]
    features: Dict[str, ColumnType]
    non_features: Dict[str, ColumnType]
    features_importance: Optional[Dict[str, float]]
    id: int = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "model": relationship("Model"),
        }
    }

    def get_monitor_table_name(self):
        """Get name of monitor table."""
        return f"model_{self.model_id}_monitor_data_{self.id}"

    def get_reference_table_name(self):
        """Get name of reference table."""
        return f"model_{self.model_id}_ref_data_{self.id}"
