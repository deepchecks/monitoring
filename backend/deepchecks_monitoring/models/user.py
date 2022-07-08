import typing as t
import uuid as uuid_pkg
from dataclasses import field, dataclass
from sqlalchemy import Table, String, Column
from deepchecks_monitoring.models.base import Base


__all__ = ['User']


@dataclass
class User:
    __table__ = Table(
        "user",
        Base.metadata,
        Column("uuid", uuid_pkg.UUID, primary_key=True, index=True),
        Column("name", String(50)),
        Column("email", String(50), index=True),
        Column("password", String(50)),
    )
    uuid: uuid_pkg.UUID = field(init=False, default_factory=uuid_pkg.uuid4)
    name: t.Optional[str] = None
    email: t.Optional[str] = None
    password: t.Optional[str] = None
