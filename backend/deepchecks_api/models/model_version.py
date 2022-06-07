from dataclasses import field, dataclass
from typing import Optional

from sqlalchemy import Table, Integer, String, Column, ForeignKey

from backend.deepchecks_api.models import mapper_registry


@mapper_registry.mapped
@dataclass
class ModelVersion:
    __table__ = Table(
        "model_version",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    model_id: int = field(init=False)
