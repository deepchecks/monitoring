import typing as t

import pytest
import pytest_asyncio
import testing.postgresql
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine

from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.models.base import Base


# @pytest.fixture(
#     params=[
#         pytest.param(("asyncio", {"use_uvloop": True}), id="asyncio+uvloop"),
#     ]
# )
# def anyio_backend(request):
#     return request.param


@pytest.fixture(scope='session')
def postgres():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        yield postgres


@pytest_asyncio.fixture()
async def engine(postgres):
    async_url = postgres.url().replace('postgresql', 'postgresql+asyncpg')
    engine = create_async_engine(async_url, future=True, echo=True)

    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine
    await engine.dispose()


@pytest.fixture()
def application(engine):
    application = create_application(database_engine=engine)
    return application


@pytest.fixture()
def client(application) -> t.Iterator[TestClient]:
    with TestClient(app=application) as client:
        yield client
