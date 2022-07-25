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


def add_alert(classification_model_check_id, client: TestClient) -> int:
    request = {
        "name": "alerty",
        "lookback": 86400 * 7,
        "alert_rule": {
            "operator": "greater_than",
            "value": 100
        }
    }
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alerts", json=request)
    return response.json()["id"]


@pytest.mark.asyncio
async def test_add_alert_no_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400 * 7,
        "alert_rule": {
            "operator": "greater_than",
            "value": 100
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alerts", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_alert_with_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400 * 7,
        "alert_rule": {
            "operator": "greater_than",
            "value": 100,
            "feature": "some_feature"
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alerts", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_alert_with_data_filter(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400 * 7,
        "alert_rule": {
            "operator": "greater_than",
            "value": 100,
            "feature": "some_feature"
        },
        "data_filter": {
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alerts", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_get_alert(classification_model_check_id, client: TestClient):
    # Arrange
    alert_id = add_alert(classification_model_check_id, client)
    # Act
    response = client.get(f"/api/v1/alerts/{alert_id}")
    assert response.json() == {"id": 1, "name": "alerty", "check_id": 1, "lookback": 86400 * 7,
                               "alert_rule": {"feature": None, "operator": "greater_than", "value": 100.0},
                               "description": "", "data_filter": None}


@pytest.mark.asyncio
async def test_remove_alert(classification_model_check_id, client: TestClient):
    # Arrange
    alert_id = add_alert(classification_model_check_id, client)
    # Act
    response = client.delete(f"/api/v1/alerts/{alert_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_alert(classification_model_check_id, client: TestClient):
    # Arrange
    alert_id = add_alert(classification_model_check_id, client)
    request = {
        "data_filter": {
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }
    }
    # Act
    response = client.put(f"/api/v1/alerts/{alert_id}", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_count_alerts(
        classification_model_check_id,
        regression_model_check_id,
        client: TestClient):
    # Arrange
    add_alert(classification_model_check_id, client)
    add_alert(classification_model_check_id, client)
    add_alert(regression_model_check_id, client)
    # Act
    response = client.get("/api/v1/alerts/count")
    assert response.status_code == 200
    assert response.json()["count"] == 3


@pytest.mark.asyncio
async def test_count_single_model(
        classification_model_check_id,
        regression_model_check_id,
        client: TestClient):
    # Arrange
    add_alert(classification_model_check_id, client)
    add_alert(classification_model_check_id, client)
    add_alert(classification_model_check_id, client)
    add_alert(regression_model_check_id, client)
    # Act
    response = client.get(f"/api/v1/models/{classification_model_check_id}/alerts/count")
    # Assert
    assert response.status_code == 200
    assert response.json()["count"] == 3
    # Act
    response = client.get(f"/api/v1/models/{regression_model_check_id}/alerts/count")
    # Assert
    assert response.status_code == 200
    assert response.json()["count"] == 1
