from typing import List, Optional

from pydantic import BaseModel

from backend.deepchecks_api.models.model import ModelEnum

class Model(BaseModel):
    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: ModelEnum = None
