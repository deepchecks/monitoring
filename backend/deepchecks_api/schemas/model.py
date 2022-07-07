from typing import Optional

from pydantic import BaseModel

from deepchecks_api.models.model import TaskType


class Model(BaseModel):
    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: TaskType = None
