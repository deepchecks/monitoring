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

from tests.api.test_data_input import send_reference_request


@pytest.mark.asyncio
async def test_add_check(classification_model_id, client: TestClient):
    # Arrange
    request = {
        "name": "checky",
        "config": {"class_name": "PerformanceReport",
                   "params": {"reduce": "mean"},
                   "module_name": "deepchecks.tabular.checks"
        },
    }

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/check", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1

@pytest.mark.asyncio
async def test_run_check(classification_model_id, classification_model_version_id, client: TestClient):
    request = {
        "name": "checky",
        "config": {"class_name": "PerformanceReport",
                    "params": {"reduce": "mean"},
                    "module_name": "deepchecks.tabular.checks"
        },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/check", json=request)
    times = []
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0) - pdl.duration(days=1)
    for i in [1, 3, 7, 13]:
        time = curr_time.add(hours=i)
        times.append(time)
        request = {
            "_dc_sample_id": str(i),
            "_dc_time": time.isoformat(),
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "_dc_label": "2",
            "a": 10 + i,
            "b": "ppppp",
        }
        response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
    sample = {
        "_dc_prediction_value": [0.1, 0.3, 0.6],
        "_dc_prediction_label": "2",
        "_dc_label": "2",
        "a": 11.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    times_in_iso = [time.isoformat() for time in times]
    response = client.get("/api/v1/checks/1/run/86400/")
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]) == 24
    assert set(times_in_iso).issubset(set(json_rsp["time_labels"]))
    assert len([out for out in json_rsp["output"] if out is not None]) == 4
