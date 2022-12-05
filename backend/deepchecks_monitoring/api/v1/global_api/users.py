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

import pendulum as pdl
from fastapi import Depends, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from starlette import status
from starlette.responses import RedirectResponse

from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.monitoring_utils import exists_or_404, fetch_or_404
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.invitation import Invitation
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.auth import create_api_token

from .global_router import router

if t.TYPE_CHECKING:
    from deepchecks_monitoring.app import ResourcesProvider  # pylint: disable=unused-import


class InvitationInfoSchema(BaseModel):
    """Schema for info on invitation."""

    from_user: str
    org_name: str


class CompleteDetailsSchema(BaseModel):
    """Schema for complete details page."""

    invitation: t.Optional[InvitationInfoSchema]
    user_full_name: t.Optional[str]
    organization_name: t.Optional[str]


class CompleteDetailsUpdateSchema(BaseModel):
    """Schema for to update complete details page."""

    new_organization_name: t.Optional[str]
    user_full_name: t.Optional[str]
    accept_invite: t.Optional[bool]


@router.get("/users/complete-details", tags=["users"], response_model=CompleteDetailsSchema)
async def get_complete_details(
        user: User = Depends(auth.CurrentUser()),
        session: AsyncSession = AsyncSessionDep
):
    """Get info needed for the complete details page."""
    query = await Invitation.filter_by(session, email=user.email)
    invite = query.scalar_one_or_none()
    if invite:
        org = await fetch_or_404(session, Organization, id=invite.organization_id)
        from_user = (await User.filter_by(session, email=invite.creating_user)).scalar_one_or_none()
        if from_user is None:
            raise BadRequest("User which created invitation is not exists anymore")
        invite_info = InvitationInfoSchema(from_user=from_user.full_name, org_name=org.name)
    else:
        invite_info = None

    if user.organization_id:
        org = await fetch_or_404(session, Organization, id=user.organization_id)
        org_name = org.name
    else:
        org_name = None

    return CompleteDetailsSchema(invitation=invite_info, user_full_name=user.full_name, organization_name=org_name)


@router.post("/users/complete-details", tags=["users"])
async def update_complete_details(
        body: CompleteDetailsUpdateSchema,
        user: User = Depends(auth.CurrentUser()),
        session: AsyncSession = AsyncSessionDep,
        resources_provider=ResourcesProviderDep
):
    """Complete user details for final login."""
    if body.new_organization_name is not None and body.accept_invite is True:
        raise BadRequest("Can't accept invitation and create new organization")

    if user.organization_id is not None and (body.new_organization_name is not None or body.accept_invite is True):
        raise BadRequest("User is already assigned to organization, can't accept invitation or create new "
                         "organization.")

    if body.user_full_name:
        user.full_name = body.user_full_name

    if body.new_organization_name:
        if resources_provider.launchdarkly_variation("signUpEnabled", user) is False:
            raise BadRequest("This feature is currently not available.")
        org = await Organization.create_for_user(user, body.new_organization_name)
        session.add(org)
        await org.schema_builder.create(AsyncEngine(session.get_bind()))
    elif body.accept_invite:
        invite: Invitation = await fetch_or_404(session, Invitation, email=user.email)
        # Check ttl
        if invite.ttl and pdl.instance(invite.created_at).add(seconds=invite.ttl) < pdl.now():
            raise BadRequest("Invite expired")
        # Check organization exists
        await exists_or_404(session, Organization, id=invite.organization_id)
        # Update user in database
        user.organization_id = invite.organization_id
        # delete the invite
        await session.delete(invite)

    await session.flush()
    # Redirect carries over the POST verb, in order to change it to GET we need to set 302 code instead of 307
    return RedirectResponse("/", status_code=status.HTTP_302_FOUND)


@router.post("/users/leave-organization", tags=["users"])
async def leave_organization(
        user: User = Depends(auth.CurrentUser())
):
    """Leave organization."""
    # TODO: should not we remove organization?
    user.organization_id = None
    return Response()


@router.delete("/users", tags=["users"])
async def delete_user(
        user: User = Depends(auth.CurrentUser()),
        session: AsyncSession = AsyncSessionDep,
):
    """Delete the user."""
    await session.delete(user)
    return Response()


class OrganizationSchema(BaseModel):
    """Schema for organization."""

    id: int
    name: str

    class Config:
        """Pydantic config."""

        orm_mode = True


class UserSchema(BaseModel):
    """Schema for user."""

    id: int
    email: str
    created_at: datetime
    full_name: t.Optional[str] = None
    picture_url: t.Optional[str] = None
    organization: t.Optional[OrganizationSchema]

    class Config:
        """Pydantic config."""

        orm_mode = True


@router.get(
    "/users/me",
    response_model=UserSchema,
    tags=["users"],
    description="Retrieve user details"
)
async def retrieve_user_info(user: User = Depends(auth.CurrentUser())) -> UserSchema:
    """Retrieve user details."""
    return UserSchema.from_orm(user)


@router.get(
    "/users/regenerate-api-token",
    response_model=str,
    tags=["users"],
    description="Regenerate user token"
)
async def regenerate_api_token(
    user: User = Depends(auth.CurrentUser()),  # TODO: why not CurrentActiveUser?
    session: AsyncSession = AsyncSessionDep
) -> UserSchema:
    """Regenerate user token."""
    hash_password, user_token = create_api_token(user.email)
    user.api_secret_hash = hash_password
    session.add(user)
    await session.commit()
    return user_token


@router.get(
    "/users/accept-eula",
    name="eula-acceptance",
    tags=["users"],
    description="Accept End-User License Aggrement"
)
async def accept_eula(
    user: User = Depends(auth.CurrentActiveUser()),
    session: AsyncSession = AsyncSessionDep
):
    """Accept End-User License Aggrement."""
    user.eula = True
    await session.commit()
