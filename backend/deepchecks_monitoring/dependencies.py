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

import fastapi
from fastapi import Request

from deepchecks_monitoring.exceptions import BadRequest, ContentLengthRequired, RequestTooLarge

if t.TYPE_CHECKING:
    from deepchecks_monitoring.app import ResourcesProvider
    from deepchecks_monitoring.utils import ExtendedAsyncSession

__all__ = ["AsyncSessionDep", "limit_request_size"]


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


AsyncSessionDep = fastapi.Depends(get_async_session)


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
