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
import random
import string
import typing as t
from unittest import mock
from unittest.mock import patch

import dotenv
import fakeredis
import httpx
import numpy as np
import pandas as pd
import pendulum as pdl
import pytest
import pytest_asyncio
import randomname
import testing.postgresql
import torch
from deepchecks.vision import ClassificationData, DetectionData
from deepchecks_client import DeepchecksClient
from deepchecks_client.core.api import API
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from torch.utils.data import DataLoader
from torch.utils.data import Dataset as TorchDataset

from deepchecks_monitoring.app import create_application
from deepchecks_monitoring.bgtasks.core import Base as TasksBase
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.models import Alert, Model, TaskType
from deepchecks_monitoring.models.alert_rule import AlertSeverity
from deepchecks_monitoring.models.base import Base
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import ExtendedAsyncSession, json_dumps

dotenv.load_dotenv()


@pytest.fixture(scope="function")
def redis():
    yield mock.Mock(wraps=fakeredis.FakeStrictRedis())


@pytest.fixture(scope="session")
def postgres():
    with testing.postgresql.Postgresql(port=7654) as postgres:
        yield postgres


@pytest.fixture(scope="function")
def settings(postgres):
    database_uri = postgres.url()
    yield Settings(database_uri=database_uri)


@pytest.fixture(scope="function")
def resources_provider(settings, redis):
    with patch.object(ResourcesProvider, "redis_client", redis):
        yield ResourcesProvider(settings)


@pytest.fixture(scope="function")
def application(resources_provider, settings):
    yield create_application(resources_provider=resources_provider, settings=settings)


