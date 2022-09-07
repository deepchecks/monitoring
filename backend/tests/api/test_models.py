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
import randomname
from deepdiff import DeepDiff
from fastapi.testclient import TestClient

from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.models.alert_rule import AlertSeverity
from tests.conftest import add_alert, add_alert_rule, add_monitor


@pytest.mark.asyncio
async def test_add_model(client: TestClient):
    response = client.post("/api/v1/models", json={"name": "44", "task_type": "classification"})
    assert response.status_code == 200
    assert response.json() == {"id": 1}

    response = client.get("/api/v1/models/")
    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json[0] == {"id": 1, "name": "44", "task_type": "classification", "description": None,
                            "alerts_count": 0, "latest_time": None}


@pytest.mark.asyncio
async def test_get_columns_model(classification_model_id, classification_model_version_id, client: TestClient):
    response = client.get(f"/api/v1/models/{classification_model_id}/columns")
    assert classification_model_version_id == 1
    assert response.status_code == 200
    diff = DeepDiff(response.json(), {
        "a": {"type": "numeric", "stats": {"max": None, "min": None}},
        "b": {"type": "categorical", "stats": {"values": []}},
        "c": {"type": "numeric", "stats": {"max": None, "min": None}}
    },
        ignore_order=True)
    assert not diff


@pytest.mark.asyncio
async def test_get_columns_model_without_versions(classification_model_id, client: TestClient):
    response = client.get(f"/api/v1/models/{classification_model_id}/columns")
    assert response.status_code == 200
    assert response.json() == {}


@pytest.mark.asyncio
async def test_get_models(classification_model_check_id, regression_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    monitor_id_2 = add_monitor(regression_model_check_id, client)

    alert_rule_id = add_alert_rule(monitor_id, client, name=randomname.get_name())
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)

    alert_rule_id = add_alert_rule(monitor_id_2, client, name=randomname.get_name())
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)

    alert_rule_id = add_alert_rule(
        monitor_id_2,
        client,
        alert_severity=AlertSeverity.HIGH.value,
        name=randomname.get_name()
    )
    add_alert(alert_rule_id, async_session, resolved=False)

    await async_session.commit()
    # Act
    response = client.get("/api/v1/models/")
    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "classification model", "description": "test", "task_type": "classification",
         "alerts_count": 1, "latest_time": None},
        {"id": 2, "name": "regression model", "description": "test", "task_type": "regression",
         "alerts_count": 3, "latest_time": None}
    ]


@pytest.mark.asyncio
async def test_get_models_latest_time(classification_model_id, client: TestClient, async_session):
    # Arrange
    time = pdl.now()
    async_session.add(ModelVersion(name="a", end_time=time.subtract(days=1), model_id=classification_model_id))
    async_session.add(ModelVersion(name="b", end_time=time, model_id=classification_model_id))
    async_session.add(ModelVersion(name="c", end_time=time.subtract(days=2), model_id=classification_model_id))
    await async_session.commit()
    # Act
    response = client.get("/api/v1/models/")
    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "classification model", "description": "test", "task_type": "classification",
         "alerts_count": 0, "latest_time": time.int_timestamp},
    ]
