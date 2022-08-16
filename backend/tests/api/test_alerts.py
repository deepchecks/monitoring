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
from tests.conftest import add_alert, add_alert_rule, add_monitor


async def add_alerts_of_2_rules(check_id, client, async_session):
    monitor_id = add_monitor(check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client, alert_severity=AlertSeverity.LOW.value)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    alert_rule_id = add_alert_rule(monitor_id, client, alert_severity=AlertSeverity.MID.value)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()
    return alert_rule_id


@pytest.mark.asyncio
async def test_count_active_alerts(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    await add_alerts_of_2_rules(classification_model_check_id, client, async_session)
    # Act
    response = client.get("/api/v1/alerts/count_active")
    # Assert
    assert response.status_code == 200
    assert response.json() == {"low": 1, "mid": 2}


@pytest.mark.asyncio
async def test_get_alerts_of_alert_rule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    alert_rule_id = await add_alerts_of_2_rules(classification_model_check_id, client, async_session)
    # Act
    response = client.get(f"/api/v1/alert-rules/{alert_rule_id}/alerts")
    # Assert
    assert response.status_code == 200
    assert len(response.json()) == 3


@pytest.mark.asyncio
async def test_resolve_alert(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    alert_rule_id = add_alert_rule(monitor_id, client, alert_severity=AlertSeverity.LOW.value)
    alert = add_alert(alert_rule_id, async_session, resolved=False)
    await async_session.commit()
    await async_session.refresh(alert)
    # Act
    response = client.post(f"/api/v1/alerts/{alert.id}/resolve")
    # Assert
    assert response.status_code == 200
    await async_session.refresh(alert)
    assert alert.resolved is True
