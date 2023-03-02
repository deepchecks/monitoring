# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""User entity model."""
import typing as t
from dataclasses import dataclass
from datetime import datetime

import pendulum as pdl
import sqlalchemy as sa
from pydantic import AnyHttpUrl
from pydantic import BaseModel as PydanticModel
from pydantic import EmailStr
from sqlalchemy.dialects.postgresql import insert as pginsert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, relationship
from typing_extensions import Self

from deepchecks_monitoring.public_models import Base
from deepchecks_monitoring.utils import auth

if t.TYPE_CHECKING:
    from deepchecks_monitoring.public_models import Organization  # pylint: disable=unused-import

__all__ = ["User", "UserOAuthDTO"]


class UserOAuthDTO(PydanticModel):
    """User authentication data transfer object."""

    name: str
    email: EmailStr
    picture: t.Optional[AnyHttpUrl] = None


@dataclass
class User(Base):
    """User model."""

    __tablename__ = "users"
    __table_args__ = (
        sa.UniqueConstraint("email", name="email_uniqueness"),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    email = sa.Column(sa.String, nullable=False)
    full_name = sa.Column(sa.String, nullable=True)
    disabled = sa.Column(sa.Boolean, default=False, nullable=False)
    picture_url = sa.Column(sa.String, nullable=True)
    is_admin = sa.Column(sa.Boolean, default=False, nullable=False)
    last_login = sa.Column(sa.DateTime(timezone=True), nullable=True, onupdate=sa.func.now())
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())

    eula = sa.Column(  # End-User License Agreement
        sa.Boolean,
        nullable=False,
        default=False,
        server_default=sa.text("FALSE")
    )

    # TODO:
    # user should have a ability to open multiple sessions
    # the access token must not be stored here
    access_token = sa.Column(sa.String, nullable=True)
    api_secret_hash = sa.Column(sa.String, nullable=True)

    organization_id = sa.Column(
        sa.Integer,
        sa.ForeignKey("organizations.id", ondelete="RESTRICT", onupdate="RESTRICT"),
        nullable=True
    )
    organization: Mapped["Organization"] = relationship(
        "Organization",
        lazy="joined"
    )

    @classmethod
    async def from_oauth_info(
        cls: t.Type[Self],
        info: UserOAuthDTO,
        session: AsyncSession,
        auth_jwt_secret: str,
        eula: bool = True,
        organization_id: int = None
    ) -> Self:
        """Create or get user instance from ouath info."""
        token_data = auth.UserAccessToken(email=info.email, is_admin=True)
        access_token = auth.create_access_token(token_data, auth_jwt_secret, expires_delta=pdl.duration(days=7))

        # Checking if the user is already in the database
        # If not, we create a new user and a new organization for the user
        # If yes, we update the user with a new access token
        stm = pginsert(User).values(
            email=info.email,
            full_name=info.name,
            picture_url=info.picture,
            access_token=access_token,
            eula=eula,
            organization_id=organization_id,
        ).on_conflict_do_update(constraint="email_uniqueness", set_={
            "access_token": access_token,
            "last_login": datetime.now()
        }).returning(User.id)

        user_id = (await session.execute(stm)).scalar()
        return await session.get(User, user_id, populate_existing=True)
