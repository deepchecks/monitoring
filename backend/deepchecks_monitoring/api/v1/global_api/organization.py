# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module representing the endpoints for the organization."""
import typing as t
from datetime import datetime

import sqlalchemy as sa
from fastapi import Depends, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.schema import DropSchema

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.dependencies import (AsyncSessionDep, ResourcesProviderDep, SettingsDep,
                                                get_email_sender_resource)
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.interfaces import EmailSender
from deepchecks_monitoring.monitoring_utils import exists_or_404
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.invitation import Invitation
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.resources import ResourcesProvider, TierConfSchema
from deepchecks_monitoring.schema_models import AlertSeverity, SlackInstallation
from deepchecks_monitoring.utils import auth

from .global_router import router


class InvitationCreationSchema(BaseModel):
    """Schema for the invitation creation."""

    email: EmailStr
    ttl: t.Optional[int]


@router.put('/organization/invite', tags=['organization'])
async def create_invite(
        body: InvitationCreationSchema,
        user: User = Depends(auth.AdminUser()),
        email_sender: EmailSender = Depends(get_email_sender_resource),
        session: AsyncSession = AsyncSessionDep,
        settings: Settings = SettingsDep
):
    """Create invite between organization and a user."""
    # Check organization exists
    await exists_or_404(session, Organization, id=user.organization_id)
    # If user already belong to an organization return bad request
    other_user_query = await User.filter_by(session, email=body.email)
    other_user = other_user_query.scalar_one_or_none()
    if other_user and other_user.organization_id is not None:
        raise BadRequest('User already associated to an organization')

    # Fetch user invitation if already exist
    invitation = (await Invitation.filter_by(session, email=body.email)).scalar_one_or_none()
    if invitation:
        from_user = (await User.filter_by(session, email=invitation.creating_user)).scalar_one_or_none()
        # If invitation not valid, remove it and allow new invitation
        if invitation.expired() or from_user is None:
            await invitation.delete(session)
        else:
            raise BadRequest('User already invited')

    invitation = Invitation(organization_id=user.organization_id, **body.dict(exclude_none=True),
                            creating_user=user.email)
    session.add(invitation)

    # TODO: should be async and should be done by background worker/task
    email_sender.send(
        subject='Deepchecks Invitation',
        recipients=[body.email],
        template_name='invite',
        template_context={
            'from_user': f'{user.full_name} ({user.email})' if user.full_name else user.email,
            'organization_name': t.cast(Organization, user.organization).name,
            'host': str(settings.deployment_url)
        }
    )

    return Response(status_code=status.HTTP_200_OK)


class OrganizationSchema(BaseModel):
    """Schema for the organization."""

    name: str
    is_slack_connected: bool
    slack_notification_levels: t.List[AlertSeverity]
    email_notification_levels: t.List[AlertSeverity]

    class Config:
        """Pydantic configuration."""

        orm_mode = True


class OrganizationUpdateSchema(BaseModel):
    """Schema for the organization update."""

    slack_notification_levels: t.Optional[t.List[AlertSeverity]] = None
    email_notification_levels: t.Optional[t.List[AlertSeverity]] = None

    class Config:
        """Pydantic configuration."""

        orm_mode = True


@router.get('/organization', status_code=status.HTTP_200_OK, tags=['organization'])
async def retrive_organization(
    user: User = Depends(auth.CurrentActiveUser()),
    session: AsyncSession = AsyncSessionDep,
) -> OrganizationSchema:
    """Retrive an organization."""
    return OrganizationSchema(
        name=user.organization.name,
        slack_notification_levels=user.organization.slack_notification_levels,
        email_notification_levels=user.organization.email_notification_levels,
        is_slack_connected=(await session.scalar(
            sa.select(
                sa.select(SlackInstallation.id)
                .limit(1)
                .exists()
            )
        ))
    )


@router.put('/organization', status_code=status.HTTP_200_OK, tags=['organization'])
async def update_organization(
    body: OrganizationUpdateSchema,
    user: User = Depends(auth.AdminUser()),
    session: AsyncSession = AsyncSessionDep,
):
    """Update an organization."""
    if (data := body.dict(exclude_none=True)):
        user.organization.email_notification_levels = data['email_notification_levels']
        user.organization.slack_notification_levels = data['slack_notification_levels']
        session.add(user)
        await session.flush()


@router.delete('/organization', include_in_schema=False)
async def remove_organization(
    user: User = Depends(auth.CurrentUser()),
    session: AsyncSession = AsyncSessionDep,
    settings=SettingsDep
):
    """Remove an organization."""
    # Active only in debug mode
    if settings.debug_mode:
        if user.organization_id is not None:
            if not user.is_admin or user.disabled:
                return Response(status_code=403)
            organization: Organization = user.organization
            await session.execute(update(User).where(User.organization_id == user.organization_id).
                                  values({User.organization_id: None}))
            await session.execute(DropSchema(organization.schema_name, cascade=True))
            await session.delete(organization)
            await session.commit()
        return Response()
    else:
        return Response(status_code=403)


class MemberSchema(BaseModel):
    """Schema for a member."""

    id: int
    email: str
    full_name: t.Optional[str]
    disabled: bool
    picture_url: t.Optional[str]
    is_admin: bool
    last_login: t.Optional[datetime]
    created_at: datetime

    class Config:
        """Pydantic configuration."""

        orm_mode = True


@router.get(
    '/organization/members',
    status_code=status.HTTP_200_OK,
    response_model=t.List[MemberSchema],
    tags=['organization'],
    description='Retrieve organization members'
)
async def retrieve_organization_members(
    user: User = Depends(auth.AdminUser()),
    session: AsyncSession = AsyncSessionDep,
):
    """Retrieve organization members."""
    members = (await session.scalars(
        sa.select(User)
        .where(User.organization_id == user.organization_id)
        .order_by(User.disabled.asc(), User.is_admin.desc())
    )).all()
    return [MemberSchema.from_orm(it).dict() for it in members]


@router.delete(
    '/organization/members/{member_id}',
    status_code=status.HTTP_200_OK,
    tags=['organization'],
    description='Remove member from an organization'
)
async def remove_organization_member(
    member_id: int,
    user: User = Depends(auth.AdminUser()),
    session: AsyncSession = AsyncSessionDep,
):
    """Remove member from an organization."""
    await session.execute(
        sa.update(User)
        .where(User.id == member_id)
        .where(User.organization_id == user.organization_id)
        .values(organization_id=None)
    )


@router.post(
    '/organization/leave',
    status_code=status.HTTP_200_OK,
    tags=['organization'],
    description='Leave the organization'
)
async def leave_organization(
    user: User = Depends(auth.CurrentUser()),
    session: AsyncSession = AsyncSessionDep,
):
    """Remove member from an organization."""
    user.organization_id = None
    await session.commit()


@router.get(
    '/organization/available-features',
    status_code=status.HTTP_200_OK,
    response_model=TierConfSchema,
    tags=['organization'],
    description='Get available features'
)
async def get_available_features(
    user: User = Depends(auth.CurrentUser()),
    resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Get available features."""
    return await resources_provider.get_tier_conf(user)
