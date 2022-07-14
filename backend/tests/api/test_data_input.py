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
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_log_data(client: TestClient, classification_model_version_1: int):
    request = {
        "_dc_sample_id": "a000",
        "_dc_time": pdl.datetime(2020, 1, 1, 0, 0, 0).isoformat(),
        "_dc_prediction_value": [0.1, 0.3, 0.6],
        "_dc_prediction_label": "2",
        "a": 11.1,
        "b": "ppppp",
    }
    response = client.post(f"/api/v1/data/{classification_model_version_1}/log", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_data(client: TestClient, classification_model_version_1: int):
    request = {
        "_dc_sample_id": "a000",
        "_dc_label": "1",
        "c": 0
    }
    response = client.post(f"/api/v1/data/{classification_model_version_1}/update", json=request)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_schema(client: TestClient, classification_model_version_1: int):
    response = client.get(f"/api/v1/data/{classification_model_version_1}/schema")
    assert response.status_code == 200
    assert response.json() == {
        "properties": {
            "_dc_label": {"type": "string"},
            "_dc_prediction_label": {"type": "string"},
            "_dc_prediction_value": {"items": {"type": "number"}, "type": "array"},
            "_dc_sample_id": {"type": "string"},
            "_dc_time": {"format": "datetime", "type": "string"},
            "a": {"type": "number"},
            "b": {"type": "string"},
            "c": {"type": "number"}
        },
        "required": ["a", "b", "_dc_sample_id", "_dc_time"],
        "type": "object"
    }
