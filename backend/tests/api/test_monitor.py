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


def add_monitor(classification_model_check_id, client: TestClient) -> int:
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "data_filters": {"filters": [{
            "column": "c",
            "operator": "greater_than",
            "value": 10
        }]}
    }
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    return response.json()["id"]


@pytest.mark.asyncio
async def test_add_monitor_no_filter(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_monitor_with_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "monitor_rule": {
            "operator": "greater_than",
            "value": 100,
            "feature": "some_feature"
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_monitor_with_data_filter(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "data_filters": {"filters": [{
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_get_monitor(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    # Act
    response = client.get(f"/api/v1/monitors/{monitor_id}")
    assert response.json() == {"id": 1, "name": "monitory", "dashboard_id": None, "lookback": 86400 * 7,
                               "data_filters": {"filters": [{"column": "c", "operator": "greater_than", "value": 10}]},
                               "check": {"config": {"class_name": "PerformanceReport",
                                                    "module_name": "deepchecks.tabular.checks",
                                                    "params": {"reduce": "mean"}},
                                         "id": 1, "model_id": 1, "name": "check"},
                               "description": ""}


@ pytest.mark.asyncio
async def test_remove_monitor(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    # Act
    response = client.delete(f"/api/v1/monitors/{monitor_id}")
    assert response.status_code == 200


@ pytest.mark.asyncio
async def test_update_monitor(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    request = {
        "data_filters": {"filters": [{
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    # Act
    response = client.put(f"/api/v1/monitors/{monitor_id}", json=request)
    assert response.status_code == 200
