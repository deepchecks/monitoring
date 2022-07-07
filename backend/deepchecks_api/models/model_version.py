import enum
from dataclasses import field, dataclass
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy import Table, Integer, String, Column, ForeignKey, DateTime, Float, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from deepchecks_api.models.base import Base


class ColumnRole(enum.Enum):
    """Enum containing different roles of columns in data."""
    NUMERIC_FEATURE = 'numeric_feature'
    CATEGORICAL_FEATURE = 'categorical_feature'
    TAG = 'tag'


class ColumnDataType(enum.Enum):
    """Enum containing possible types of data, according to json schema standard"""
    NUMBER = 'number'
    STRING = 'string'
    BOOLEAN = 'boolean'

    def to_sqlalchemy_type(self):
        map = {
            ColumnDataType.NUMBER: Float,
            ColumnDataType.STRING: Text,
            ColumnDataType.BOOLEAN: Boolean
        }
        return map[self]


@dataclass
class ModelVersion(Base):
    __table__ = Table(
        "model_versions",
        Base.metadata,
        Column("indexs", Integer, primary_key=True, index=True),
        Column("name", String(100)),
        Column("start_time", DateTime(timezone=True)),
        Column("end_time", DateTime(timezone=True)),
        Column("json_schema", JSONB),
        Column("column_roles", JSONB),
        Column("features_importance", JSONB),
        Column("monitor_table_name", String(30)),
        Column("reference_table_name", String(30)),
        Column("model_id", Integer, ForeignKey("models.index"))
    )
    index: int = field(init=False)
    name: str = field()
    model_id: int = field()
    start_time: Optional[datetime] = field(init=False)
    end_time: Optional[datetime] = field(init=False)
    json_schema: dict = field()
    column_roles: Dict[str, ColumnRole] = field()
    features_importance: Optional[Dict[str, float]] = field(init=False)
    monitor_table_name: str = field()
    reference_table_name: str = field()

    __mapper_args__ = {  # type: ignore
        "properties": {
            "model": relationship("Model"),
        }
    }
