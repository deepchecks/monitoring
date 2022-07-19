# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pandas as pd
import pendulum as pdl
import pytest
from fastapi.testclient import TestClient


def send_reference_request(client, model_version_id, dicts: list):
    df = pd.DataFrame(data=dicts)
    data = df.to_json(orient="table", index=False)

    return client.post(
        f"/api/v1/data/{model_version_id}/reference",
        files={
            "file": ("data.json", data),
        })


@pytest.mark.asyncio
async def test_log_data(client: TestClient, classification_model_version_1: int):
    request = {
        "_dc_sample_id": "a000",
        "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
        "_dc_prediction_value": [0.1, 0.3, 0.6],
        "_dc_prediction_label": "2",
        "a": 11.1,
        "b": "ppppp",
    }
    response = client.post(f"/api/v1/data/{classification_model_version_1}/log", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_data(client: TestClient, classification_model_version_1: int):
    request = {
        "_dc_sample_id": "a000",
        "_dc_label": "1",
        "c": 0
    }
    response = client.post(f"/api/v1/data/{classification_model_version_1}/update", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_schema(client: TestClient, classification_model_version_1: int):
    response = client.get(f"/api/v1/model_version/{classification_model_version_1}/schema")
    assert response.status_code == 200
    assert response.json() == {
        "properties": {
            "_dc_label": {"type": "string"},
            "_dc_prediction_label": {"type": "string"},
            "_dc_prediction_value": {"items": {"type": "number"}, "type": "array"},
            "_dc_sample_id": {"type": "string"},
            "_dc_time": {"format": "datetime", "type": "string"},
            "a": {"type": "number"},
            "b": {"type": "string"},
            "c": {"type": "number"}
        },
        "required": ["a", "b", "_dc_sample_id", "_dc_time"],
        "type": "object"
    }


@pytest.mark.asyncio
async def test_send_reference_features(client: TestClient, classification_model_version_1: int):
    # Arrange
    sample = {
        "a": 11.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_1, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_features_and_labels(client: TestClient, classification_model_version_1: int):
    # Arrange
    sample = {
        "_dc_label": "2",
        "a": 11.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_1, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_features_and_non_features(client: TestClient, classification_model_version_1: int):
    # Arrange
    sample = {
        "a": 11.1,
        "b": "ppppp",
        "c": 42
    }
    # Act
    response = send_reference_request(client, classification_model_version_1, [sample] * 100)
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_send_reference_too_many_samples(client: TestClient, classification_model_version_1: int):
    # Arrange
    sample = {
        "a": 11.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_1, [sample] * 100_001)
    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Maximum number of samples allowed for reference is 100,000 but got: 100001"}


@pytest.mark.asyncio
async def test_send_reference_twice(client: TestClient, classification_model_version_1: int):
    # Arrange
    sample = {
        "a": 11.1,
        "b": "ppppp",
    }
    # Act
    send_reference_request(client, classification_model_version_1, [sample] * 100)
    response = send_reference_request(client, classification_model_version_1, [sample] * 100)
    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Already have reference data"}


@pytest.mark.asyncio
async def test_send_reference_too_large(client: TestClient, classification_model_version_1: int):
    # Act
    response = client.post(
        f"/api/v1/data/{classification_model_version_1}/reference",
        headers={"content-length": "500000001"})

    # Assert
    assert response.status_code == 413
