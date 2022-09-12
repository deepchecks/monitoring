# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pytest
from fastapi.testclient import TestClient
from tests.conftest import send_reference_request, add_classification_data


@pytest.mark.asyncio
async def test_add_model_version(classification_model_id, client: TestClient):
    # Arrange
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
            "y": "categorical",
            "w": "boolean"
        },
        "non_features": {
            "a": "numeric",
            "b": "text"
        }
    }

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_another_model_version(classification_model_id, classification_model_version_id, client: TestClient):
    # Arrange
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
            "y": "categorical",
            "w": "boolean"
        },
        "non_features": {
            "a": "numeric",
            "b": "text"
        }
    }

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 200
    assert response.json()["id"] != classification_model_version_id


@pytest.mark.asyncio
async def test_get_model_version_same_features(classification_model_id,
                                               classification_model_version_id, client: TestClient):
    # Arrange
    request = {
        "name": "v1",
        "features": {"a": "numeric", "b": "categorical"},
        "feature_importance": {"a": 0.1, "b": 0.5},
        "non_features": {"c": "numeric"}
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.json() == {"id": classification_model_version_id}


# pylint: disable=W0613 # noqa
@pytest.mark.asyncio
async def test_get_model_version_different_features(classification_model_id,
                                                    classification_model_version_id, client: TestClient):
    # Arrange
    request = {
        "name": "v1",
        "features": {"d": "numeric", "b": "categorical"},
        "non_features": {"c": "numeric"}
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 400
    assert response.content == \
        b'{"detail":"A model version with the name \\"v1\\" already exists but with different features"}'


@pytest.mark.asyncio
async def test_count_tables(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1"}
    send_reference_request(client, classification_model_version_id, [sample] * 100)
    add_classification_data(classification_model_version_id, client)
    # Act
    response = client.get(f"/api/v1/model-versions/{classification_model_version_id}/count-samples")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"monitor_count": 5, "reference_count": 100}