@pytest.fixture(scope="session")
def event_loop():
    """Fix run time error "Attached to a different loop"...
    Taken from https://rogulski.it/blog/sqlalchemy-14-async-orm-with-fastapi/
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine(postgres: testing.postgresql.Postgresql) -> t.AsyncIterator[AsyncEngine]:
    url = postgres.url().replace("postgresql", "postgresql+asyncpg")
    engine = create_async_engine(url, echo=False, json_serializer=json_dumps)
    yield engine
    await engine.dispose()


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


@pytest_asyncio.fixture(scope="function", autouse=True)
async def reset_database(async_engine):
    async with async_engine.begin() as conn:
        # First remove ORM tables
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(TasksBase.metadata.drop_all)

        # Second, remove generated tables (leftovers)
        def drop_all_tables(c):
            inspector = inspect(c)
            for table in inspector.get_table_names():
                Table(table, MetaData()).drop(c)

        await conn.run_sync(drop_all_tables)
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(TasksBase.metadata.create_all)
        await conn.commit()


@pytest.fixture()
def client(application) -> t.Iterator[TestClient]:
    with TestClient(app=application, base_url="http://test/") as client:
        yield client


@pytest.fixture()
def deepchecks_sdk_client(client: TestClient):
    # pylint: disable=super-init-not-called
    api = API(session=client)
    return DeepchecksClient(api=api)


@pytest.fixture()
# pylint: disable=unused-argument
def multiclass_model_version_client(classification_model_id,
                                    classification_model_version_id,
                                    deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    return model_client.version("v1")


@pytest.fixture()
# pylint: disable=unused-argument
def regression_model_version_client(regression_model_id,
                                    regression_model_version_id,
                                    deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="regression model",
                                                             task_type=TaskType.REGRESSION.value)
    return model_client.version("v1")


@pytest.fixture()
# pylint: disable=unused-argument
def vision_classification_model_version_client(classification_vision_model_id,
                                               classification_vision_model_version_id,
                                               deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="vision classification model",
                                                             task_type=TaskType.VISION_CLASSIFICATION.value)
    return model_client.version("v1")


@pytest.fixture()
# pylint: disable=unused-argument
def detection_vision_model_version_client(detection_vision_model_id,
                                          detection_vision_model_version_id,
                                          deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="vision detection model",
                                                             task_type=TaskType.VISION_DETECTION.value)
    return model_client.version("v1")


@pytest_asyncio.fixture()
async def classification_model_id(async_session: AsyncSession):
    model = Model(name="classification model", description="test", task_type=TaskType.MULTICLASS)
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
async def regression_model_version_id(regression_model_id: int, client):
    request = {
        "name": "v1",
        "features": {"a": "numeric", "b": "categorical"},
        "feature_importance": {"a": 0.1, "b": 0.5},
        "additional_data": {"c": "numeric"}
    }
    response = client.post(f"/api/v1/models/{regression_model_id}/version", json=request)
    return response.json()["id"]


@pytest_asyncio.fixture()
async def classification_model_version_id(classification_model_id: int, client):
    request = {
        "name": "v1",
        "features": {"a": "numeric", "b": "categorical"},
        "feature_importance": {"a": 0.1, "b": 0.5},
        "additional_data": {"c": "numeric"},
        "classes": ["0", "1", "2"]
    }
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)
    return response.json()["id"]


@pytest_asyncio.fixture()
async def detection_vision_model_version_id(detection_vision_model_id: int, client):
    request = {
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
        "additional_data": {}
    }
    response = client.post(f"/api/v1/models/{detection_vision_model_id}/version", json=request)
    return response.json()["id"]


@pytest_asyncio.fixture()
async def classification_vision_model_version_id(classification_vision_model_id: int, client):
    request = {
        "name": "v1",
        "features": {"images Aspect Ratio": "numeric",
                     "images Area": "numeric",
                     "images Brightness": "numeric",
                     "images RMS Contrast": "numeric",
                     "images Mean Red Relative Intensity": "numeric",
                     "images Mean Blue Relative Intensity": "numeric",
                     "images Mean Green Relative Intensity": "numeric",
                     },
        "additional_data": {}
    }
    response = client.post(f"/api/v1/models/{classification_vision_model_id}/version", json=request)
    return response.json()["id"]


@pytest_asyncio.fixture()
async def classification_vision_model_version_w_label_map_id(classification_vision_model_id: int, client):
    request = {
        "name": "v1",
        "label_map": {0: "ahh", 1: "ooh", 2: "wee"},
        "features": {"images Aspect Ratio": "numeric",
                     "images Area": "numeric",
                     "images Brightness": "numeric",
                     "images RMS Contrast": "numeric",
                     "images Mean Red Relative Intensity": "numeric",
                     "images Mean Blue Relative Intensity": "numeric",
                     "images Mean Green Relative Intensity": "numeric",
                     },
        "additional_data": {}
    }
    response = client.post(f"/api/v1/models/{classification_vision_model_id}/version", json=request)
    return response.json()["id"]


@pytest_asyncio.fixture()
async def classification_model_version_no_fi_id(classification_model_id: int, client: TestClient):
    response = client.post(
        f"/api/v1/models/{classification_model_id}/version",
        json={
            "name": "v1",
            "features": {"a": "numeric", "b": "categorical"},
            "additional_data": {"c": "numeric"},
            "classes": ["0", "1", "2"]
        }
    )
    return response.json()["id"]


@pytest_asyncio.fixture()
async def classification_model_check_id(classification_model_id: int, client: TestClient) -> int:
    return t.cast(int, add_check(
        model_id=classification_model_id,
        client=client,
        name="check",
        config={
            "class_name": "SingleDatasetPerformance",
            "params": {},
            "module_name": "deepchecks.tabular.checks"
        }
    ))


@pytest_asyncio.fixture()
async def classification_model_check_train_test_id(classification_model_id: int, client: TestClient) -> int:
    return t.cast(int, add_check(
        model_id=classification_model_id,
        client=client,
        name="check train test",
        config={
            "class_name": "TrainTestLabelDrift",
            "params": {},
            "module_name": "deepchecks.tabular.checks"
        }
    ))


@pytest_asyncio.fixture()
async def classification_model_feature_check_id(classification_model_id: int, client: TestClient) -> int:
    return t.cast(int, add_check(
        model_id=classification_model_id,
        client=client,
        name="check",
        config={
            "class_name": "CategoryMismatchTrainTest",
            "params": {},
            "module_name": "deepchecks.tabular.checks"
        }
    ))


@pytest_asyncio.fixture()
async def classification_vision_model_property_check_id(
        classification_vision_model_id: int,
        client: TestClient
) -> int:
    return t.cast(int, add_check(
        model_id=classification_vision_model_id,
        client=client,
        name="check",
        config={
            "class_name": "ImagePropertyDrift",
            "params": {},
            "module_name": "deepchecks.vision.checks"
        }
    ))


@pytest_asyncio.fixture()
async def classification_vision_performance_check_id(
        classification_vision_model_id: int,
        client: TestClient
) -> int:
    return t.cast(int, add_check(
        model_id=classification_vision_model_id,
        client=client,
        name="check",
        config={
            "class_name": "SingleDatasetPerformance",
            "params": {},
            "module_name": "deepchecks.vision.checks"
        }
    ))


@pytest_asyncio.fixture()
async def regression_model_check_id(regression_model_id: int, client: TestClient) -> int:
    return t.cast(int, add_check(
        model_id=regression_model_id,
        client=client,
        name="check",
        config={
            "class_name": "TrainTestPerformance",
            "params": {"reduce": "mean"},
            "module_name": "deepchecks.tabular.checks"
        }
    ))


def add_alert(alert_rule_id, async_session: AsyncSession, resolved=True):
    dt = pdl.from_timestamp(1600000)

    alert = Alert(failed_values={"v1": {"Accuracy": 0.3}},
                  alert_rule_id=alert_rule_id, start_time=dt, end_time=dt, resolved=resolved)
    async_session.add(alert)
    return alert


def random_string(n=5):
    return "".join(
        random.choice(string.ascii_lowercase)
        for it in range(n)
    )


def add_check(
        model_id: int,
        client: TestClient,
        expected_status_code: int = 200,
        name: t.Optional[str] = None,
        config: t.Optional[t.Dict[str, t.Any]] = None
) -> t.Union[int, httpx.Response]:
    payload = {}
    payload["name"] = name or randomname.get_name()
    payload["config"] = config or {
        "class_name": "SingleDatasetPerformance",
        "params": {"scorers": ["accuracy", "f1_macro"]},
        "module_name": "deepchecks.tabular.checks"
    }

    response = client.post(
        f"/api/v1/models/{model_id}/checks",
        json=payload
    )

    if not 200 <= expected_status_code <= 299:
        assert response.status_code == expected_status_code, (response.status_code, response.json())
        return response

    assert response.status_code == expected_status_code, (response.status_code, response.content, response.json())

    data = response.json()[0]
    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int)
    # TODO: verify whether check was actually created
    return data["id"]


def add_model(
        client: TestClient,
        expected_status_code: int = 200,
        name: t.Optional[str] = None,
        task_type: t.Optional[TaskType] = None,
        description: t.Optional[str] = None,
) -> t.Union[httpx.Response, int]:
    payload = {}
    payload["name"] = name or randomname.get_name()
    payload["task_type"] = (task_type or random.choice(list(TaskType))).value
    payload["description"] = description or ""

    response = client.post("/api/v1/models", json=payload)

    if not 200 <= expected_status_code <= 299:
        assert response.status_code == expected_status_code, (response.status_code, response.json())
        return response

    assert response.status_code == expected_status_code

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data, data
    return data["id"]


def add_model_version(
        model_id: int,
        client: TestClient,
        expected_status_code: int = 200,
        name: t.Optional[str] = None,
        features: t.Optional[t.Dict[str, str]] = None,
        additional_data: t.Optional[t.Dict[str, str]] = None,
        feature_importance: t.Optional[t.Dict[str, float]] = None,
        classes: t.Optional[t.List[str]] = None
) -> t.Union[int, httpx.Response]:
    payload = {}
    payload["name"] = name or randomname.get_name()
    payload["features"] = features if features is not None else {"a": "numeric", "b": "categorical"}
    payload["additional_data"] = additional_data if additional_data is not None else {"c": "numeric"}
    payload["feature_importance"] = feature_importance
    payload["classes"] = classes

    response = client.post(f"/api/v1/models/{model_id}/version", json=payload)

    if not 200 <= expected_status_code <= 299:
        assert response.status_code == expected_status_code, (response.status_code, response.json())
        return response

    assert response.status_code == expected_status_code

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int)
    # TODO: verify whether version was actually created
    return data["id"]


def add_alert_rule(
        monitor_id: int,
        client: TestClient,
        expected_status_code: int = 200,
        **kwargs
) -> t.Union[int, httpx.Response]:
    request = {
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


def add_monitor(check_id: int, client: TestClient, **kwargs):
    request = {
        "name": "monitor",
        "frequency": 86400,
        "lookback": 3600 * 24
    }
    request.update(kwargs)
    if "aggregation_window" not in request:
        request["aggregation_window"] = request["lookback"] / 12
    response = client.post(f"/api/v1/checks/{check_id}/monitors", json=request)
    return response.json()["id"]


def add_classification_data(
        model_version_id: int,
        client: TestClient,
        daterange: t.Optional[t.Sequence[pdl.DateTime]] = None,
        id_prefix: str = "",
        is_labeled: bool = True,
        with_proba: bool = True,
        samples_per_date: int = 1
):
    if daterange is None:
        curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
        day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
        daterange = [day_before_curr_time.add(hours=hours) for hours in [1, 3, 4, 5, 7]]

    data = []

    for i, date in enumerate(daterange):
        time = date.isoformat()
        label = ("2" if i != 1 else "1") if is_labeled else None
        for j in range(samples_per_date):
            time = date.isoformat()
            label = ("2" if i != 1 else "1") if is_labeled else None
            sample = {
                "_dc_sample_id": f"{id_prefix}{i}_{j}",
                "_dc_time": time,
                "_dc_prediction": "2" if i % 2 else "1",
                "_dc_label": label,
                "a": 10 + i * j,
                "b": "ppppp",
            }
            if with_proba:
                sample["_dc_prediction_probabilities"] = [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3]
            data.append(sample)

    resp = client.post(f"/api/v1/model-versions/{model_version_id}/data", json=data)
    return resp, daterange[0], daterange[-1]


def add_vision_classification_data(model_version_id, client: TestClient):
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    data = []
    for i, hour in enumerate([1, 3, 7, 13]):
        time = day_before_curr_time.add(hours=hour).isoformat()
        for j in range(10):
            data.append({
                "_dc_sample_id": f"{i} {j}",
                "_dc_time": time,
                "_dc_prediction": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
                "_dc_label": j % 2,
                "images Aspect Ratio": 0.677 / hour,
                "images Area": 0.5,
                "images Brightness": 0.5,
                "images RMS Contrast": 0.5,
                "images Mean Red Relative Intensity": 0.5,
                "images Mean Blue Relative Intensity": 0.5,
                "images Mean Green Relative Intensity": 0.5,
            })
    resp = client.post(f"/api/v1/model-versions/{model_version_id}/data", json=data)
    return resp, day_before_curr_time, curr_time


def send_reference_request(client, model_version_id, dicts: list):
    df = pd.DataFrame(data=dicts)
    data = df.to_json(orient="table", index=False)
    return client.post(
        f"/api/v1/model-versions/{model_version_id}/reference",
        files={"batch": ("data.json", data.encode())}
    )


def _batch_collate(batch):
    imgs, labels = zip(*batch)
    return list(imgs), list(labels)


class _VisionDataset(TorchDataset):
    """Simple dataset class to supply labels."""

    def __init__(self, imgs, labels) -> None:
        self.labels = labels
        self.imgs = imgs

    def __getitem__(self, index) -> torch.Tensor:
        """Get labels by index."""
        return self.imgs[index], self.labels[index]

    def __len__(self) -> int:
        """Get length by the amount of labels."""
        return len(self.labels)


class _MyClassificationVisionData(ClassificationData):
    def batch_to_labels(self, batch) -> torch.Tensor:
        return torch.IntTensor(batch[1])

    def batch_to_images(self, batch):
        return batch[0]


class _MyDetectionVisionData(DetectionData):
    def batch_to_labels(self, batch) -> t.List[torch.Tensor]:
        tens_list = []
        for arr in batch[1]:
            tens_list.append(torch.Tensor(arr))
        return tens_list

    def batch_to_images(self, batch):
        return batch[0]


@pytest_asyncio.fixture()
def vision_classification_and_prediction():
    imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
            np.array([[[1, 3, 5]]]),
            np.array([[[7, 9, 0], [9, 6, 0]]])]
    labels = [2, 0, 1]
    predictions = {0: [0.1, 0.3, 0.6], 1: [0.6, 0.3, 0.1], 2: [0.1, 0.6, 0.3]}
    data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
    return _MyClassificationVisionData(data_loader), predictions


@pytest_asyncio.fixture()
def vision_classification_and_prediction_big():
    imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
            np.array([[[1, 3, 5]]]),
            np.array([[[7, 9, 0], [9, 6, 0]]])] * 50
    labels = [2, 0, 1] * 50
    predictions = dict(enumerate([[0.1, 0.3, 0.6], [0.6, 0.3, 0.1], [0.1, 0.6, 0.3]] * 50))
    data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=8,
                             collate_fn=_batch_collate, shuffle=False)
    return _MyClassificationVisionData(data_loader), predictions


@pytest_asyncio.fixture()
def vision_classification_and_list_prediction():
    imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
            np.array([[[1, 3, 5]]]),
            np.array([[[7, 9, 0], [9, 6, 0]]])]
    labels = [2, 0, 1]
    predictions = [[0.1, 0.3, 0.6], [0.6, 0.3, 0.1], [0.1, 0.6, 0.3]]
    data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
    return _MyClassificationVisionData(data_loader), predictions


@pytest_asyncio.fixture()
def vision_detection_and_prediction_raw():
    imgs = [np.array([[[1, 2, 0], [3, 4, 0]]]),
            np.array([[[1, 3, 5]]]),
            np.array([[[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                      [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                      [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                      [[7, 9, 0], [9, 6, 0], [9, 6, 0]]])]
    labels = [[[1, 0, 0, 1, 1]], [[0, 0, 0, 1, 1]], [[2, 0, 0, 2, 2]]]
    predictions = {0: [[0, 0, 1, 1, 0.6, 2]], 1: [[0, 0, 1, 1, 0.6, 2]], 2: [[0, 0, 2, 2, 0.6, 2]]}
    return imgs, labels, predictions


@pytest_asyncio.fixture()
def vision_detection_and_prediction(vision_detection_and_prediction_raw):
    imgs, labels, predictions = vision_detection_and_prediction_raw
    data_loader = DataLoader(_VisionDataset(imgs, labels), batch_size=len(labels), collate_fn=_batch_collate)
    return _MyDetectionVisionData(data_loader), predictions
