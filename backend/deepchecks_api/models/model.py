from dataclasses import field, dataclass
from typing import Optional, List

from sqlalchemy import Table, Integer, String, Column, Enum
from sqlalchemy.orm import registry, relationship

from deepchecks.vision.vision_data import TaskType
from deepchecks.utils.metrics import ModelType

from backend.deepchecks_api.models import ModelVersion
from backend.deepchecks_api.models.database import Base

mapper_registry = registry()


@mapper_registry.mapped
@dataclass
class Model(Base):
    __table__ = Table(
        "model",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Column(Enum(TaskType, ModelType))),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: TaskType = None
    versions: List[ModelVersion] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "versions": relationship("ModelVersion"),
        }
    }
