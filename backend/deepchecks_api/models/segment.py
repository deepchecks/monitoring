from dataclasses import field, dataclass
from sqlalchemy import Table, Integer, String, Column, ForeignKey, JSON

from deepchecks_api.models.database import  mapper_registry


@mapper_registry.mapped
@dataclass
class Segment:
    __table__ = Table(
        "segment",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50), nullable=False),
        Column("rule", JSON, nullable=False),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    id: int = field(init=False)
    name: str = None
    rule: str = field(init=False)
    model_id: int = field(init=False)
