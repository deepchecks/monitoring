# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the Role ORM model."""
import enum
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, relationship

from deepchecks_monitoring.public_models.base import Base

if TYPE_CHECKING:
    from deepchecks_monitoring.public_models import User


__all__ = ["Role", "RoleEnum"]


class RoleEnum(str, enum.Enum):
    """Roles enum."""

    # IMPORTANT:
    # Keep items in the permissions restrictions order,
    # from a role with the fewest permissions to a role with the most permissions

    ADMIN = "admin"
    OWNER = "owner"

    @property
    def role_index(self) -> int:
        """Return role index."""
        return tuple(type(self)).index(self)


class Role(Base):
    """ORM model for the roles."""

    __tablename__ = "roles"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "role", name="user_role_uniqueness"),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    role = sa.Column(sa.Enum(RoleEnum), nullable=False)

    user_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("users.id", ondelete="CASCADE", onupdate="RESTRICT"),
        nullable=False
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="roles"
    )
