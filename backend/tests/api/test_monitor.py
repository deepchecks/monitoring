# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import datetime

import pendulum as pdl
import pytest
from fastapi.testclient import TestClient

from deepchecks_monitoring.monitoring_utils import fetch_or_404
from deepchecks_monitoring.schema_models.monitor import Monitor
from tests.conftest import add_alert_rule, add_classification_data


def add_monitor(classification_model_check_id, client: TestClient, dashboard_id=None) -> int:
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400,
        "data_filters": {"filters": [{
            "column": "c",
            "operator": "greater_than",
            "value": 10
        }]}
    }
    if dashboard_id is not None:
        request["dashboard_id"] = dashboard_id
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    return response.json()["id"]


@pytest.mark.asyncio
async def test_add_monitor_no_filter(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400,
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_add_monitor_month_schedule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400 * 30,
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1
    monitor: Monitor = await fetch_or_404(async_session, Monitor, id=1)

    assert pdl.instance(monitor.scheduling_start).int_timestamp % monitor.frequency == 0


@pytest.mark.asyncio
async def test_add_monitor_day_schedule(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400 * 2,
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1
    monitor: Monitor = await fetch_or_404(async_session, Monitor, id=1)

    assert pdl.instance(monitor.scheduling_start).int_timestamp % monitor.frequency == 0


@pytest.mark.asyncio
async def test_add_monitor_day_schedule_from_version(classification_model_check_id,
                                                     classification_model_version_id,
                                                     client: TestClient, async_session):
    # Arrange
    add_classification_data(classification_model_version_id, client)
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400 * 2,
    }
    # Act
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/monitors", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1
    monitor: Monitor = await fetch_or_404(async_session, Monitor, id=1)
    # model version data was day before
    now = datetime.datetime.now() - datetime.timedelta(days=1)
    assert pdl.instance(monitor.scheduling_start) < pdl.instance(now)
    assert pdl.instance(monitor.scheduling_start).int_timestamp % monitor.frequency == 0


@pytest.mark.asyncio
async def test_add_monitor_with_feature(classification_model_check_id, client: TestClient):
    # Arrange
    request = {
        "name": "monitory",
        "lookback": 86400 * 7,
        "aggregation_window": 86400 * 30,
        "frequency": 86400,
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
        "aggregation_window": 86400 * 30,
        "frequency": 86400,
        "data_filters": {"filters": [{
            "operator": "contains",
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
    # create dashboard
    response = client.get("/api/v1/dashboards/")
    assert response.status_code == 200

    monitor_id = add_monitor(classification_model_check_id, client, dashboard_id=1)
    add_alert_rule(monitor_id, client)
    # Act
    response = client.get(f"/api/v1/monitors/{monitor_id}")
    assert response.json() == {"id": 1, "name": "monitory", "dashboard_id": 1,
                               "lookback": 86400 * 7, "aggregation_window": 86400 * 30,
                               "data_filters": {"filters": [{"column": "c", "operator": "greater_than", "value": 10}]},
                               "check": {"config": {"class_name": "SingleDatasetPerformance",
                                                    "module_name": "deepchecks.tabular.checks",
                                                    "params": {}},
                                         "id": 1, "model_id": 1, "name": "check"},
                               "description": "", "additional_kwargs": None,
                               "frequency": 86400,
                               "alert_rules": [
                                   {
                                       "alert_severity": "low",
                                       "condition": {"operator": "greater_than", "value": 100.0},
                                       "id": 1,
                                       "monitor_id": 1,
                                       "is_active": True
                                   }
                               ]}


@pytest.mark.asyncio
async def test_remove_monitor(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    # Act
    response = client.delete(f"/api/v1/monitors/{monitor_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_monitor(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    monitor: Monitor = await fetch_or_404(async_session, Monitor, id=monitor_id)
    latest_schedule = monitor.scheduling_start
    await Monitor.update(async_session, monitor_id, {"latest_schedule": monitor.scheduling_start})
    await async_session.commit()
    await async_session.refresh(monitor)

    request = {
        "data_filters": {"filters": [{
            "operator": "contains",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    # Act
    response = client.put(f"/api/v1/monitors/{monitor_id}", json=request)
    assert response.status_code == 200
    await async_session.refresh(monitor)
    # assert latest_schedule after update is 10 windows earlier
    assert latest_schedule - pdl.instance(monitor.latest_schedule) == pdl.duration(seconds=monitor.frequency * 10)


@pytest.mark.asyncio
async def test_update_monitor_freq(classification_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    monitor: Monitor = await fetch_or_404(async_session, Monitor, id=monitor_id)
    latest_schedule = monitor.scheduling_start + datetime.timedelta(seconds=10)

    await Monitor.update(async_session, monitor_id, {"latest_schedule": latest_schedule})
    await async_session.commit()
    await async_session.refresh(monitor)

    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency != 0

    response = client.put(f"/api/v1/monitors/{monitor_id}", json={"frequency": 86400 * 30})

    assert response.status_code == 200
    await async_session.refresh(monitor)
    assert monitor.frequency == 86400 * 30
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0


@pytest.mark.asyncio
async def test_run_monitor(classification_model_check_id, classification_model_version_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    add_classification_data(classification_model_version_id, client)
    # Act
    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": pdl.now().isoformat()})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_run_monitor_invalid_end_time(classification_model_check_id, client: TestClient):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    # Act
    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": "13000000"})
    assert response.status_code == 422
