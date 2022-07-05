import enum
from dataclasses import field, dataclass
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy import Table, Integer, String, Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB


from deepchecks_api.models.database import mapper_registry


class ColumnRole(enum.Enum):
    """Enum containing different roles of columns in data."""
    NUMERIC_FEATURE = 'numeric_feature'
    CATEGORICAL_FEATURE = 'categorical_feature'
    OTHER = 'other'


@mapper_registry.mapped
@dataclass
class ModelVersion:
    __table__ = Table(
        "model_version",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("start_time", DateTime),
        Column("end_time", DateTime),
        Column("json_schema", JSONB),
        Column("column_roles", JSONB),
        Column("features_importance", JSONB),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    model_id: int = field(init=False)
    start_time: datetime = field(init=False)
    end_time: datetime = field(init=False)
    json_schema: dict = field(init=False)
    column_roles: Dict[str, ColumnRole] = field(init=False)
    features_importance: Dict[str, float] = field(init=False)
