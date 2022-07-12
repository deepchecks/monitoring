# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

#  pylint: disable=redefined-outer-name
import asyncio
import typing as t

import pytest
import pytest_asyncio
import testing.postgresql
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from deepchecks_monitoring.api.v1.model import create_model
from deepchecks_monitoring.app import create_application, json_serializer
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.models import TaskType
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.schemas.model import ModelSchema


@pytest.fixture(scope="session")
def postgres():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        yield postgres


@pytest.fixture(scope="session")
def application(postgres):
    database_uri = postgres.url()
    async_database_uri = postgres.url().replace("postgresql", "postgresql+asyncpg")
    settings = Settings(database_uri=database_uri, async_database_uri=async_database_uri)  # type: ignore
    app = create_application(settings=settings)
    return app


@pytest.fixture(scope="session")
def event_loop() -> t.Generator:
    """Fix run time error "Attached to a different loop"...
    Taken from https://rogulski.it/blog/sqlalchemy-14-async-orm-with-fastapi/
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def async_engine(postgres: testing.postgresql.Postgresql) -> t.AsyncIterator[AsyncEngine]:
    url = postgres.url().replace("postgresql", "postgresql+asyncpg")
    engine = create_async_engine(url, echo=True, json_serializer=json_serializer)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture()
async def async_session(async_engine: AsyncEngine):
    """Get async sqlalchemy session instance."""
    async with AsyncSession(async_engine) as session:
        try:
            yield session
            await session.commit()
        except BaseException as error:
            await session.rollback()
            raise error
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def reset_database(async_engine):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.commit()


@pytest.fixture()
def client(application) -> t.Iterator[TestClient]:
    with TestClient(app=application, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture()
async def classification_model(async_session):
    schema = ModelSchema(name="classification model", description="test", task_type=TaskType.CLASSIFICATION)
    return await create_model(schema, async_session)
