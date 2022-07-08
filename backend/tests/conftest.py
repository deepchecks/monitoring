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


@pytest.fixture(scope='session')
def application():
    return create_application()    


@pytest.fixture(scope='session')
def engine(application):
    with testing.postgresql.Postgresql(port=7654) as postgres:
        async_url = postgres.url().replace('postgresql', 'postgresql+asyncpg')
        engine = create_async_engine(async_url, future=True, echo=True)
        TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

        async def override_get_db():
            async with TestingSessionLocal() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                finally:
                    await session.close()

        application.dependency_overrides[AsyncSessionDep.dependency] = override_get_db
        yield engine
        # await engine.dispose()


async def start_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def client(engine, application) -> t.AsyncIterator[AsyncClient]:
    async with AsyncClient(
        app=application,
        base_url="http://testserver",
        headers={"Content-Type": "application/json"},
    ) as client:
        await start_db(engine)
        yield client
        # for AsyncEngine created in function scope, close and
        # clean-up pooled connections
        await engine.dispose()
