"""Module representing the endpoints for the auth."""
from authlib.integrations.base_client.errors import MismatchingStateError
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import RedirectResponse

from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep, SettingsDep, get_oauth_resource
from deepchecks_monitoring.exceptions import BadRequest, InternalError
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.user import User, UserOAuthDTO

from .global_router import router

DEFAULT_RETURN_URI = '/'


@router.get('/auth/login/auth0', tags=['security'])
async def auth0_login(
    request: Request,
    oauth: OAuth = Depends(get_oauth_resource),
    settings=SettingsDep
):
    """Redirect to the Auth0 login page."""
    auth0_client = oauth.create_client('auth0')
    redirect_uri = request.url_for('auth0_callback')

    # Only in debug mode we allow to define the return uri
    if settings.debug_mode:
        # If no return uri defined, then use the default '/'
        return_uri = request.query_params.get('return_uri', DEFAULT_RETURN_URI)
        redirect = await auth0_client.authorize_redirect(request, str(redirect_uri), state=return_uri)
    else:
        redirect = await auth0_client.authorize_redirect(request, str(redirect_uri))

    return redirect


@router.get('/auth/login/auth0/callback', tags=['security'])
async def auth0_callback(
    request: Request,
    session: AsyncSession = AsyncSessionDep,
    oauth: OAuth = Depends(get_oauth_resource),
    settings=SettingsDep,
    resources_provider=ResourcesProviderDep
):
    """Get the user details from the Auth0 callback."""
    auth0_client = oauth.create_client('auth0')

    try:
        token = await auth0_client.authorize_access_token(request)
    except MismatchingStateError as error:
        raise BadRequest(error.description) from error

    try:
        info = UserOAuthDTO(**token['userinfo'])
    except ValidationError as e:
        raise InternalError('There was an error while trying to get the user info from the server.') from e

    # If multi tenant is disabled, then we need to assign the user to the single organization if exists
    if resources_provider.get_features_control(user=None).multi_tenant is False:
        organization_id = await session.scalar(select(Organization.id).limit(1))
    else:
        organization_id = None

    user = await User.from_oauth_info(info,
                                      session=session,
                                      auth_jwt_secret=request.app.state.settings.auth_jwt_secret,
                                      eula=False,
                                      organization_id=organization_id)
    await session.flush()
    if settings.debug_mode:
        return_uri = request.query_params.get('state')
        resp = RedirectResponse(url=return_uri)
        resp.set_cookie('Authorization', f'Bearer {user.access_token}', httponly=True, secure=True, samesite='none')
    else:
        resp = RedirectResponse(url=DEFAULT_RETURN_URI)
        resp.set_cookie('Authorization', f'Bearer {user.access_token}', httponly=True, secure=True)

    return resp


@router.get('/auth/logout', tags=['security'])
async def logout(
    settings=SettingsDep
):
    """Logout the user."""
    resp = RedirectResponse(url=DEFAULT_RETURN_URI)
    if settings.debug_mode:
        resp.delete_cookie('Authorization', httponly=True, secure=True, samesite='none')
    else:
        resp.delete_cookie('Authorization', httponly=True, secure=True)

    return resp
