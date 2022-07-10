"""Module defining the Segment ORM model."""
import typing as t
from dataclasses import field, dataclass
from sqlalchemy import Table, Integer, String, Column, ForeignKey, JSON

from deepchecks_monitoring.models.base import Base


__all__ = ["Segment"]


@dataclass
class Segment(Base):
    """ORM model for the segment."""

    __table__ = Table(
        "segment",
        Base.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50), nullable=False),
        Column("rule", JSON, nullable=False),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    id: int = field(init=False)
    name: t.Optional[str] = None
    rule: str = field(init=False)
    model_id: int = field(init=False)
