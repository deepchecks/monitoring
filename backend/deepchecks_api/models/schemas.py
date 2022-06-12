from typing import List, Optional

from pydantic import BaseModel
from traitlets import Integer

from backend.deepchecks_api.models.model_version import ModelVersion

class Model(BaseModel):
    id: int = None
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: str = None
    versions: Optional[List[ModelVersion]]
