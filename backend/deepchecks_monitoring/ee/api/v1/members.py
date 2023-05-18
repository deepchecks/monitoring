# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module representing the endpoints for members advanced edit."""
import typing as t

import sqlalchemy as sa
from fastapi import Depends
from pydantic.main import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.api.v1.global_api.users import UserSchema
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import BadRequest, PaymentRequired
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.public_models.role import Role, RoleEnum
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import auth

from .routers import ee_router as router


class RoleUpdateSchema(BaseModel):
    """Role update schema."""

    roles: t.List[RoleEnum]
    replace: t.Optional[bool] = True


@router.put("/users/{user_id}/roles", response_model=UserSchema, tags=["users"])
async def update_user_role(roles_schema: RoleUpdateSchema,
                           user_id: int,
                           session: AsyncSession = AsyncSessionDep,
                           resources_provider: ResourcesProvider = ResourcesProviderDep,
                           current_user: User = Depends(auth.OwnerUser()),  # pylint: disable=unused-argument
                           ) -> UserSchema:
    """Update user roles."""

    features_control: FeaturesControl = resources_provider.get_features_control(current_user)
    if not features_control.update_roles:
        raise PaymentRequired("Updating roles requires to set up a subscription. "
                              f"Set up through {resources_provider.settings.deployment_url}"
                              f"/workspace-settings")
    user = await fetch_or_404(session, User, id=user_id)
    if user.organization_id != current_user.organization_id:
        raise BadRequest("User doesn't exists in your organization.")

    roles: t.List[Role] = await session.scalars(sa.select(Role).where(Role.user_id == user_id))
    roles_to_create = []
    roles_to_delete = []
    for role in roles:
        if role.role not in roles_schema.roles:
            if roles_schema.replace:
                roles_to_delete.append(role.id)
    existing_roles = [role.role for role in roles]
    for role in roles_schema.roles:
        if role not in existing_roles:
            roles_to_create.append(Role(user_id=user_id, role=role))

    await session.execute(sa.delete(Role).where(Role.id.in_(roles_to_delete)))
    session.add_all(roles_to_create)
    await session.flush()

    user = await session.scalar(sa.select(User).where(User.id == user_id).options(joinedload(User.roles)))
    return UserSchema(id=user.id, email=user.email, created_at=user.created_at, full_name=user.full_name,
                      picture_url=user.picture_url, organization=user.organization,
                      roles=[role.role for role in user.roles])
