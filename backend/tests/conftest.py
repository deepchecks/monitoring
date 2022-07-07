import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import testing.postgresql
from sqlalchemy.orm import sessionmaker

from deepchecks_api.database import get_db
from deepchecks_api.main import app
from deepchecks_api.models.base import Base


@pytest.fixture(
    params=[
        pytest.param(("asyncio", {"use_uvloop": True}), id="asyncio+uvloop"),
    ]
)
def anyio_backend(request):
    return request.param


@pytest.fixture(scope='session')
def engine():
    postgres = testing.postgresql.Postgresql(port=7654)
    url = "postgresql+asyncpg://postgres@127.0.0.1:7654/test"

    engine = create_async_engine(url, future=True, echo=True)
    TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield engine
    postgres.stop()


async def start_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    # for AsyncEngine created in function scope, close and
    # clean-up pooled connections
    await engine.dispose()


@pytest_asyncio.fixture
async def client(engine) -> AsyncClient:
    async with AsyncClient(
        app=app,
        base_url="http://testserver",
        headers={"Content-Type": "application/json"},
    ) as client:
        await start_db(engine)
        yield client
        # for AsyncEngine created in function scope, close and
        # clean-up pooled connections
        await engine.dispose()
