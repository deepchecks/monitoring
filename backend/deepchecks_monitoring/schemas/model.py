"""Module defining the Model Schema."""
import typing as t
from pydantic import BaseModel
from deepchecks_monitoring.models.model import TaskType


__all__ = ['Model']


class Model(BaseModel):
    """Model schema."""

    id: t.Optional[int] = None
    name: t.Optional[str] = None
    description: t.Optional[str] = None
    task_type: t.Optional[TaskType] = None

    class Config:
        """Config for Model schema."""

        orm_mode = True
