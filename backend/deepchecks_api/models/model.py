import enum
from dataclasses import field, dataclass
from typing import Optional, List

from sqlalchemy import Table, Integer, String, Column, Enum
from sqlalchemy.orm import relationship

from deepchecks_api.models.base import Base


class TaskType(enum.Enum):
    """Enum containing supported task types."""
    REGRESSION = 'regression'
    CLASSIFICATION = 'classification'


@dataclass
class Model(Base):
    from deepchecks_api.models.model_version import ModelVersion

    __table__ = Table(
        "models",
        Base.metadata,
        Column("index", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Enum(TaskType))
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
