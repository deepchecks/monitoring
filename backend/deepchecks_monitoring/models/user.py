# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Model defining the User ORM model."""
import typing as t
import uuid as uuid_pkg
from dataclasses import dataclass, field

from sqlalchemy import Column, String, Table

from deepchecks_monitoring.models.base import Base

__all__ = ["User"]


@dataclass
class User(Base):
    """ORM model for the user."""

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
