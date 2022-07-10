# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the dependencies of the application."""
import typing as t

import fastapi
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker

__all__ = ["AsyncSessionDep"]


async def get_async_session(request: fastapi.Request) -> t.AsyncIterator[AsyncSession]:
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
    engine: t.Optional[AsyncEngine] = request.app.state.async_database_engine
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as sql_ex:
            await session.rollback()
            raise sql_ex
        except HTTPException as http_ex:
            await session.rollback()
            raise http_ex
        finally:
            await session.close()


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
