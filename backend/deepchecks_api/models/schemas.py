from typing import List, Optional

from pydantic import BaseModel

from backend.deepchecks_api.models.model import ModelEnum
from backend.deepchecks_api.models.model_version import ModelVersion

class Model(BaseModel):
    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: ModelEnum = None
    versions: Optional[List[ModelVersion]]
