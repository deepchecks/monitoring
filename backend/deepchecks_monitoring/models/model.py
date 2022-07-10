"""Module defining the model ORM model."""
import enum
from dataclasses import field, dataclass
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Table, Integer, String, Column, Enum
from sqlalchemy.orm import relationship
from deepchecks_monitoring.models.base import Base


if TYPE_CHECKING:
    from deepchecks_monitoring.models.model_version import ModelVersion


__all__ = ["TaskType", "Model"]


class TaskType(enum.Enum):
    """Enum containing supported task types."""

    REGRESSION = "regression"
    CLASSIFICATION = "classification"


@dataclass
class Model(Base):
    """ORM model for the model."""

    __table__ = Table(
        "models",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Enum(TaskType))
    )
    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    versions: List["ModelVersion"] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "versions": relationship("ModelVersion"),
        }
    }
