"""Represent the API for the slack integration."""
import typing as t

from fastapi import Depends, Query, Request, status
from fastapi.responses import PlainTextResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pginsert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep, SettingsDep
from deepchecks_monitoring.ee.config import Settings
from deepchecks_monitoring.ee.integrations.slack import SlackInstallationError, SlackInstallationUtils
from deepchecks_monitoring.ee.resources import ResourcesProvider
from deepchecks_monitoring.monitoring_utils import exists_or_404
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.schema_models.slack import SlackInstallation, SlackInstallationState
from deepchecks_monitoring.utils import auth

from .routers import ee_router


@ee_router.get('/slack.authorize', name='slack-authorization-redirect', tags=['slack'])
async def installation_redirect(
    request: Request,
    settings: Settings = SettingsDep,
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Redirect user to the slack authorization page.

    codeflow:
    1. Authenticate user
    2. Verify whether user has permissions to do operation
    3. Issue 'installation state' to prevent forgery attack
    4. Generate redirection URL
    5. Set 'installation state' cookie
    6. Redirect user to slack authorization page.

    Slack authorization URL description:
    https://slack.com/oauth/v2/authorize?state=&client_id=&scope=&user_scope=
    state - installation state, slack will include it in request with exchange code
    client_id - application client id
    scope - list of bot permissions
    user_scope -

    """
    state = await SlackInstallationState.issue(session, ttl=settings.slack_state_ttl)
    redirect_path = request.url_for('slack-installation-callback')
    utils = SlackInstallationUtils(settings)
    return RedirectResponse(
        url=utils.generate_authorization_url(state, str(redirect_path)),
        headers={'set-cookie': utils.generate_state_cookies(state)}
    )


@ee_router.get(
    '/slack.install',
    name='slack-installation-callback',
    tags=['slack'],
    include_in_schema=False
)
async def installation_callback(
    request: Request,
    code: t.Optional[str] = Query(...),
    error: t.Optional[str] = Query(default=None),
    state: t.Optional[str] = Query(default=None),
    settings: Settings = SettingsDep,
    user: User = Depends(auth.AdminUser()),  # pylint: disable=unused-argument
    session: AsyncSession = AsyncSessionDep,
):
    """Finish slack installation.

    When a user confirms application (bot) installation,
    slack redirects him back to the 'redirect_uri' URL
    provided within the authorization request.

    Slack will include the next query parameters with the redirection URL:
    code - access token exchange code
    error - error message if something went wrong
    state - installation state token that was passed with an authorization request.
    """
    utils = SlackInstallationUtils(settings)
    headers = {'set-cookie': utils.generate_state_cookies_removal()}
    result_page_url = request.url_for('slack-installation-result')

    if error is not None:
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message=f'Failed to install slack into workspace.\nError: {error}'
            ),
            headers=headers
        )
    if code is None:
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message='Redirection request missing exchange code'
            ),
            headers=headers
        )
    if state is None:
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message='Missing installation state code'
            ),
            headers=headers
        )
    if not utils.is_valid_state_cookies(state, request.headers):
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message='Invalid or missed installation state cookie'
            ),
            headers=headers
        )

    is_active_state = await SlackInstallationState.is_active(session, state)

    if not is_active_state:
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message='Expired installation state code'
            ),
            headers=headers
        )

    try:
        redirect_path = str(request.url_for('slack-installation-callback'))
        breakpoint()
        installation = utils.finish_installation(code, redirect_path)
    except SlackInstallationError as exception:
        return RedirectResponse(
            url=result_page_url.include_query_params(
                is_successful=False,
                message=str(exception)
            ),
            headers=headers
        )

    await session.execute(pginsert(SlackInstallation).values(
        app_id=installation.app_id,
        client_id=settings.slack_client_id,
        scope=installation.scope,
        token_type=installation.token_type,
        access_token=installation.access_token,
        bot_user_id=installation.bot_user_id,
        team_id=installation.team.id,
        team_name=installation.team.name,
        authed_user_id=installation.authed_user.id,
        incoming_webhook_channel_id=installation.incoming_webhook.channel_id,
        incoming_webhook_channel=installation.incoming_webhook.channel,
        incoming_webhook_url=installation.incoming_webhook.url,
        incoming_webhook_configuration_url=installation.incoming_webhook.configuration_url,
        created_by=user.id,
        updated_by=user.id,
    ).on_conflict_do_update(
        constraint='slackapp_per_workspace',
        set_=dict(
            scope=installation.scope,
            token_type=installation.token_type,
            access_token=installation.access_token,
            bot_user_id=installation.bot_user_id,
            authed_user_id=installation.authed_user.id,
            incoming_webhook_channel_id=installation.incoming_webhook.channel_id,
            incoming_webhook_channel=installation.incoming_webhook.channel,
            incoming_webhook_url=installation.incoming_webhook.url,
            incoming_webhook_configuration_url=installation.incoming_webhook.configuration_url,
            created_by=user.id,
            updated_by=user.id,
        )
    ))

    return RedirectResponse(
        url=result_page_url.include_query_params(
            is_successful=True,
            message='Slack app installed'
        ),
        headers=headers
    )


@ee_router.get(
    '/slack.installation-result',
    name='slack-installation-result',
    tags=['slack'],
    include_in_schema=False
)
def installation_finish_page(
    request: Request,
    is_successful: bool = Query(...),
    message: str = Query(...),
    resources_provider: ResourcesProvider = ResourcesProviderDep
):
    if not message:
        message = (
            "Slack app installed"
            if is_successful
            else "Failed to install slack app"
        )
    return resources_provider.jinja_templates.TemplateResponse(
        name='slack/installation-status.html',
        status_code=status.HTTP_200_OK,
        context={
            'request': request,
            'message': message,
            'is_successful': is_successful
        },
    )


class SlackBotSchema(BaseModel):
    """Slack Installation endpoint output schema."""

    id: int
    team_name: str
    scope: str

    class Config:
        """Pydantic config."""

        orm_mode = True


@ee_router.get('/slack/apps', tags=['slack'])
async def retrieve_instalations(
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Return list of slack installations."""
    q = select(SlackInstallation)
    installations = (await session.scalars(q)).all()
    return [SlackBotSchema.from_orm(it).dict() for it in installations]


@ee_router.delete('/slack/apps/{app_id}', tags=['slack'])
async def remove_installation(
    app_id: int,
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Remove slack installation."""
    await exists_or_404(session, SlackInstallation, id=app_id)
    await session.execute(
        delete(SlackInstallation)
        .where(SlackInstallation.id == app_id)
    )
