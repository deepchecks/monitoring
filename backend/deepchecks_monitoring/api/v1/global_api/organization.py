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
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.ddl import DropSchema

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.dependencies import (AsyncSessionDep, ResourcesProviderDep, SettingsDep,
                                                get_email_sender_resource)
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.features_control import FeaturesSchema
from deepchecks_monitoring.integrations.email import EmailSender
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.invitation import Invitation
from deepchecks_monitoring.public_models.role import RoleEnum
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import SlackInstallation
from deepchecks_monitoring.schema_models.alert_webhook import AlertWebhook
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.alerts import AlertSeverity
from deepchecks_monitoring.utils.mixpanel import InvitationEvent

from .global_router import router


class InvitationCreationSchema(BaseModel):
    """Schema for the invitation creation."""

    emails: t.Union[EmailStr, t.List[EmailStr]] = Field(alias='email')
    ttl: t.Optional[int]

    @validator('emails')
    @classmethod
    def validate_list_of_emails(cls, value):
        if len(value) == 0:
            raise ValueError("'emails' attribute cannot be empty")
        return value


@router.put('/organization/invite', tags=['organization'])
async def create_invite(
        body: InvitationCreationSchema,
        admin: User = Depends(auth.AdminUser()),
        email_sender: EmailSender = Depends(get_email_sender_resource),
        session: AsyncSession = AsyncSessionDep,
        settings: Settings = SettingsDep,
        resources_provicer: ResourcesProvider = ResourcesProviderDep
):
    """Create invite between organization and a user."""
    body.emails = body.emails if isinstance(body.emails, list) else [body.emails]

    # If user already belong to an organization return bad request
    users = await session.scalars(
        sa.select(User)
        .where(User.email.in_(body.emails))
    )

    for u in users:
        if u.organization_id is not None:
            raise BadRequest(f'User {u.email} already associated to an organization')

    # Fetch users invitations if already exist
    existing_invitations = (await session.execute(
        sa.select(Invitation, User.id.label('created_by'))
        .outerjoin(User, User.email == Invitation.creating_user)
        .where(Invitation.email.in_(body.emails))
        # .where(Invitation.organization_id == admin.organization_id)  # TODO:
    )).all()

    if existing_invitations:
        for record in existing_invitations:
            if record.Invitation.expired() or record.created_by is None:
                # If invitation not valid, remove it and allow new invitation
                await session.execute(
                    sa.delete(Invitation)
                    .where(Invitation.email == record.Invitation.email)
                    .where(Invitation.organization_id == record.Invitation.organization_id)
                )
            else:
                raise BadRequest(f'User "{record.Invitation.email}" already invited')

    session.add_all([
        Invitation(
            email=email,
            ttl=body.ttl,
            organization_id=admin.organization_id,
            creating_user=admin.email
        )
        for email in body.emails
    ])

    # TODO: should be async and should be done by background worker/task
    email_sender.send(
        subject='Deepchecks Invitation',
        recipients=body.emails,
        template_name='invite',
        template_context={
            'from_user': f'{admin.full_name} ({admin.email})' if admin.full_name else admin.email,
            'organization_name': t.cast(Organization, admin.organization).name,
            'host': str(settings.deployment_url)
        }
    )

    await resources_provicer.report_mixpanel_event(
        InvitationEvent.create_event,
        user=admin,
        invitees=[str(it) for it in body.emails]
    )

    return Response(status_code=status.HTTP_200_OK)


class OrganizationSchema(BaseModel):
    """Schema for the organization."""

    name: str
    is_slack_connected: bool
    is_webhook_connected: bool
    slack_notification_levels: t.List[AlertSeverity]
    email_notification_levels: t.List[AlertSeverity]
    webhook_notification_levels: t.List[AlertSeverity]

    class Config:
        """Pydantic configuration."""

        orm_mode = True


class OrganizationUpdateSchema(BaseModel):
    """Schema for the organization update."""

    slack_notification_levels: t.Optional[t.List[AlertSeverity]] = None
    email_notification_levels: t.Optional[t.List[AlertSeverity]] = None
    webhook_notification_levels: t.Optional[t.List[AlertSeverity]] = None

    class Config:
        """Pydantic configuration."""

        orm_mode = True


