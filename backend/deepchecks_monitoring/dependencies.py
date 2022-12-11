# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# pylint: disable=unused-import
"""Module defining the dependencies of the application."""
import typing as t

import authlib.integrations.starlette_client
import fastapi
from fastapi import Depends, FastAPI, Request
from kafka import KafkaAdminClient
from pydantic import BaseSettings

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.exceptions import (BadRequest, BaseHTTPException, ContentLengthRequired, NotFound,
                                              RequestTooLarge)
from deepchecks_monitoring.feature_flags import FeatureFlag, Variation
from deepchecks_monitoring.integrations.email import EmailSender

if t.TYPE_CHECKING:
    from deepchecks_monitoring.resources import ResourcesProvider
    from deepchecks_monitoring.utils import ExtendedAsyncSession

__all__ = ["AsyncSessionDep", "limit_request_size", "KafkaAdminDep", "SettingsDep", "DataIngestionDep",
           "CacheFunctionsDep", "ResourcesProviderDep"]


async def get_async_session(request: fastapi.Request) -> t.AsyncIterator["ExtendedAsyncSession"]:
    """Get async sqlalchemy session instance.

    Parameters
    ----------
    request : fastapi.Request
        request instance

    Returns
    -------
    AsyncIterator[AsyncSession]
        async sqlalchemy session instance
    """
    resources_provider = t.cast("ResourcesProvider", request.app.state.resources_provider)
    async with resources_provider.create_async_database_session() as session:
        yield session


def get_kafka_admin(request: fastapi.Request) -> t.Optional[KafkaAdminClient]:
    resources_provider = t.cast("ResourcesProvider", request.app.state.resources_provider)
    return resources_provider.kafka_admin


def get_settings(request: fastapi.Request) -> BaseSettings:
    state = request.app.state
    return state.settings


def get_data_ingestion_backend(request: fastapi.Request):
    state = request.app.state
    return state.data_ingestion_backend


def get_cache_functions(request: fastapi.Request):
    state = request.app.state
    return state.resources_provider.cache_functions


def get_s3_bucket(request: fastapi.Request) -> str:
    settings = request.app.state.settings
    return settings.get_deepchecks_bucket()


def get_host(request: fastapi.Request) -> str:
    settings = request.app.state.settings
    return settings.host


def get_resources_provider(request: fastapi.Request) -> "ResourcesProvider":
    return t.cast("ResourcesProvider", request.app.state.resources_provider)


AsyncSessionDep = fastapi.Depends(get_async_session)
KafkaAdminDep = fastapi.Depends(get_kafka_admin)
SettingsDep = fastapi.Depends(get_settings)
DataIngestionDep = fastapi.Depends(get_data_ingestion_backend)
CacheFunctionsDep = fastapi.Depends(get_cache_functions)
ResourcesProviderDep = fastapi.Depends(get_resources_provider)
S3BucketDep = fastapi.Depends(get_s3_bucket)
HostDep = fastapi.Depends(get_host)

# Examples of how to use those dependencies:
#
# >>> class PersonCreationSchema(pydantic.BaseModel):
# ...    name: str
# ...    age: int
# ...    last_name: str = ""
#
# >>> @router.post("/person", status_code=http_status.HTTP_201_CREATED)
# ... async def create_person_entity(
# ...    person: PersonCreationSchema,
# ...    session: AsyncSession = AsyncSessionDep  # < Session dependency
# ... ):
# ...     statement = Person.insert().returning(Person.id)
# ...     result = await session.execute(statement, person.dict())
# ...     await session.commit()


def limit_request_size(size: int) -> t.Callable[[Request], None]:
    """Return a dependency function which validates content size is limited to the given size in bytes.

    Parameters
    ----------
    size: int
        Maximum size for the http content in bytes

    Returns
    -------
    Request
    """
    def dependency(request: Request):
        if "content-length" not in request.headers:
            raise ContentLengthRequired("Content-length header value is required")

        try:
            content_length = int(request.headers["content-length"])
        except ValueError:
            raise BadRequest("Content-length header value must be an integer")  # pylint: disable=raise-missing-from

        if content_length > size:
            mb = size / (1024 * 1024)
            raise RequestTooLarge(f"Maximum allowed content-length is {mb} MB")

    return dependency


def get_feature_flag(name: str) -> t.Callable[[Request], FeatureFlag]:
    """Return feature flag dependency resolver."""
    def dependency_resolver(request: Request) -> FeatureFlag:
        return _get_feature_flag(name=name, app=request.app)
    return dependency_resolver


def _get_feature_flag(name: str, app: FastAPI) -> FeatureFlag:
    """Return feature flag with given name otherwise raise an error."""
    if not hasattr(app.state, "feature_flags"):
        raise RuntimeError()  # TODO: message
    feature_flags = t.cast(
        t.Dict[str, FeatureFlag],
        app.state.feature_flags
    )
    if name not in feature_flags:
        raise RuntimeError(f"Unknown feature flag - {name}")
    return feature_flags[name]


def with_feature_flag(
    name: str,
    exception: t.Optional[BaseHTTPException] = None
):
    """Return feature flag dependency resolver.

    Parameters
    ----------
    name : str
        name of a feature flag
    exception : Optional[BaseHTTPException] , default None
        an exception to raise if feature flag was resolved
        to a not 'truthy' value

    Returns
    -------
    Callable[[Request], None]
    """
    def dependency_resolver(request: Request):
        feature_flag = _get_feature_flag(name=name, app=request.app)
        flag = feature_flag.resolve(request=request)  # TODO: current user entity also should be passed

        if isinstance(flag, bool):
            if flag is False:
                raise exception or NotFound("resource not found")
        elif isinstance(flag, Variation):
            if isinstance(flag.value, bool):
                if flag.value is False:
                    raise exception or NotFound("resource not found")
            else:
                raise TypeError(
                    "Do not know how to interpretate variation with "
                    f"a value of type - {type(flag.value).__name__}. "
                    f"Flag name - {name}"
                )
        else:
            raise TypeError(
                f"Unsupported type of flag - {type(flag)}. "
                f"Flag name - {name}"
            )
    return dependency_resolver


def get_oauth_resource(request: fastapi.Request) -> t.Callable[[Request], authlib.integrations.starlette_client.OAuth]:
    """Return OAuth resource dependency resolver."""
    resources_provider = t.cast("ResourcesProvider", request.app.state.resources_provider)  # noqa: F821
    return resources_provider.oauth_client


def get_email_sender_resource(request: fastapi.Request) -> EmailSender:
    """Return email sender resource dependency resolver."""
    resources_provider = t.cast("ResourcesProvider", request.app.state.resources_provider)  # noqa: F821
    return resources_provider.email_sender
