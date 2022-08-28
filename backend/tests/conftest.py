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

import dotenv
import pendulum as pdl
import pytest
import pytest_asyncio
import testing.postgresql
from fastapi.testclient import TestClient
from requests import Response
from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from deepchecks_monitoring.api.v1.check import CheckCreationSchema, create_check
from deepchecks_monitoring.api.v1.model_version import ModelVersionCreationSchema, create_version
from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.models import Alert, Model, TaskType
from deepchecks_monitoring.models.alert_rule import AlertSeverity
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.utils import json_dumps

dotenv.load_dotenv()


@pytest.fixture(scope="session")
def postgres():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        yield postgres


@pytest.fixture(scope="function")
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


@pytest_asyncio.fixture(scope="function")
async def async_engine(postgres: testing.postgresql.Postgresql) -> t.AsyncIterator[AsyncEngine]:
    url = postgres.url().replace("postgresql", "postgresql+asyncpg")
    engine = create_async_engine(url, echo=True, json_serializer=json_dumps)
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
        # First remove ORM tables
        await conn.run_sync(Base.metadata.drop_all)

        # Second, remove generated tables (leftovers)
        def drop_all_tables(c):
            inspector = inspect(c)
            for table in inspector.get_table_names():
                Table(table, MetaData()).drop(c)

        await conn.run_sync(drop_all_tables)
        await conn.run_sync(Base.metadata.create_all)
        await conn.commit()


@pytest.fixture()
def client(application) -> t.Iterator[TestClient]:
    with TestClient(app=application, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture()
async def classification_model_id(async_session: AsyncSession):
    model = Model(name="classification model", description="test", task_type=TaskType.CLASSIFICATION)
    async_session.add(model)
    await async_session.commit()
    await async_session.refresh(model)
    return model.id


@pytest_asyncio.fixture()
async def classification_vision_model_id(async_session: AsyncSession):
    model = Model(name="vision classification model", description="test", task_type=TaskType.VISION_CLASSIFICATION)
    async_session.add(model)
    await async_session.commit()
    await async_session.refresh(model)
    return model.id


@pytest_asyncio.fixture()
async def detection_vision_model_id(async_session: AsyncSession):
    model = Model(name="vision detection model", description="test", task_type=TaskType.VISION_DETECTION)
    async_session.add(model)
    await async_session.commit()
    await async_session.refresh(model)
    return model.id


@pytest_asyncio.fixture()
async def regression_model_id(async_session: AsyncSession):
    model = Model(name="regression model", description="test", task_type=TaskType.REGRESSION)
    async_session.add(model)
    await async_session.commit()
    await async_session.refresh(model)
    return model.id


@pytest_asyncio.fixture()
async def classification_model_version_id(async_session: AsyncSession, classification_model_id: int):
    schema = ModelVersionCreationSchema(
        name="v1",
        features={"a": "numeric", "b": "categorical"},
        feature_importance={"a": 0.1, "b": 0.5},
        non_features={"c": "numeric"}
    )
    result = await create_version(classification_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


@pytest_asyncio.fixture()
async def detection_vision_model_version_id(async_session: AsyncSession, detection_vision_model_id: int):
    schema = ModelVersionCreationSchema(
        name="v1",
        features={"images Aspect Ratio": "numeric", "partial_images Aspect Ratio": "array_float"},
        non_features={}
    )
    result = await create_version(detection_vision_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


@pytest_asyncio.fixture()
async def classification_vision_model_version_id(async_session: AsyncSession, classification_vision_model_id: int):
    schema = ModelVersionCreationSchema(
        name="v1",
        features={"images Aspect Ratio": "numeric"},
        non_features={}
    )
    result = await create_version(classification_vision_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


@pytest_asyncio.fixture()
async def classification_model_version_no_fi_id(async_session: AsyncSession, classification_model_id: int):
    schema = ModelVersionCreationSchema(
        name="v1",
        features={"a": "numeric", "b": "categorical"},
        non_features={"c": "numeric"}
    )
    result = await create_version(classification_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


@pytest_asyncio.fixture()
async def classification_model_check_id(async_session: AsyncSession, classification_model_id: int):
    schema = CheckCreationSchema(name="check", config={
        "class_name": "PerformanceReport",
        "params": {"reduce": "mean"},
        "module_name": "deepchecks.tabular.checks"
    })

    result = await create_check(classification_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


@pytest_asyncio.fixture()
async def regression_model_check_id(async_session: AsyncSession, regression_model_id: int):
    schema = CheckCreationSchema(name="check", config={
        "class_name": "PerformanceReport",
        "params": {"reduce": "mean"},
        "module_name": "deepchecks.tabular.checks"
    })

    result = await create_check(regression_model_id, schema, async_session)
    await async_session.commit()
    return result["id"]


def add_alert(alert_rule_id, async_session: AsyncSession, resolved=True):
    dt = pdl.from_timestamp(1600000)
    alert = Alert(failed_values={}, alert_rule_id=alert_rule_id, start_time=dt, end_time=dt, resolved=resolved)
    async_session.add(alert)
    return alert


def add_alert_rule(
    monitor_id: int,
    client: TestClient,
    expected_status_code: int = 200,
    **kwargs
) -> t.Union[int, Response]:
    request = {
        "name": "alerty",
        "repeat_every": 86400,
        "alert_severity": AlertSeverity.LOW.value,
        "condition": {
            "operator": "greater_than",
            "value": 100
        }
    }
    request.update(kwargs)
    response = client.post(f"/api/v1/monitors/{monitor_id}/alert-rules", json=request)

    if not 200 <= expected_status_code <= 299:
        assert response.status_code == expected_status_code, (response.status_code, response.json())
        return response

    assert response.status_code == expected_status_code, (response.status_code, response.json())

    data = response.json()
    assert isinstance(data, dict), (response.status_code, data)
    assert "id" in data and isinstance(data["id"], int), (response.status_code, data)

    return data["id"]


def add_monitor(check_id, client: TestClient, **kwargs):
    request = {
        "name": "monitor",
        "lookback": 1000
    }
    request.update(kwargs)
    response = client.post(f"/api/v1/checks/{check_id}/monitors", json=request)
    return response.json()["id"]


def add_classification_data(model_version_id, client: TestClient):
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    data = []
    for i, hours in enumerate([1, 3, 4, 5, 7]):
        time = day_before_curr_time.add(hours=hours).isoformat()
        data.append({
            "_dc_sample_id": str(i),
            "_dc_time": time,
            "_dc_prediction_value": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
            "_dc_prediction_label": "2" if i % 2 else "1",
            "_dc_label": "2",
            "a": 10 + i,
            "b": "ppppp",
        })
    client.post(f"/api/v1/model-versions/{model_version_id}/data", json=data)
