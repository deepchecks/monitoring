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
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.schema_models.dashboard import Dashboard
from tests.api.test_monitor import add_monitor


@pytest.mark.asyncio
async def test_get_dashboard_empty(classification_model_feature_check_id, client: TestClient):
    resp_json = client.get('/api/v1/dashboards/').json()
    assert classification_model_feature_check_id == 1
    assert resp_json['id'] == 1
    assert len(resp_json['monitors']) == 0


@pytest.mark.asyncio
async def test_add_dashboard_monitor(classification_model_feature_check_id, client: TestClient, async_session):
    response = client.get('/api/v1/dashboards/')

    assert response.json() == {'id': 1, 'name': None, 'monitors': []}
    assert add_monitor(classification_model_feature_check_id, client) == 1

    response = client.put('/api/v1/monitors/1', json={'dashboard_id': 1})
    assert response.status_code == 200

    # assert monitor was added
    dashboard_results = await async_session.execute(select(Dashboard).options(selectinload(Dashboard.monitors)))
    dashboard: Dashboard = dashboard_results.scalars().first()
    assert len(dashboard.monitors) == 1
    assert dashboard.monitors[0].id == 1


@pytest.mark.asyncio
async def test_remove_dashboard(client: TestClient):
    # Arrange
    client.get('/api/v1/dashboards/')
    # Act
    response = client.delete('/api/v1/dashboards/1')
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_dashboard(client: TestClient):
    client.get('/api/v1/dashboards/')
    response = client.put('/api/v1/dashboards/1', json={'name': 'dashy'})
    assert response.status_code == 200
