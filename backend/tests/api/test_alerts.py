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


@pytest.mark.asyncio
async def test_count_active_alerts(classification_model_check_id, client: TestClient, async_session):
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
    response = client.get("/api/v1/alerts/count_active")
    # Assert
    assert response.status_code == 200
    assert response.json() == {"low": 1, "mid": 2}

