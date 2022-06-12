from __future__ import annotations

from dataclasses import field, dataclass
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Table, Integer, String, Column, Enum, ForeignKey
from sqlalchemy.orm import relationship

from backend.deepchecks_api.models.database import mapper_registry


if TYPE_CHECKING:
    from backend.deepchecks_api.models.model_version import ModelVersion


class ModelEnum(Enum):
    """Enum containing supported task types."""
    CLASSIFICATION = 'classification'
    OBJECT_DETECTION = 'object_detection'
    OTHER = 'other'
    REGRESSION = 'regression'
    BINARY = 'binary'
    MULTICLASS = 'multiclass'

@mapper_registry.mapped
@dataclass
class Model:
    __table__ = Table(
        "model",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", ModelEnum),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Enum = None
    versions: List[ModelVersion] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "versions": relationship("ModelVersion"),
        }
    }
