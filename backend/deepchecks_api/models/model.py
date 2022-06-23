from dataclasses import field, dataclass
import enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Table, Integer, String, Column, Enum
from sqlalchemy.orm import relationship

from deepchecks_api.models.database import mapper_registry


class ModelEnum(enum.Enum):
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
    from deepchecks_api.models.model_version import ModelVersion

    __table__ = Table(
        "model",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Enum(ModelEnum)),
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
