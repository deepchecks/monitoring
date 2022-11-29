"""Module for authentication utilities."""
import base64
import binascii
import secrets
import typing as t

import bcrypt
import jwt
import pendulum as pdl
from fastapi import Depends, HTTPException, Request
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from jwt import PyJWTError
from pendulum.duration import Duration
from pydantic import BaseModel, EmailStr, ValidationError
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload
from starlette.status import HTTP_403_FORBIDDEN

from deepchecks_monitoring import public_models as models
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import AccessForbidden, BadRequest, InvalidConfigurationException, Unauthorized
from deepchecks_monitoring.utils import database

__all__ = ["CurrentUser", "CurrentActiveUser", "AdminUser"]


ALGORITHM = "HS256"


class UserAccessToken(BaseModel):
    email: EmailStr
    is_admin: bool
    exp: t.Optional[float] = None


class APIAccessToken(BaseModel):
    api_token: str


AccessToken = t.Type[t.Union[UserAccessToken, APIAccessToken]]


async def get_user(request: Request,
                   token: AccessToken,
                   session: AsyncSession):
    if not hasattr(request.state, "user"):
        if token is None:
            return
        if isinstance(token, UserAccessToken):
            # If we have token query the user.
            return (await session.scalar(
                select(models.User)
                .where(models.User.email == token.email)
                .options(joinedload(models.User.organization))
            ))
        elif isinstance(token, APIAccessToken):
            # If we have api token query the user and validate the secret
            if len(token.api_token.split(".")) != 2:
                raise Unauthorized("Received incorrect/old secret")
            base64email, api_secret = token.api_token.split(".")
            try:
                user_email = base64.b64decode(base64email).decode()
                user = (await session.scalar(
                    select(models.User)
                    .where(models.User.email == user_email)
                    .options(joinedload(models.User.organization))
                ))
            # to catch incorrect base64 errors
            except (binascii.Error, UnicodeDecodeError) as exc:
                raise Unauthorized("Received invalid secret - incorrect base64 email") from exc
            # Validate user password
            if not bcrypt.checkpw(api_secret.encode(), user.api_secret_hash.encode()):
                raise Unauthorized("Received invalid secret")
            return user
    else:
        return request.state.user


def create_access_token(
    data: UserAccessToken,
    auth_jwt_secret,
    expires_delta: t.Optional[Duration] = None
):
    """Create a JWT access token.

    Parameters
    ----------
    data : dict
        Payload data to encode in the JWT.
    expires_delta : timedelta, optional
        Time delta for the token to expire. The default is None.

    Returns
    -------
    str
        JWT access token.
    """
    if expires_delta:
        expire = pdl.now() + expires_delta
    else:
        expire = pdl.now().add(minutes=15)
    data.exp = expire.int_timestamp
    encoded_jwt = jwt.encode(data.dict(), auth_jwt_secret, algorithm=ALGORITHM)
    return encoded_jwt


def create_api_token(user_email):
    """Create an api token."""
    api_password = secrets.token_urlsafe(16)
    # Saving the password hashed with random salt
    hash_password = bcrypt.hashpw(api_password.encode(), bcrypt.gensalt(12)).decode()
    # Create base64 token for the user
    token_for_the_user = base64.urlsafe_b64encode(user_email.encode()).decode() + "." + api_password
    return hash_password, token_for_the_user


class AccessBearer(OAuth2):
    """Read the token from the request, whether it's from the cookie or the Authorization header.

    Parameters
    ----------
    token_url : str
        The URL to the token endpoint.
    scheme_name : str, optional
        The name of the scheme. Defaults to None.
    scopes : dict, optional
        The scopes to be requested. Defaults to None.
    auto_error : bool, optional
        Whether to raise an error if the token is not found. Defaults to True.
    """

    def __init__(
        self,
        token_url: str = "/token",
        scheme_name: t.Optional[str] = None,
        scopes: t.Optional[t.Dict[t.Any, t.Any]] = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}

        # TODO: why this flow is needed? it does not do anything/
        flows = OAuthFlowsModel(password={"tokenUrl": token_url, "scopes": scopes})
        super().__init__(flows=flows, scheme_name=scheme_name, auto_error=auto_error)

    async def __call__(self, request: Request) -> t.Union[UserAccessToken, APIAccessToken]:
        """Get the token from the request.

        Parameters
        ----------
        request : Request
            The request.

        Returns
        -------
        Optional[str]
            The token.
        """
        access_token: t.Union[UserAccessToken, APIAccessToken] = None

        if hasattr(request.state, "access_token"):
            access_token = request.state.access_token
        else:
            header_authorization = request.headers.get("Authorization")
            cookie_authorization = request.cookies.get("Authorization")

            header_scheme, header_param = get_authorization_scheme_param(
                header_authorization
            )
            cookie_scheme, cookie_param = get_authorization_scheme_param(
                cookie_authorization  # type: ignore
            )

            schema = ""
            token = None

            if header_scheme:
                schema = header_scheme
                token = header_param
            elif cookie_scheme:
                schema = cookie_scheme
                token = cookie_param

            if schema.lower() == "bearer" and token is not None:
                try:
                    access_token = UserAccessToken(**jwt.decode(token, request.app.state.settings.auth_jwt_secret,
                                                                algorithms=[ALGORITHM]))
                except (PyJWTError, ValidationError) as exc:
                    # If the token is invalid, redirect the user to login to get valid credentials
                    raise Unauthorized("Could not validate credentials") from exc
            if schema.lower() == "basic" and token is not None:
                access_token = APIAccessToken(api_token=token)

            request.state.access_token = access_token

        if self.auto_error and access_token is None:
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail="Not authenticated"
            )

        return access_token


