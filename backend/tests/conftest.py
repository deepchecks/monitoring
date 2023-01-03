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
import os
import random
import string
import subprocess
import typing as t
from unittest import mock
from unittest.mock import patch

import dotenv
import faker
import pytest
import pytest_asyncio
import testing.postgresql
from deepchecks_client import DeepchecksClient
from deepchecks_client.core.api import API
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import RedisDsn
from redis.client import Redis
from sqlalchemy.engine.url import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.future import Engine, create_engine
from sqlalchemy.orm import sessionmaker

from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession
from deepchecks_monitoring.public_models.base import Base as PublicModelsBase
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import TaskType
from tests.common import Payload, TestAPI, generate_user
from tests.utils import TestDatabaseGenerator, create_dummy_smtp_server

dotenv.load_dotenv()


ROWS_PER_MINUTE_LIMIT = 1000


@pytest.fixture(scope="session")
def postgres():
    if (uri := os.environ.get("TESTS_DATABASE_URI")) is not None:
        yield uri
    else:
        with testing.postgresql.Postgresql(port=7654) as postgres:
            yield postgres


@pytest.fixture(scope="session")
def event_loop():
    """Fix run time error "Attached to a different loop"...
    Taken from https://rogulski.it/blog/sqlalchemy-14-async-orm-with-fastapi/
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def system_database_engine(postgres: t.Union[str, testing.postgresql.Postgresql]) -> t.Iterator[Engine]:
    """Create tests template database and system level engine.

    NOTE:
    This fixture is not intended to be used by tests.
    """
    url = postgres if isinstance(postgres, str) else postgres.url()
    url = t.cast(URL, make_url(url))

    engine = create_engine(
        url.set(
            drivername="postgresql",
            database="postgres"
        ),
        echo=False,
        execution_options={"isolation_level": "AUTOCOMMIT"}
    )

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(scope="session")
def database_generator(system_database_engine: Engine) -> t.Iterator[TestDatabaseGenerator]:
    """Return tests databases generator.

    NOTE:
    This fixture is not intended to be used by tests.
    """
    with TestDatabaseGenerator(
        engine=system_database_engine,
        template_metadata=PublicModelsBase.metadata,
        keep_copy="KEEP_TEST_DATABASES" in os.environ,
        keep_template="KEEP_TEMPlATE_DATABASE" in os.environ,
    ) as g:
        yield g


@pytest_asyncio.fixture(scope="function")
async def async_engine(database_generator: TestDatabaseGenerator) -> t.AsyncIterator[AsyncEngine]:
    """Create copy of a template database for test function and return async engine for it."""
    # TODO:
    # check whether it is possible to obtain a name of a
    # test function that executed this fixture
    test_database_name = f"test_{random_string()}"
    async with database_generator.copy_template(test_database_name) as test_database_engine:
        yield test_database_engine


# @pytest_asyncio.fixture(scope="function")
# async def async_engine(postgres: testing.postgresql.Postgresql) -> t.AsyncIterator[AsyncEngine]:
#     url = postgres.url().replace("postgresql", "postgresql+asyncpg")
#     engine = create_async_engine(url, echo=False, json_serializer=json_dumps)
#     yield engine
#     await engine.dispose()


# @pytest_asyncio.fixture(scope="function", autouse=True)
# async def reset_database(async_engine):
#     async with async_engine.begin() as conn:
#         def clean_schemas(c):
#             inspector = inspect(c)
#             for schema in inspector.get_schema_names():
#                 if schema in ['public', 'information_schema']:
#                     continue
#                 DropSchema(schema, cascade=True).execute(c)

#         def clean_enums(c):
#             inspector = inspect(c)
#             for enum in inspector.get_enums():
#                 c.execute(text(f'drop type {enum["name"]} cascade'))

#         await conn.run_sync(clean_schemas)
#         await conn.run_sync(clean_enums)
#         await conn.run_sync(PublicModelsBase.metadata.drop_all)
#         # await conn.run_sync(TasksBase.metadata.drop_all)

#         await conn.run_sync(PublicModelsBase.metadata.create_all)
#         # await conn.run_sync(TasksBase.metadata.create_all)
#         await conn.commit()


@pytest_asyncio.fixture()
async def async_session(async_engine: AsyncEngine):
    """Get async sqlalchemy session instance."""
    session_factory = sessionmaker(
        async_engine,
        class_=ExtendedAsyncSession,
        expire_on_commit=False
    )
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as error:
            await session.rollback()
            raise error
        finally:
            await session.close()


@pytest.fixture(scope="function")
def smtp_server():
    with create_dummy_smtp_server() as server:
        yield server


@pytest.fixture(scope="session")
def redis_url():
    if (uri := os.environ.get("TESTS_REDIS_URI")) is not None:
        yield uri
    else:
        with subprocess.Popen(["redis-server", "--port", "6380"]) as p:
            yield "redis://localhost:6380/0"
            p.kill()


@pytest.fixture(scope="function")
def redis_client(redis_url: str):
    with Redis.from_url(redis_url) as r:
        yield r
        r.flushdb()


@pytest.fixture(scope="function")
def settings(async_engine, smtp_server, redis_client):
    redis_config = t.cast(t.Dict[str, t.Any], redis_client.get_connection_kwargs())
    return Settings(
        assets_folder="",
        database_uri=str(async_engine.url.set(drivername="postgresql")),  # type: ignore
        email_smtp_host=smtp_server.hostname,
        email_smtp_port=smtp_server.port,
        slack_client_id="",
        slack_client_secret="",
        slack_scopes="chat:write,incoming-webhook",
        host="http://localhost",
        email_smtp_username="",
        email_smtp_password="",
        oauth_domain="",
        oauth_client_id="",
        oauth_client_secret="",
        auth_jwt_secret="secret",
        redis_uri=t.cast(RedisDsn, RedisDsn.build(
            scheme="redis",
            host=redis_config["host"],
            port=str(redis_config["port"]),
            path="/" + str(redis_config["db"])
        )),
        kafka_host=None,
    )


@pytest.fixture(scope="session")
def launchdarkly_mock():
    def replacement_func(flag, *args, **kwargs):  # pylint: disable=unused-argument
        if flag == "rows-per-minute":
            return ROWS_PER_MINUTE_LIMIT
        if flag == "signUpEnabled":
            return True
        return
    return mock.Mock(side_effect=replacement_func)


@pytest.fixture(scope="function")
def resources_provider(settings, launchdarkly_mock):
    patch.object(ResourcesProvider, "launchdarkly_variation", launchdarkly_mock).start()
    yield ResourcesProvider(settings)


@pytest_asyncio.fixture(scope="function")
async def application(
    resources_provider: ResourcesProvider,
    settings: Settings
) -> FastAPI:
    """Create application instance."""
    return create_application(
        resources_provider=resources_provider,
        settings=settings
    )


@pytest_asyncio.fixture(scope="function", autouse=True)
async def user(async_session: AsyncSession, settings):
    return await generate_user(
        async_session,
        with_org=True,
        switch_schema=True,
        auth_jwt_secret=settings.auth_jwt_secret
    )


@pytest_asyncio.fixture(scope="function")
async def client(application: FastAPI, user) -> t.AsyncIterator[TestClient]:
    """Create 'TestClient' instance."""
    with TestClient(app=application, base_url="http://test.com",) as client:
        client.headers["Authorization"] = f"Bearer {user.access_token}"
        yield client


@pytest_asyncio.fixture(scope="function")
async def unauthorized_client(application: FastAPI) -> t.AsyncIterator[TestClient]:
    """Create 'TestClient' instance."""
    with TestClient(app=application, base_url="http://test.com") as client:
        yield client


@pytest.fixture(scope="session")
def faker_instance() -> faker.Faker:
    return faker.Faker()


@pytest.fixture(scope="function")
def deepchecks_api(client: TestClient):
    return API(session=client)


@pytest.fixture(scope="function")
def test_api(deepchecks_api: API):
    return TestAPI(api=deepchecks_api)


@pytest.fixture(scope="function")
def deepchecks_sdk(deepchecks_api: API):
    return DeepchecksClient(api=deepchecks_api)


@pytest.fixture()
# pylint: disable=unused-argument
def multiclass_model_version_client(
    classification_model: Payload,
    classification_model_version: Payload,
    deepchecks_sdk: DeepchecksClient
):
    return deepchecks_sdk.get_or_create_model(
        name="Classification Model",
        task_type=TaskType.MULTICLASS.value
    ).version("v1")


@pytest.fixture()
# pylint: disable=unused-argument
def regression_model_version_client(
    regression_model: Payload,
    regression_model_version: Payload,
    deepchecks_sdk: DeepchecksClient
):
    return deepchecks_sdk.get_or_create_model(
        name="Regression Model",
        task_type=TaskType.REGRESSION.value
    ).version("v1")


@pytest_asyncio.fixture()
def classification_model(test_api: TestAPI) -> t.Dict[str, t.Any]:
    model = test_api.create_model(model={
        "name": "Classification Model",
        "task_type": TaskType.MULTICLASS.value,
        "description": "test"
    })
    return t.cast(t.Dict[str, t.Any], model)


@pytest_asyncio.fixture()
def regression_model(test_api: TestAPI) -> t.Dict[str, t.Any]:
    return t.cast(
        t.Dict[str, t.Any],
        test_api.create_model(model={
            "name": "Regression Model",
            "task_type": TaskType.REGRESSION.value,
            "description": "test"
        })
    )


@pytest_asyncio.fixture()
def regression_model_version(
    test_api: TestAPI,
    regression_model: Payload
) -> Payload:
    return t.cast(Payload, test_api.create_model_version(
        model_id=regression_model["id"],
        model_version={
            "name": "v1",
            "features": {"a": "numeric", "b": "categorical"},
            "feature_importance": {"a": 0.1, "b": 0.5},
            "additional_data": {"c": "numeric"}
        }
    ))


@pytest_asyncio.fixture()
async def classification_model_version(
    test_api: TestAPI,
    classification_model: t.Dict[str, t.Any]
) -> t.Dict[str, t.Any]:
    result = test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={
            "name": "v1",
            "features": {"a": "numeric", "b": "categorical"},
            "feature_importance": {"a": 0.1, "b": 0.5},
            "additional_data": {"c": "numeric"},
            "classes": ["0", "1", "2"]
        }
    )
    return t.cast(t.Dict[str, t.Any], result)


@pytest_asyncio.fixture()
async def detection_model_version(
    test_api: TestAPI,
    detection_model: t.Dict[str, t.Any],
) -> t.Dict[str, t.Any]:
    result = test_api.create_model_version(
        model_id=detection_model["id"],
        model_version={
            "name": "v1",
            "features": {
                "images Aspect Ratio": "numeric",
                "images Area": "numeric",
                "images Brightness": "numeric",
                "images RMS Contrast": "numeric",
                "images Mean Red Relative Intensity": "numeric",
                "images Mean Blue Relative Intensity": "numeric",
                "images Mean Green Relative Intensity": "numeric",
                "partial_images Aspect Ratio": "array_float",
                "partial_images Area": "array_float",
                "partial_images Brightness": "array_float",
                "partial_images RMS Contrast": "array_float",
                "partial_images Mean Red Relative Intensity": "array_float",
                "partial_images Mean Blue Relative Intensity": "array_float",
                "partial_images Mean Green Relative Intensity": "array_float",
            },
            "additional_data": {"is_good": "boolean"}
        }
    )
    return t.cast(t.Dict[str, t.Any], result)


@pytest_asyncio.fixture()
async def classification_model_check(
    test_api: TestAPI,
    classification_model: t.Dict[str, t.Any],
) -> t.Dict[str, t.Any]:
    result = test_api.create_check(
        model_id=classification_model["id"],
        check={
            "name": "Single Dataset Performance For Classification Data",
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    )
    return t.cast(t.Dict[str, t.Any], result)


@pytest_asyncio.fixture()
async def regression_model_check(
    test_api: TestAPI,
    regression_model: t.Dict[str, t.Any],
) -> t.Dict[str, t.Any]:
    result = test_api.create_check(
        model_id=regression_model["id"],
        check={
            "name": "Train-Test Performance For Regression Model",
            "config": {
                "class_name": "TrainTestPerformance",
                "params": {"reduce": "mean"},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    )
    return t.cast(t.Dict[str, t.Any], result)


def random_string(n=5):
    return "".join(
        random.choice(string.ascii_lowercase)
        for it in range(n)
    )
