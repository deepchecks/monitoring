from dataclasses import field, dataclass
from sqlalchemy import Table, String, Column

from backend.deepchecks_api.models import mapper_registry


@mapper_registry.mapped
@dataclass
class User:
    __table__ = Table(
        "user",
        mapper_registry.metadata,
        Column("uuid", String(50), primary_key=True),
        Column("name", String(50)),
        Column("email", String(50)),
        Column("password", String(50)),
    )
    uuid: str = field(init=False)
    name: str = None
    email: str = None
    password: str = None