class CurrentUser:
    """Dependency used to authenticate users.

    Parameters
    ----------
    enforce : bool , default True
        flag indicating whether dependency should raise
        an exception if an access token is not present
    change_schema : bool, default True
        whether to include user org schema name into schema search path.
        If user is not assigned to org yet then exception will be raised.

        NOTE:
        important to remember:

        >> @router.get(
        >>    "/path",
        >>    dependencies=[CurrentUser(change_schema=True)]
        >> )
        >> def endpoint(
        >>    a: Optional[User] = Depends(CurrentUser(change_schema=False))
        >>    # 'change_schema=False' here does not undo the previous dependency
        >>    # resolver schema change
        >> ):
    """

    def __init__(
        self,
        enforce: bool = True,
    ):
        self.enforce = enforce

    async def __call__(
        self,
        request: Request,
        token: t.Optional[AccessToken] = Depends(AccessBearer(auto_error=False)),
        session: AsyncSession = AsyncSessionDep,
    ) -> t.Optional["models.User"]:
        """Authenticate user.

        Parameters
        ----------
        request: equest
            http request instance
        token : str
            JWT token.
        session : AsyncSession
            SQLAlchemy session.
        """
        request.state.user = await get_user(request, token, session)
        if request.state.user is None:
            if self.enforce:
                raise Unauthorized("expired or invalid access token")
            else:
                return

        return request.state.user


class CurrentActiveUser(CurrentUser):
    """Authenticate a user and verify that he was not disabled."""

    def __init__(
        self,
        enforce: bool = True,
        change_schema: bool = True
    ):
        super().__init__(enforce=enforce)
        self.change_schema = change_schema

    async def __call__(
        self,
        request: Request,
        bearer: t.Optional[AccessToken] = Depends(AccessBearer(auto_error=False)),
        session: AsyncSession = AsyncSessionDep
    ) -> t.Optional["models.User"]:
        """Dependency for validation of a current active user."""
        user = t.cast("models.User", await super().__call__(request, bearer, session))
        if user.organization_id is None or user.full_name is None:
            raise InvalidConfigurationException()
        if user.disabled:
            raise BadRequest("User is disabled")

        is_schema_changed: bool = getattr(request.state, "is_schema_changed", False)

        if self.change_schema is True and not is_schema_changed:
            schema = t.cast(str, request.state.user.organization.schema_name)
            schema = [schema, "public"]
            pg_session_parameter = database.SessionParameter("search_path", local=True, value=schema)

            await session.execute(pg_session_parameter)

            @event.listens_for(session.sync_session, "after_begin")
            def _(session: Session, *args, **kwargs):  # pylint: disable=unused-argument
                """Change schema search path after a transaction start.

                Note:
                AsyncSession does not support event handlers yet, therefore
                we need to use sync session
                """
                session.execute(pg_session_parameter)

            request.state.is_schema_changed = True

        return user


class AdminUser(CurrentActiveUser):
    """Authenticate a user and verify that he is an admin."""

    async def __call__(
        self,
        request: Request,
        bearer: t.Optional[AccessToken] = Depends(AccessBearer(auto_error=False)),
        session: AsyncSession = AsyncSessionDep
    ) -> t.Optional["models.User"]:
        """Dependency for validation of a current active admin user."""
        user = t.cast("models.User", await super().__call__(request, bearer, session))
        if not user.is_admin:
            raise AccessForbidden("User does not have admin rights")
        return user
