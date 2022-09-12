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

from tests.conftest import add_classification_data, add_vision_classification_data, send_reference_request


@pytest.mark.asyncio
async def test_add_check(classification_model_id, client: TestClient):
    # Arrange
    request = {
        "name": "checky v1",
        "config": {"class_name": "SingleDatasetPerformance",
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
async def test_add_check_list(classification_model_id, client: TestClient):
    # Arrange
    confi = {"class_name": "SingleDatasetPerformance",
             "params": {"reduce": "mean"},
             "module_name": "deepchecks.tabular.checks"
             }
    request = [{"name": "checky v1", "config": confi}, {"name": "checky v2", "config": confi}]

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json() == [{"id": 1}, {"id": 2}]


@pytest.mark.asyncio
async def test_metric_check_w_res_conf(classification_model_check_id, classification_model_version_id,
                                       client: TestClient):
    assert add_classification_data(classification_model_version_id, client)[0].status_code == 200
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/run/window",
                           json={"start_time": day_before_curr_time.isoformat(),
                                 "end_time": curr_time.isoformat(),
                                 "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}, "res_conf": ["1"]}})
    assert response.json() == {"1": {"F1 Per Class 1": 0.0}}
    response = client.post(f"/api/v1/checks/{classification_model_check_id}/run/window",
                           json={"start_time": day_before_curr_time.isoformat(),
                                 "end_time": curr_time.isoformat(),
                                 "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}, "res_conf": ["2"]}})
    assert response.json() == {"1": {"F1 Per Class 2": 0.3333333333333333}}


@pytest.mark.asyncio
async def test_metric_check_info_no_model_version(classification_model_check_id, client: TestClient):
    response = client.get(f"/api/v1/checks/{classification_model_check_id}/info")

    assert response.status_code == 200
    assert response.json() == {"check_conf":
                                   [{"is_agg_shown": None,
                                     "type": "scorer",
                                     "values": [{"is_agg": True, "name": "Accuracy"},
                                                {"is_agg": True, "name": "Precision Macro"},
                                                {"is_agg": True, "name": "Recall Macro"},
                                                {"is_agg": False, "name": "Precision Per Class"},
                                                {"is_agg": False, "name": "Recall Per Class"},
                                                {"is_agg": False, "name": "F1 Per Class"},
                                                {"is_agg": False, "name": "Roc Auc Per Class"},
                                                {"is_agg": False, "name": "Fpr Per Class"},
                                                {"is_agg": True, "name": "Fpr Macro"},
                                                {"is_agg": True, "name": "Fpr Micro"},
                                                {"is_agg": True, "name": "Fpr Weighted"},
                                                {"is_agg": False, "name": "Fnr Per Class"},
                                                {"is_agg": True, "name": "Fnr Macro"},
                                                {"is_agg": True, "name": "Fnr Micro"},
                                                {"is_agg": True, "name": "Fnr Weighted"},
                                                {"is_agg": False, "name": "Tnr Per Class"},
                                                {"is_agg": True, "name": "Tnr Macro"},
                                                {"is_agg": True, "name": "Tnr Micro"},
                                                {"is_agg": True, "name": "Tnr Weighted"}]}],
                               "res_conf": {"type": "class", "values": None, "is_agg_shown": False}}


@pytest.mark.asyncio
async def test_metric_check_info_w_model_version(classification_model_check_id, classification_model_version_id,
                                                 client: TestClient):
    add_classification_data(classification_model_version_id, client)
    response = client.get(f"/api/v1/checks/{classification_model_check_id}/info")

    assert response.status_code == 200
    assert response.json()["check_conf"] == [{"is_agg_shown": None,
                                              "type": "scorer",
                                              "values": [{"is_agg": True, "name": "Accuracy"},
                                                         {"is_agg": True, "name": "Precision Macro"},
                                                         {"is_agg": True, "name": "Recall Macro"},
                                                         {"is_agg": False, "name": "Precision Per Class"},
                                                         {"is_agg": False, "name": "Recall Per Class"},
                                                         {"is_agg": False, "name": "F1 Per Class"},
                                                         {"is_agg": False, "name": "Roc Auc Per Class"},
                                                         {"is_agg": False, "name": "Fpr Per Class"},
                                                         {"is_agg": True, "name": "Fpr Macro"},
                                                         {"is_agg": True, "name": "Fpr Micro"},
                                                         {"is_agg": True, "name": "Fpr Weighted"},
                                                         {"is_agg": False, "name": "Fnr Per Class"},
                                                         {"is_agg": True, "name": "Fnr Macro"},
                                                         {"is_agg": True, "name": "Fnr Micro"},
                                                         {"is_agg": True, "name": "Fnr Weighted"},
                                                         {"is_agg": False, "name": "Tnr Per Class"},
                                                         {"is_agg": True, "name": "Tnr Macro"},
                                                         {"is_agg": True, "name": "Tnr Micro"},
                                                         {"is_agg": True, "name": "Tnr Weighted"}]}]
    res_conf_json = response.json()["res_conf"]
    assert res_conf_json["type"] == "class"
    assert res_conf_json["is_agg_shown"] is False
    assert sorted(res_conf_json["values"], key=lambda x: x["name"]) == \
           sorted([{"is_agg": None, "name": "1"}, {"is_agg": None, "name": "2"}], key=lambda x: x["name"])


@pytest.mark.asyncio
async def test_property_check_info(classification_vision_model_property_check_id,
                                   classification_vision_model_version_id,
                                   client: TestClient):
    add_vision_classification_data(classification_vision_model_version_id, client)
    response = client.get(f"/api/v1/checks/{classification_vision_model_property_check_id}/info")

    assert response.status_code == 200
    assert response.json() == {"check_conf":
                                   [{"is_agg_shown": None, "type": "aggregation method",
                                     "values": [{"name": "mean", "is_agg": True},
                                                {"name": "max", "is_agg": True},
                                                {"name": "none", "is_agg": False}]},
                                    {"type": "image property",
                                     "values": [{"is_agg": None, "name": "Aspect Ratio"}], "is_agg_shown": False}],
                               "res_conf": None}


@pytest.mark.asyncio
async def test_feature_check_info(classification_model_feature_check_id, classification_model_version_id,
                                  client: TestClient):
    add_classification_data(classification_model_version_id, client)
    response = client.get(f"/api/v1/checks/{classification_model_feature_check_id}/info")

    assert response.status_code == 200
    assert response.json() == {"check_conf":
                                   [{"is_agg_shown": None, "type": "aggregation method",
                                     "values": [{"name": "mean", "is_agg": True},
                                                {"name": "max", "is_agg": True},
                                                {"name": "none", "is_agg": False},
                                                {"name": "weighted", "is_agg": True},
                                                {"name": "l2_weighted", "is_agg": True}]},
                                    {"type": "feature",
                                     "values": [{"is_agg": None, "name": "a"},
                                                {"is_agg": None, "name": "b"}],
                                     "is_agg_shown": False}],
                               "res_conf": None}


async def run_check(classification_model_id, classification_model_version_id, client: TestClient):
    request = {
        "name": "checky v2",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"reduce": "mean"},
                   "module_name": "deepchecks.tabular.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    assert response.status_code == 200
    request = {
        "name": "checky v3",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"scorers": ["accuracy"]},
                   "module_name": "deepchecks.tabular.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    assert response.status_code == 200
    times = []
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    for i in [1, 3, 7, 13]:
        time = day_before_curr_time.add(hours=i).isoformat()
        times.append(time)
        request = [{
            "_dc_sample_id": str(i),
            "_dc_time": time,
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "_dc_label": "2",
            "a": 10 + i,
            "b": "ppppp",
        }]
        response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
        assert response.status_code == 200
    sample = {
        "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
        "_dc_prediction": "2",
        "_dc_label": "2",
        "a": 16.1,
        "b": "ppppp",
    }
    # Act
    response = send_reference_request(client, classification_model_version_id, [sample] * 100)
    assert response.status_code == 200

    # test no filter
    response = client.post("/api/v1/checks/1/run/lookback", json={"start_time": day_before_curr_time.isoformat(),
                                                                  "end_time": curr_time.isoformat()})
    assert response.status_code == 200
    json_rsp = response.json()
    assert response.status_code == 200
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert set(times).issubset(set(json_rsp["time_labels"]))
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 4

    # test with filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 14},
                                                        {"column": "b", "operator": "contains", "value": "ppppp"}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 2

    # test with filter no reference because of filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 17}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 1
    # test with filter no reference because of filter 2
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 12},
                                                        {"column": "b", "operator": "equals", "value": "pppp"}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 0

    # test with filter on window
    response = client.post("/api/v1/checks/2/run/window",
                           json={"start_time": day_before_curr_time.add(hours=7).isoformat(),
                                 "end_time": day_before_curr_time.add(hours=9).isoformat(),
                                 "filter": {"filters": [{"column": "a", "operator": "greater_than", "value": 14}]},
                                 "additional_kwargs": {"check_conf": {"scorer": ["recall_macro"]}}})
    json_rsp = response.json()
    assert json_rsp == {"1": {"recall_macro": 1.0}}


@pytest.mark.asyncio
async def test_run_check(classification_model_id, classification_model_version_id, client: TestClient):
    await run_check(classification_model_id, classification_model_version_id, client)


@pytest.mark.asyncio
async def test_run_check_no_fi(classification_model_id, classification_model_version_no_fi_id, client: TestClient):
    await run_check(classification_model_id, classification_model_version_no_fi_id, client)


@pytest.mark.asyncio
async def test_run_check_vision(classification_vision_model_id,
                                classification_vision_model_version_id, client: TestClient):
    request = {
        "name": "checky v2",
        "config": {"class_name": "TrainTestPredictionDrift",
                   "params": {},
                   "module_name": "deepchecks.vision.checks"
                   },
    }
    request2 = {
        "name": "checky v3",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"scorers": ["accuracy"]},
                   "module_name": "deepchecks.vision.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_vision_model_id}/checks", json=[request, request2])
    assert response.status_code == 200
    times = []
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    for i in [1, 3, 7, 13]:
        time = day_before_curr_time.add(hours=i).isoformat()
        times.append(time)
        request = []
        for j in range(10):
            request.append({
                "_dc_sample_id": f"{i} {j}",
                "_dc_time": time,
                "_dc_prediction": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
                "_dc_label": 2,
                "images Aspect Ratio": 0.677 / i,
            })
        response = client.post(f"/api/v1/model-versions/{classification_vision_model_version_id}/data", json=request)
        assert response.status_code == 200
    sample = {
        "_dc_prediction": [0.1, 0.3, 0.6],
        "_dc_label": 2,
        "images Aspect Ratio": 0.677,
    }
    # Act
    response = send_reference_request(client, classification_vision_model_version_id, [sample] * 100)
    assert response.status_code == 200

    # test no filter
    response = client.post("/api/v1/checks/1/run/lookback", json={"start_time": day_before_curr_time.isoformat(),
                                                                  "end_time": curr_time.isoformat()})
    assert response.status_code == 200
    json_rsp = response.json()
    assert response.status_code == 200
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert set(times).issubset(set(json_rsp["time_labels"]))
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 4

    # test with filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "images Aspect Ratio",
                                                         "operator": "greater_than", "value": 0.2}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 2

    # test with filter no reference because of filter
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "images Aspect Ratio",
                                                         "operator": "greater_than", "value": 1}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert json_rsp["output"] == {"1": None}
    # test with filter no reference because of filter 2
    response = client.post("/api/v1/checks/1/run/lookback",
                           json={"start_time": day_before_curr_time.isoformat(), "end_time": curr_time.isoformat(),
                                 "filter": {"filters": [{"column": "images Aspect Ratio",
                                                         "operator": "greater_than", "value": 0},
                                                        {"column": "images Aspect Ratio",
                                                         "operator": "equals", "value": 2}]}})
    json_rsp = response.json()
    assert len(json_rsp["time_labels"]) == 24
    assert json_rsp["output"] == {"1": None}

    # test with filter on window
    response = client.post("/api/v1/checks/2/run/window",
                           json={"start_time": day_before_curr_time.add(hours=7).isoformat(),
                                 "end_time": day_before_curr_time.add(hours=9).isoformat(),
                                 "filter": {"filters": [{"column": "images Aspect Ratio",
                                                         "operator": "greater_than", "value": 0}]}})
    json_rsp = response.json()
    assert json_rsp == {"1": {"accuracy": 1.0}}


@pytest.mark.asyncio
async def test_run_check_vision_detection(detection_vision_model_id,
                                          detection_vision_model_version_id, client: TestClient):
    request = {
        "name": "checky v2",
        "config": {"class_name": "TrainTestPredictionDrift",
                   "params": {},
                   "module_name": "deepchecks.vision.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{detection_vision_model_id}/checks", json=request)
    assert response.status_code == 200
    request = {
        "name": "checky v3",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {},
                   "module_name": "deepchecks.vision.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{detection_vision_model_id}/checks", json=request)
    assert response.status_code == 200
    times = []
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    for i in [1, 3, 7, 13]:
        time = day_before_curr_time.add(hours=i).isoformat()
        times.append(time)
        request = []
        for j in range(10):
            request.append({
                "_dc_sample_id": f"{i} {j}",
                "_dc_time": time,
                "_dc_prediction":
                    [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]]
                    if i % 2 else [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]],
                "_dc_label": [[42, 1.08, 187.69, 611.59, 285.84], [51, 249.6, 229.27, 316.24, 245.08]],
                "images Aspect Ratio": 0.677 / i,
                "partial_images Aspect Ratio": [0.677 / i, 0.9 / i],
            })
        response = client.post(f"/api/v1/model-versions/{detection_vision_model_version_id}/data", json=request)
        assert response.status_code == 200
    sample = {
        "_dc_prediction": [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]],
        "_dc_label": [[42, 1.08, 187.69, 611.59, 285.84], [51, 249.6, 229.27, 316.24, 245.08]],
        "images Aspect Ratio": 0.677,
        "partial_images Aspect Ratio": [0.677, 0.9],
    }
    # Act
    response = send_reference_request(client, detection_vision_model_version_id, [sample] * 100)
    assert response.status_code == 200

    # test no filter
    response = client.post("/api/v1/checks/1/run/lookback", json={"start_time": day_before_curr_time.isoformat(),
                                                                  "end_time": curr_time.isoformat()})
    assert response.status_code == 200
    json_rsp = response.json()
    assert response.status_code == 200
    assert len(json_rsp["time_labels"]) == 24
    assert len(json_rsp["output"]["1"]) == 24
    assert set(times).issubset(set(json_rsp["time_labels"]))
    assert len([out for out in json_rsp["output"]["1"] if out is not None]) == 4

    # test with filter on window
    response = client.post("/api/v1/checks/2/run/window",
                           json={"start_time": day_before_curr_time.add(hours=7).isoformat(),
                                 "end_time": day_before_curr_time.add(hours=9).isoformat(),
                                 "filter": {"filters": [{"column": "images Aspect Ratio",
                                                         "operator": "greater_than", "value": 0}]}})
    json_rsp = response.json()
    assert json_rsp == {"1": {"Average Precision 42": 0.0, "Average Precision 51": 0.0,
                              "Average Recall 42": 0.0, "Average Recall 51": 0.0}}
