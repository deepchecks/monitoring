import typing as t
from pydantic import BaseModel
from deepchecks_monitoring.models.model_version import ColumnRole, ColumnDataType


__all__ = ['VersionInfo']


class VersionInfo(BaseModel):
    name: t.Optional[str] = None
    features_importance: t.Optional[t.Dict[str, float]] = None
    column_roles: t.Optional[t.Dict[str, ColumnRole]]
    column_types: t.Optional[t.Dict[str, ColumnDataType]]
