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

from deepchecks_monitoring.schema_models.alert_rule import AlertRule, AlertSeverity
from tests.conftest import add_alert, add_alert_rule, add_monitor


@pytest.mark.asyncio
async def test_add_alert_rule_no_feature(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    request = {
        "condition": {
            "operator": "greater_than",
            "value": 100
        },
        "alert_severity": "low"
    }
    # Act
    response = client.post(f"/api/v1/monitors/{monitor_id}/alert-rules", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_alert_rule_with_feature(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    request = {
        "condition": {
            "operator": "greater_than",
            "value": 100,
        },
        "alert_severity": "low"
    }
    # Act
    response = client.post(f"/api/v1/monitors/{monitor_id}/alert-rules", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_get_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client)
    # Act
    response = client.get(f"/api/v1/alert-rules/{alert_rule_id}")
    assert response.json() == {
        "id": 1,
        "monitor_id": 1,
        "condition": {"operator": "greater_than", "value": 100.0},
        "alert_severity": "low",
        "is_active": True
    }


@pytest.mark.asyncio
async def test_remove_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client)
    # Act
    response = client.delete(f"/api/v1/alert-rules/{alert_rule_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_alert_rule(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client)
    request = {
        "condition": {"operator": "greater_than", "value": -0.1}
    }
    # Act
    response = client.put(f"/api/v1/alert-rules/{alert_rule_id}", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_count_alert_rule(
    classification_model_check_id,
    regression_model_check_id,
    client: TestClient
):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    add_alert_rule(monitor_id, client)
    add_alert_rule(monitor_id, client)
    monitor_id = add_monitor(regression_model_check_id, client)
    add_alert_rule(monitor_id, client)
    # Act
    response = client.get("/api/v1/alert-rules/count")
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 3


@pytest.mark.asyncio
async def test_count_single_model(
    classification_model_check_id,
    regression_model_check_id,
    client: TestClient
):
    # Arrange
    monitor_id_1 = add_monitor(classification_model_check_id, client)
    add_alert_rule(monitor_id_1, client)
    add_alert_rule(monitor_id_1, client)
    add_alert_rule(monitor_id_1, client)

    monitor_id_2 = add_monitor(regression_model_check_id, client)
    add_alert_rule(monitor_id_2, client)

    # Act
    response = client.get(f"/api/v1/models/{monitor_id_1}/alert-rules/count")

    # Assert
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 3

    # Act
    response = client.get(f"/api/v1/models/{monitor_id_2}/alert-rules/count")

    # Assert
    assert response.status_code == 200
    assert response.json()[AlertSeverity.LOW.value] == 1


@pytest.mark.asyncio
async def test_get_alert_rules(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)

    alert_rule_id = add_alert_rule(monitor_id, client, alert_severity=AlertSeverity.LOW.value)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    alert_rule_id = add_alert_rule(monitor_id, client, alert_severity=AlertSeverity.MID.value)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()
    # Act
    response = client.get("/api/v1/alert-rules")
    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 2,
            "monitor_id": 1,
            "condition": {"operator": "greater_than", "value": 100.0},
            "alert_severity": "mid",
            "model_id": 1,
            "alerts_count": 2,
            "max_end_time": "1970-01-19T12:26:40+00:00",
            "is_active": True
        },
        {
            "id": 1,
            "monitor_id": 1,
            "condition": {"operator": "greater_than", "value": 100.0},
            "alert_severity": "low",
            "model_id": 1,
            "alerts_count": 1,
            "max_end_time": "1970-01-19T12:26:40+00:00",
            "is_active": True
        }
    ]


@pytest.mark.asyncio
async def test_get_all_alerts_of_alert_rule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(
        monitor_id,
        client,
        alert_severity=AlertSeverity.LOW.value,
    )

    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()

    # Act
    response = client.get(f"/api/v1/alert-rules/{alert_rule_id}/alerts")
    assert len(response.json()) == 3, response.json()


@pytest.mark.asyncio
async def test_resolve_all_alerts_of_alert_rule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(
        monitor_id,
        client,
        alert_severity=AlertSeverity.LOW.value,
    )

    alert1 = add_alert(alert_rule_id, async_session, resolved=False)
    alert2 = add_alert(alert_rule_id, async_session, resolved=False)
    alert3 = add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()

    # Act
    response = client.post(f"/api/v1/alert-rules/{alert_rule_id}/resolve-all")

    # Assert
    assert response.status_code == 200
    await async_session.refresh(alert1)
    await async_session.refresh(alert2)
    await async_session.refresh(alert3)
    assert alert1.resolved is True
    assert alert2.resolved is True
    assert alert3.resolved is True


@pytest.mark.asyncio
async def test_reactivate_alert_rule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client, is_active=False)
    alert_rule = (await AlertRule.filter_by(async_session, id=alert_rule_id)).scalar()

    request = {
        "is_active": True
    }
    # Act
    client.put(f"/api/v1/alert-rules/{alert_rule_id}", json=request)
    # Assert
    await async_session.refresh(alert_rule)
    assert alert_rule.is_active is True
