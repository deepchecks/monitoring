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
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1

    response = client.get(f"/api/v1/models/{classification_model_id}/checks")
    assert response.status_code == 200
    resp_json = response.json()[0]
    assert resp_json["id"] == 1
    assert resp_json["name"] == request["name"]
    assert resp_json["config"] == request["config"]


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
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    assert response.status_code == 200
    request = {
        "name": "checky",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"scorers": ["accuracy"]},
                   "module_name": "deepchecks.tabular.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    assert response.status_code == 200
    times = []
    day_before_curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0) - pdl.duration(days=1)
    for i in [1, 3, 7, 13]:
        time = day_before_curr_time.add(hours=i).isoformat()
        times.append(time)
        request = {
            "_dc_sample_id": str(i),
            "_dc_time": time,
            "_dc_prediction_value": [0.1, 0.3, 0.6],
            "_dc_prediction_label": "2",
            "_dc_label": "2",
            "a": 10 + i,
            "b": "ppppp",
        }
        response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
        assert response.status_code == 201
    sample = {
        "_dc_prediction_value": [0.1, 0.3, 0.6],
        "_dc_prediction_label": "2",
        "_dc_label": "2",
        "a": 16.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    assert response.status_code == 200

    # test no filter
    response = client.post("/api/v1/checks/1/run/lookback", json={"lookback": 86400})
    assert response.status_code == 200
    json_rsp = response.json()
    assert response.status_code == 200
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert set(times).issubset(set(json_rsp["time_labels"]))
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 4

    # test with filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"lookback": 86400,
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 14},
                                            {"column": "b", "operator": "equals", "value": "ppppp"}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 2

    # test with filter no refrence because of filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"lookback": 86400,
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 17}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert json_rsp["output"] == {"1": None}
    # test with filter no refrence because of filter 2
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"lookback": 86400,
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 12},
                                            {"column": "b", "operator": "equals", "value": "pppp"}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert json_rsp["output"] == {"1": None}

    # test with filter on window
    response = client.post("/api/v1/checks/2/run/window",
                           json={"start_time": day_before_curr_time.add(hours=7).isoformat(),
                                 "end_time": day_before_curr_time.add(hours=9).isoformat(),
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 14}]}})
    json_rsp = response.json()
    assert json_rsp == {"1": {"accuracy": 1.0}}
