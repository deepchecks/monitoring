from textwrap import indent
import uuid as uuid_pkg

from dataclasses import field, dataclass
from sqlalchemy import Table, String, Column

from backend.deepchecks_api.models import mapper_registry


@mapper_registry.mapped
@dataclass
class User:
    __table__ = Table(
        "user",
        mapper_registry.metadata,
        Column("uuid", uuid_pkg.UUID, primary_key=True, index=True),
        Column("name", String(50)),
        Column("email", String(50), index=True),
        Column("password", String(50)),
    )
    uuid: uuid_pkg.UUID = field(init=False, default_factory=uuid_pkg.uuid4)
    name: str = None
    email: str = None
    password: str = None
