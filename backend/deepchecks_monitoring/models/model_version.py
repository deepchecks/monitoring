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
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_monitoring.models.base import Base


class ColumnRole(enum.Enum):
    """Enum containing different roles of columns in data."""

    NUMERIC_FEATURE = "numeric_feature"
    CATEGORICAL_FEATURE = "categorical_feature"
    TAG = "tag"


class ColumnDataType(enum.Enum):
    """Enum containing possible types of data, according to json schema standard."""

    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"

    def to_sqlalchemy_type(self):
        """Return the SQLAlchemy type of the data type."""
        types_map = {
            ColumnDataType.NUMBER: Float,
            ColumnDataType.STRING: Text,
            ColumnDataType.BOOLEAN: Boolean
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
        Column("start_time", DateTime(timezone=True)),
        Column("end_time", DateTime(timezone=True)),
        Column("json_schema", JSONB),
        Column("column_roles", JSONB),
        Column("features_importance", JSONB),
        Column("monitor_table_name", String(30)),
        Column("reference_table_name", String(30)),
        Column("model_id", Integer, ForeignKey("models.id"))
    )

    name: str
    model_id: int
    start_time: Optional[datetime] = field(init=False)
    end_time: Optional[datetime] = field(init=False)
    json_schema: Dict[Any, Any]
    column_roles: Dict[str, ColumnRole]
    features_importance: Optional[Dict[str, float]]
    monitor_table_name: str
    reference_table_name: str
    id: int = None

    __mapper_args__ = {  # type: ignore
        "properties": {
            "model": relationship("Model"),
        }
    }
