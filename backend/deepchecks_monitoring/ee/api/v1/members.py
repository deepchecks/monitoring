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
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import BadRequest, PaymentRequired
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.monitoring_utils import exists_or_404, fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.public_models.role import Role, RoleEnum
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.schema_models.model_memeber import ModelMember
from deepchecks_monitoring.utils import auth

from .routers import ee_router as router


class RoleUpdateSchema(BaseModel):
    """Role update schema."""

    roles: t.List[RoleEnum]
    replace: t.Optional[bool] = True


class MemberUpdateSchema(BaseModel):
    """Member update schema."""

    model_ids: t.List[int]
    replace: t.Optional[bool] = True


class BatchModelMemberUpdateSchema(BaseModel):
    """Member update schema."""

    user_ids: t.List[int]
    replace: t.Optional[bool] = True


@router.put("/users/{user_id}/roles", response_model=UserSchema, tags=[Tags.USERS])
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

    if user_id == current_user.id and roles_schema.replace and RoleEnum.OWNER not in roles_schema.roles:
        owner = await session.scalar(
            sa.select(Role).where(sa.and_(Role.role == RoleEnum.OWNER,
                                          Role.user_id != current_user.id,
                                          User.organization_id == current_user.organization_id))
            .join(User, Role.user_id == User.id)
        )
        if not owner:
            raise BadRequest("Owner cannot remove their owner role if there are no other owners in the organization.")

    roles: t.List[Role] = (await session.execute(sa.select(Role).where(Role.user_id == user_id))).scalars().all()
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


@router.post("/users/{user_id}/models", tags=[Tags.USERS])
async def assign_models_to_user(
    user_id: int,
    member_schema: MemberUpdateSchema,
    session: AsyncSession = AsyncSessionDep,
    resources_provider: ResourcesProvider = ResourcesProviderDep,
    current_user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
):
    """Assign models to user."""

    features_control: FeaturesControl = resources_provider.get_features_control(current_user)
    if not features_control.model_assignment:
        raise PaymentRequired("Model assignment requires to set up a dedicated plan. "
                              "Contact Deepchecks.")
    user = await fetch_or_404(session, User, id=user_id)
    if user.organization_id != current_user.organization_id:
        raise BadRequest("User doesn't exists in your organization.")

    for model_id in member_schema.model_ids:
        await exists_or_404(session, Model, id=model_id)

    model_memebers: t.List[ModelMember] = (
        await session.execute(sa.select(ModelMember)
                              .where(ModelMember.user_id == user_id))
    ).scalars().all()
    models_to_create = []
    models_to_delete = []
    for model_memeber in model_memebers:
        if model_memeber.model_id not in member_schema.model_ids:
            if member_schema.replace:
                models_to_delete.append(model_memeber.id)
    existing_models = [member.model_id for member in model_memebers]
    for model_id in member_schema.model_ids:
        if model_id not in existing_models:
            models_to_create.append(ModelMember(user_id=user_id, model_id=model_id))

    await session.execute(sa.delete(ModelMember).where(ModelMember.id.in_(models_to_delete)))
    session.add_all(models_to_create)
    await session.flush()


@router.post("/models/{model_id}/members", tags=[Tags.MODELS])
async def assign_users_to_model(
    model_id: int,
    member_schema: BatchModelMemberUpdateSchema,
    session: AsyncSession = AsyncSessionDep,
    resources_provider: ResourcesProvider = ResourcesProviderDep,
    current_user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
):
    """Assign users to model."""

    features_control: FeaturesControl = resources_provider.get_features_control(current_user)
    if not features_control.model_assignment:
        raise PaymentRequired("Model assignment requires to set up a dedicated plan. "
                              "Contact Deepchecks.")
    await exists_or_404(session, Model, id=model_id)

    for user_id in member_schema.user_ids:
        user = await fetch_or_404(session, User, id=user_id)
        if user.organization_id != current_user.organization_id:
            raise BadRequest(f"User(id:{user_id}) doesn't exists in your organization.")

    model_memebers: t.List[ModelMember] = (
        await session.execute(sa.select(ModelMember)
                              .where(ModelMember.model_id == model_id))
    ).scalars().all()
    users_to_create = []
    users_to_delete = []
    for model_memeber in model_memebers:
        if model_memeber.user_id not in member_schema.user_ids:
            if member_schema.replace:
                users_to_delete.append(model_memeber.id)
    existing_users = [member.user_id for member in model_memebers]
    for user_id in member_schema.user_ids:
        if user_id not in existing_users:
            users_to_create.append(ModelMember(user_id=user_id, model_id=model_id))

    await session.execute(sa.delete(ModelMember).where(ModelMember.id.in_(users_to_delete)))
    session.add_all(users_to_create)
    await session.flush()
