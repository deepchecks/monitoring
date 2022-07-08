import typing as t
from pydantic import BaseModel
from deepchecks_monitoring.models.model import TaskType


__all__ = ['Model']


class Model(BaseModel):
    id: t.Optional[int] = None
    name: t.Optional[str] = None
    description: t.Optional[str] = None
    task_type: t.Optional[TaskType] = None
