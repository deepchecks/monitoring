import typing as t

import pytest
import pytest_asyncio
import testing.postgresql
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.models.base import Base


@pytest.fixture(
    params=[
        pytest.param(("asyncio", {"use_uvloop": True}), id="asyncio+uvloop"),
    ]
)
def anyio_backend(request):
    return request.param


@pytest_asyncio.fixture()
async def engine():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        async_url = postgres.url().replace('postgresql', 'postgresql+asyncpg')
        engine = create_async_engine(async_url, future=True, echo=True)

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        yield engine
        await engine.dispose()


@pytest.fixture()
def application(engine):
    application = create_application(database_engine=engine)
    # async def override_get_db():
    #     TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    #     async with TestingSessionLocal() as session:
    #         try:
    #             yield session
    #             await session.commit()
    #         except Exception:
    #             await session.rollback()
    #         finally:
    #             await session.close()
    # application.dependency_overrides[AsyncSessionDep.dependency] = override_get_db
    return application


@pytest_asyncio.fixture()
async def client(application) -> t.AsyncIterator[AsyncClient]:
    async with AsyncClient(
        app=application,
        base_url="http://testserver",
        headers={"Content-Type": "application/json"},
    ) as client:
        yield client
