from typing import Dict

from pydantic import BaseModel

from deepchecks_api.models.model_version import ColumnRole, ColumnDataType


class VersionInfo(BaseModel):
    name: str = None
    features_importance: Dict[str, float] = None
    column_roles: Dict[str, ColumnRole]
    column_types: Dict[str, ColumnDataType]