@router.get('/organization', status_code=status.HTTP_200_OK, tags=['organization'])
async def retrive_organization(
    user: User = Depends(auth.CurrentActiveUser()),
    session: AsyncSession = AsyncSessionDep,
) -> OrganizationSchema:
    """Retrive an organization."""
    is_slack_connected = await session.scalar(
        sa.select(
            sa.select(SlackInstallation.id)
            .limit(1)
            .exists()
        )
    )
    webhook = await session.scalar(
        sa.select(AlertWebhook)
        .order_by(AlertWebhook.id.asc())
        .limit(1)
    )
    if webhook is not None:
        is_webhook_connected = True
        webhook_notification_levels = webhook.notification_levels
    else:
        is_webhook_connected = False
        webhook_notification_levels = []
    return OrganizationSchema(
        name=user.organization.name,
        slack_notification_levels=user.organization.slack_notification_levels,
        email_notification_levels=user.organization.email_notification_levels,
        is_slack_connected=is_slack_connected,
        is_webhook_connected=is_webhook_connected,
        webhook_notification_levels=webhook_notification_levels
    )


@router.put('/organization', status_code=status.HTTP_200_OK, tags=['organization'])
async def update_organization(
    body: OrganizationUpdateSchema,
    user: User = Depends(auth.AdminUser()),
    session: AsyncSession = AsyncSessionDep,
):
    """Update an organization."""

    if (data := body.dict(exclude_none=True)):
        if 'webhook_notification_levels' in data:
            webhook = (
                sa.select(AlertWebhook.id)
                .order_by(AlertWebhook.id)
                .limit(1)
                .cte()
            )
            await session.execute(
                sa.update(AlertWebhook)
                .where(AlertWebhook.id == webhook.c.id)
                .values(notification_levels=data.pop('webhook_notification_levels'))
            )
        if len(data) != 0:
            await session.execute(
                sa.update(Organization)
                .where(Organization.id == t.cast('Organization', user.organization).id)
                .values(**data)
            )

        await session.commit()


@router.delete('/organization')
async def remove_organization(
    user: User = Depends(auth.OwnerUser()),
    session: AsyncSession = AsyncSessionDep
):
    """Remove an organization."""
    if user.organization is not None:
        org_id = user.organization_id
        await session.execute(sa.update(User).where(User.organization_id == org_id).
                              values({User.organization_id: None}))
        await session.execute(DropSchema(user.organization.schema_name, cascade=True))
        await session.execute(sa.delete(Organization).where(Organization.id == org_id),
                              execution_options={'synchronize_session': False})
        await session.commit()
        return Response()
    else:
        return BadRequest('User is not associated with an organization.')


class MemberSchema(BaseModel):
    """Schema for a member."""

    id: int
    email: str
    full_name: t.Optional[str]
    disabled: bool
    picture_url: t.Optional[str]
    last_login: t.Optional[datetime]
    created_at: datetime
    roles: t.List[RoleEnum]

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
    members: t.List[User] = (await session.scalars(
        sa.select(User)
        .where(User.organization_id == user.organization_id)
        .options(selectinload(User.roles))
    )).all()
    members_schems = [MemberSchema(id=user.id, email=user.email, full_name=user.full_name, disabled=user.disabled,
                                   picture_url=user.picture_url, last_login=user.last_login, created_at=user.created_at,
                                   roles=[role.role for role in user.roles]) for user in members]
    members_schems = \
        sorted(members_schems, key=lambda member: member.roles[0].role_index if member.roles else -1, reverse=True)
    members_schems = \
        sorted(members_schems, key=lambda member: member.disabled)
    return members_schems


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
    other_users_count = await session.scalar(select(func.count()).select_from(User)
                                             .where(User.organization_id == user.organization_id, User.id != user.id,
                                                    User.is_admin is True))
    if other_users_count == 0:
        raise BadRequest('You are the single admin user in the organization, in order to leave you must actively '
                         'delete the organization.')

    user.organization_id = None
    await session.commit()


@router.get(
    '/organization/available-features',
    status_code=status.HTTP_200_OK,
    response_model=FeaturesSchema,
    tags=['organization'],
    description='Get available features'
)
async def get_available_features(
    user: User = Depends(auth.CurrentUser()),
    resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Get available features."""
    return resources_provider.get_features_control(user).get_all_features()
