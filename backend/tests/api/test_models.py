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


@pytest.mark.asyncio
async def test_add_model(client: TestClient):
    response = client.post("/api/v1/models", json={"name": "44", "task_type": "classification"})
    assert response.status_code == 200
    assert response.json() == {"id": 1}

    response = client.get("/api/v1/models/")
    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json[0] == {"id": 1, "name": "44", "task_type": "classification", "description": None}


@pytest.mark.asyncio
async def test_get_columns_model(classification_model_id, classification_model_version_id, client: TestClient):
    response = client.get(f"/api/v1/models/{classification_model_id}/columns")
    assert classification_model_version_id == 1
    assert response.status_code == 200
    assert response.json() == {"a": {"type": "numeric", "values": [-9999999, 999999]},
                               "b": {"type": "categorical", "values": ["a", "b", "c"]},
                               "c": {"type": "numeric", "values": [-9999999, 999999]}}
