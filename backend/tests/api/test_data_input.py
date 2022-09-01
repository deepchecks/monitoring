# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pendulum as pdl
import pytest
from deepdiff import DeepDiff
from fastapi.testclient import TestClient
from sqlalchemy import select

from deepchecks_monitoring.models import ModelVersion
from tests.conftest import send_reference_request


@pytest.mark.asyncio
async def test_log_data(client: TestClient, classification_model_version_id: int):
    request = [{
        "_dc_sample_id": "a000",
        "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
        "_dc_prediction_value": [0.1, 0.3, 0.6],
        "_dc_prediction_label": "2",
        "a": 11.1,
        "b": "ppppp",
    }]
    response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_log_data_different_columns_in_samples(client: TestClient, classification_model_version_id: int):
    request = [
        {
            "_dc_sample_id": "a000",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "a": 11.1,
            "b": "ppppp",
            "c": 11
        },
        {
            "_dc_sample_id": "a001",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "a": 11.1,
            "b": "ppppp"
        }
    ]
    response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_data(client: TestClient, classification_model_version_id: int):
    request = [{
        "_dc_sample_id": "a000",
        "_dc_label": "1",
        "c": 0
    }]
    response = client.put(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
    assert response.status_code == 200, response.json()


@pytest.mark.asyncio
async def test_get_schema(client: TestClient, classification_model_version_id: int):
    response = client.get(f"/api/v1/model-versions/{classification_model_version_id}/schema")
    assert response.status_code == 200
    assert response.json() == {
        "properties": {
            "_dc_label": {"type": ["string", "null"]},
            "_dc_prediction_label": {"type": "string"},
            "_dc_prediction_value": {"items": {"type": "number"}, "type": ["array", "null"]},
            "_dc_sample_id": {"type": "string"},
            "_dc_time": {"format": "datetime", "type": "string"},
            "a": {"type": ["number", "null"]},
            "b": {"type": ["string", "null"]},
            "c": {"type": ["number", "null"]}
        },
        "required": ["a", "b", "_dc_sample_id", "_dc_time", "_dc_prediction_label"],
        "type": "object"
    }


@pytest.mark.asyncio
async def test_send_reference_features(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"a": 11.1, "b": "ppppp", "_dc_prediction_label": "1"}
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_features_and_labels(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction_label": "1"}
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_features_and_non_features(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"a": 11.1, "b": "ppppp", "c": 42, "_dc_prediction_label": "1"}
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_too_many_samples(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"a": 11.1, "b": "ppppp", "_dc_prediction_label": "1"}
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100_001)
    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Maximum number of samples allowed for reference is 100,000 but got: 100001"}


@pytest.mark.asyncio
async def test_send_reference_twice(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"a": 11.1, "b": "ppppp", "_dc_prediction_label": "1"}
    # Act
    send_reference_request(client, classification_model_version_id, [sample] * 100)
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Already have reference data"}


@pytest.mark.asyncio
async def test_send_reference_too_large(client: TestClient, classification_model_version_id: int):
    # Act
    response = client.post(
        f"/api/v1/model-versions/{classification_model_version_id}/reference",
        headers={"content-length": "500000001"})

    # Assert
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_statistics(client: TestClient, classification_model_version_id: int, async_session):
    # Arrange
    request = [
        {
            "_dc_sample_id": "1",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "a": 11.1,
            "b": "cat",
        },
        {
            "_dc_sample_id": "2",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "a": -1,
            "b": "something",
        },
        {
            "_dc_sample_id": "3",
            "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "a": 3,
            "b": "cat",
        }
    ]

    # Act
    client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
    # Assert
    query = await async_session.execute(select(ModelVersion).where(ModelVersion.id == classification_model_version_id))
    model_version = query.scalar()
    diff = DeepDiff(model_version.statistics, {
        "a": {"max": 11.1, "min": -1},
        "b": {"values": ["something", "cat"]},
        "c": {"max": None, "min": None},
        "_dc_label": {"values": []},
        "_dc_prediction_label": {"values": ["2"]}
    }, ignore_order=True)
    assert not diff

    # Test update
    # Arrange
    request = [
        {
            "_dc_sample_id": "1",
            "_dc_label": "2",
            "c": 100
        }
    ]
    # Act
    client.put(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)

    await async_session.refresh(model_version)
    diff = DeepDiff(model_version.statistics, {
        "a": {"max": 11.1, "min": -1},
        "b": {"values": ["something", "cat"]},
        "c": {"max": 100, "min": 100},
        "_dc_label": {"values": ["2"]},
        "_dc_prediction_label": {"values": ["2"]}
    }, ignore_order=True)
    assert not diff
