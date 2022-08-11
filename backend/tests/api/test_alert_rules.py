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

from deepchecks_monitoring.models.alert_rule import AlertSeverity
from tests.api.test_alerts import add_alert
from tests.conftest import add_alert_rule


@pytest.mark.asyncio
async def test_add_alert_rule_no_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400,
        "repeat_every": 86400,
        "condition": {
            "operator": "greater_than",
            "value": 100
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alert_rules", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_alert_rule_with_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400,
        "repeat_every": 86400,
        "condition": {
            "operator": "greater_than",
            "value": 100,
            "feature": "some_feature"
        }
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alert_rules", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_alert_rule_with_data_filter(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "alerty",
        "lookback": 86400,
        "repeat_every": 86400,
        "condition": {
            "operator": "greater_than",
            "value": 100,
            "feature": "some_feature"
        },
        "data_filters": {"filters": [{
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/alert_rules", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_get_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    alert_rule_id = add_alert_rule(classification_model_check_id, client)
    # Act
    response = client.get(f"/api/v1/alert_rules/{alert_rule_id}")
    assert response.json() == {"id": 1, "name": "alerty", "check_id": 1, "lookback": 86400, "repeat_every": 86400,
                               "condition": {"feature": None, "operator": "greater_than", "value": 100.0},
                               "description": "", "data_filters": None, "alert_severity": "low"}


@pytest.mark.asyncio
async def test_remove_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    alert_rule_id = add_alert_rule(classification_model_check_id, client)
    # Act
    response = client.delete(f"/api/v1/alert_rules/{alert_rule_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    alert_rule_id = add_alert_rule(classification_model_check_id, client)
    request = {
        "data_filters": {"filters": [{
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    # Act
    response = client.put(f"/api/v1/alert_rules/{alert_rule_id}", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_count_alert_rule(
        classification_model_check_id,
        regression_model_check_id,
        client: TestClient):
    # Arrange
    add_alert_rule(classification_model_check_id, client)
    add_alert_rule(classification_model_check_id, client)
    add_alert_rule(regression_model_check_id, client)
    # Act
    response = client.get("/api/v1/alert_rules/count")
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 3


@pytest.mark.asyncio
async def test_count_single_model(
        classification_model_check_id,
        regression_model_check_id,
        client: TestClient):
    # Arrange
    add_alert_rule(classification_model_check_id, client)
    add_alert_rule(classification_model_check_id, client)
    add_alert_rule(classification_model_check_id, client)
    add_alert_rule(regression_model_check_id, client)
    # Act
    response = client.get(f"/api/v1/models/{classification_model_check_id}/alert_rules/count")
    # Assert
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 3
    # Act
    response = client.get(f"/api/v1/models/{regression_model_check_id}/alert_rules/count")
    # Assert
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 1


@pytest.mark.asyncio
async def test_get_alert_rules(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    alert_rule_id = add_alert_rule(classification_model_check_id, client, alert_severity=AlertSeverity.LOW)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    alert_rule_id = add_alert_rule(classification_model_check_id, client, alert_severity=AlertSeverity.MID)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()
    # Act
    response = client.get("/api/v1/alert_rules/")
    # Assert
    assert response.status_code == 200
    assert response.json() == [{"alert_severity": "low", "alerts_count": 1, "check_id": 1,
                                "condition": {"feature": None, "operator": "greater_than", "value": 100.0},
                                "data_filters": None, "description": "", "id": 1, "lookback": 86400, "name": "alerty",
                                "repeat_every": 86400},
                               {"alert_severity": "mid", "alerts_count": 2, "check_id": 1,
                                "condition": {"feature": None, "operator": "greater_than", "value": 100.0},
                                "data_filters": None, "description": "", "id": 2, "lookback": 86400, "name": "alerty",
                                "repeat_every": 86400}]
