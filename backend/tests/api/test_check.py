# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
# pylint: disable=redefined-outer-name
import json
import typing as t
from datetime import datetime, timedelta

import httpx
import pendulum as pdl
import pytest
from deepchecks.tabular.checks import SingleDatasetPerformance
from deepdiff import DeepDiff
from hamcrest import assert_that, close_to, contains_exactly, has_entries, has_length
from starlette.testclient import TestClient

from deepchecks_monitoring.schema_models import TaskType
from deepchecks_monitoring.schema_models.monitor import Frequency, round_off_datetime
from tests.common import Payload, TestAPI, upload_classification_data

if t.TYPE_CHECKING:
    from pendulum.datetime import DateTime as PendulumDateTime  # pylint: disable=unused-import


def prettify(data) -> str:
    return json.dumps(data, indent=3)


def upload_multiclass_reference_data(
    api: TestAPI,
    classification_model_version: Payload
):
    samples = [
        {
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6],
            "_dc_prediction": "2",
            "_dc_label": "2",
            "a": 16.1,
            "b": "ppppp",
        },
        {
            "_dc_prediction_probabilities": [0.1, 0.6, 0.3],
            "_dc_prediction": "1",
            "_dc_label": "1",
            "a": 16.1,
            "b": "ppppp",
        },
        {
            "_dc_prediction_probabilities": [0.6, 0.1, 0.3],
            "_dc_prediction": "0",
            "_dc_label": "0",
            "a": 16.1,
            "b": "ppppp",
        }
    ]
    return api.upload_reference(
        classification_model_version["id"],
        samples * 100
    )


def upload_detection_data(
    api: TestAPI,
    model_version_id: int,
    timestamp: t.Any
):
    for i in [1, 3, 7, 13]:
        time = timestamp.add(hours=i).isoformat()
        api.upload_samples(
            model_version_id=model_version_id,
            samples=[
                {
                    "_dc_sample_id": f"{i} {j}",
                    "_dc_time": time,
                    "_dc_prediction":
                        [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]]
                        if i % 2
                        else [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]],
                    "_dc_label": [[42, 1.08, 187.69, 611.59, 285.84], [51, 249.6, 229.27, 316.24, 245.08]],
                    "images Aspect Ratio": 0.677 / i,
                    "images Brightness": 0.5,
                    "images Area": 0.5,
                    "images RMS Contrast": 0.5,
                    "images Mean Red Relative Intensity": 0.5,
                    "images Mean Blue Relative Intensity": 0.5,
                    "images Mean Green Relative Intensity": 0.5,
                    "partial_images Aspect Ratio": [0.677 / i, 0.9 / i],
                    "partial_images Brightness": [0.5, 0.5],
                    "partial_images Area": [0.5, 0.5],
                    "partial_images RMS Contrast": [0.5, 0.5],
                    "partial_images Mean Red Relative Intensity": [0.5, 0.5],
                    "partial_images Mean Blue Relative Intensity": [0.5, 0.5],
                    "partial_images Mean Green Relative Intensity": [0.5, 0.5],
                }
                for j in range(10)
            ]
        )


# === Fixtures ===


@pytest.fixture()
def classification_model_train_test_check(
    test_api: TestAPI,
    classification_model: Payload,
) -> Payload:
    result = test_api.create_check(
        model_id=classification_model["id"],
        check={
            "config": {
                "class_name": "LabelDrift",
                "params": {},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    )
    return t.cast(Payload, result)


@pytest.fixture
def classification_model_version_without_feature_importance(
    test_api: TestAPI,
    classification_model: Payload,
) -> Payload:
    result = test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={
            "name": "v1",
            "features": {"a": "numeric", "b": "categorical"},
            "additional_data": {"c": "numeric"},
            "classes": ["0", "1", "2"]
        }
    )
    return t.cast(Payload, result)


@pytest.fixture()
def classification_model_category_mismatch_check(
    test_api: TestAPI,
    classification_model: t.Dict[str, t.Any],
) -> t.Dict[str, t.Any]:
    result = test_api.create_check(
        model_id=classification_model["id"],
        check={
            "config": {
                "class_name": "CategoryMismatchTrainTest",
                "params": {},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    )
    return t.cast(t.Dict[str, t.Any], result)


# === Tests ===


def test_check_creation(
    test_api: TestAPI,
    classification_model: Payload,
):
    # Act/Assert
    # NOTE: all needed assertions will be done by 'test_api.create_check'
    test_api.create_check(model_id=classification_model["id"])


def test_check_duplicate_creation(
    test_api: TestAPI,
    classification_model: Payload,
):
    # Arrange
    payload = test_api.data_generator.generate_random_check()

    # Act
    check = test_api.create_check(model_id=classification_model["id"], check=payload)
    check = t.cast(Payload, check)

    # Act/Assert
    response = test_api.create_check(
        model_id=classification_model["id"],
        check=payload,
        expected_status=400
    )
    response = t.cast(httpx.Response, response)
    assert response.json()["error_message"] == f"Model already contains a check named {payload['name']}"


def test_check_creation_of_wrong_type(
    test_api: TestAPI,
    classification_model: Payload,
):
    """Test that the backend disallows creation of vision checks for tabular models."""
    # Arrange
    payload = {
        "name": "checky v1",
        "config": {
            "class_name": "SingleDatasetPerformance",
            "params": {"reduce": "mean"},
            "module_name": "deepchecks.vision.checks"
        }
    }

    # Act
    response = test_api.create_check(
        model_id=classification_model["id"],
        check=payload,
        expected_status=400
    )

    response = t.cast(httpx.Response, response)
    assert response.json()["error_message"] == "Check checky v1 is not compatible with the model task type"


def test_check_deletion(
    test_api: TestAPI,
    classification_model: Payload,
):
    # NOTE:
    # all needed assertions will done by 'test_api.create_check' and 'test_api.delete_model_checks'
    check = test_api.create_check(model_id=classification_model["id"])
    check = t.cast(Payload, check)
    test_api.delete_model_checks(model_id=classification_model["id"], checks_names=[check["name"]])


def test_deletion_of_not_existing_check(
    test_api: TestAPI,
    classification_model: Payload,
):
    test_api.delete_model_checks(
        model_id=classification_model["id"],
        checks_names=["checkyyyyyyyyyy"],
        expected_status=404
    )


def test_check_execution_for_window_with_f1_scorer(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload
):
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {"scorer": ["F1 Per Class"]},
                "res_conf": ["1"]
            }
        }
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"F1 Per Class 1": 0}}

    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {"scorer": ["F1 Per Class"]},
                "res_conf": ["2"]
            }
        }
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"F1 Per Class 2": 0.3333333333333333}}


def test_check_info_retrieval_without_model_versions(
    test_api: TestAPI,
    classification_model_check: Payload,
):
    info = test_api.fetch_check_execution_info(classification_model_check["id"])

    diff = DeepDiff(
        ignore_order=True,
        t1=info,
        t2={
            "check_conf": [
                {
                    "is_agg_shown": None,
                    "type": "scorer",
                    "values": [
                        {"is_agg": True, "name": "Accuracy"},
                        {"is_agg": True, "name": "Precision Macro"},
                        {"is_agg": True, "name": "Precision Micro"},
                        {"is_agg": True, "name": "Precision Weighted"},
                        {"is_agg": False, "name": "Precision Per Class"},
                        {"is_agg": True, "name": "Recall Macro"},
                        {"is_agg": True, "name": "Recall Micro"},
                        {"is_agg": True, "name": "Recall Weighted"},
                        {"is_agg": False, "name": "Recall Per Class"},
                        {"is_agg": True, "name": "F1 Macro"},
                        {"is_agg": True, "name": "F1 Micro"},
                        {"is_agg": True, "name": "F1 Weighted"},
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
                        {"is_agg": True, "name": "Tnr Weighted"},
                        {"is_agg": True, "name": "Roc Auc Ovr"},
                        {"is_agg": True, "name": "Roc Auc Ovo"},
                        {"is_agg": True, "name": "Roc Auc Ovr Weighted"},
                        {"is_agg": True, "name": "Roc Auc Ovo Weighted"},
                        {"is_agg": True, "name": "Jaccard Macro"},
                        {"is_agg": True, "name": "Jaccard Micro"},
                        {"is_agg": True, "name": "Jaccard Weighted"},
                        {"is_agg": False, "name": "Jaccard Per Class"},
                    ]
                }
            ],
            "res_conf": {
                "type": "class",
                "values": None,
                "is_agg_shown": False
            }
        }
    )

    assert len(diff) == 0, prettify(diff)


def test_check_info_retrieval_with_model_versions(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    upload_classification_data(api=test_api, model_version_id=classification_model_version["id"],
                               model_id=classification_model["id"])
    info = test_api.fetch_check_execution_info(classification_model_check["id"])
    info = t.cast(Payload, info)

    conf_diff = DeepDiff(
        ignore_order=True,
        t1=info["check_conf"],
        t2=[
            {
                "is_agg_shown": None,
                "type": "scorer",
                "values": [
                    {"name": "Precision Micro", "is_agg": True},
                    {"name": "Precision Weighted", "is_agg": True},
                    {"name": "Recall Micro", "is_agg": True},
                    {"name": "Recall Weighted", "is_agg": True},
                    {"name": "F1 Macro", "is_agg": True},
                    {"name": "F1 Micro", "is_agg": True},
                    {"name": "F1 Weighted", "is_agg": True},
                    {"is_agg": True, "name": "Accuracy"},
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
                    {"is_agg": True, "name": "Tnr Weighted"},
                    {"is_agg": True, "name": "Roc Auc Ovr"},
                    {"is_agg": True, "name": "Roc Auc Ovo"},
                    {"is_agg": True, "name": "Roc Auc Ovr Weighted"},
                    {"is_agg": True, "name": "Roc Auc Ovo Weighted"},
                    {"is_agg": True, "name": "Jaccard Macro"},
                    {"is_agg": True, "name": "Jaccard Micro"},
                    {"is_agg": True, "name": "Jaccard Weighted"},
                    {"is_agg": False, "name": "Jaccard Per Class"},
                ]
            }
        ]
    )

    assert len(conf_diff) == 0, (conf_diff.t1, conf_diff.t2)

    res_conf = info["res_conf"]
    assert res_conf["type"] == "class"
    assert res_conf["is_agg_shown"] is False

    def k(x):
        return x["name"]
    d = [{"is_agg": None, "name": "1"}, {"is_agg": None, "name": "2"}]
    assert sorted(res_conf["values"], key=k) == sorted(d, key=k)


def test_feature_check_info(
    test_api: TestAPI,
    classification_model_category_mismatch_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    upload_classification_data(
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"],
        api=test_api,
    )

    info = test_api.fetch_check_execution_info(classification_model_category_mismatch_check["id"])
    info = t.cast(Payload, info)

    assert info == {
        "check_conf": [
            {
                "is_agg_shown": None,
                "type": "aggregation method",
                "values": [
                    {"name": "mean", "is_agg": True},
                    {"name": "max", "is_agg": True},
                    {"name": "weighted", "is_agg": True},
                    {"name": "l3_weighted", "is_agg": True},
                    {"name": "l5_weighted", "is_agg": True}
                ]
            },
            {
                "type": "feature",
                "values": [
                    {"is_agg": None, "name": "b"},
                    {"is_agg": None, "name": "a"}
                ],
                "is_agg_shown": False
            }
        ],
        "res_conf": None
    }


def run_lookback(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    _, start_time, end_time = upload_classification_data(
        model_version_id=classification_model_version["id"],
        api=test_api,
        samples_per_date=50,
        model_id=classification_model["id"],
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=classification_model_version
    )

    # test no filter
    result = test_api.execute_check_for_range(
        check_id=classification_model_check["id"],
        options={"start_time": start_time, "end_time": end_time}
    )

    result = t.cast(Payload, result)
    assert len(result["output"]) == 1
    assert len([out for out in result["output"]["v1"] if out is not None]) == 5

    # test with filter
    result = test_api.execute_check_for_range(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "filter": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12},
                    {"column": "b", "operator": "equals", "value": "ppppp"}
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    assert len([out for out in result["output"]["v1"] if out is not None]) == 4
    assert datetime.fromisoformat(result["time_labels"][-1]) >= \
           datetime.fromisoformat(end_time) - timedelta(microseconds=1)


def test_run_lookback_empty_filters(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model_train_test_check: Payload,
    classification_model: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=classification_model_version
    )

    # single dataset check
    result = test_api.execute_check_for_range(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "filter": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12},
                    {"column": "b", "operator": "equals", "value": "pppp"}
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    assert len([out for out in result["output"]["v1"] if out is not None]) == 0

    # train test dataset check
    result = test_api.execute_check_for_range(
        check_id=classification_model_train_test_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "filter": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12},
                    {"column": "b", "operator": "equals", "value": "pppp"}
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    assert all(x is None for x in result["output"]["v1"])


def run_window(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=2,
        model_id=classification_model["id"]
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    # test without additional_kwargs on window
    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "filter": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12}
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    expected_result = {"v1": {
        "Accuracy": 0.5,
        "Precision - Macro Average": 0.3333333333333333,
        "Recall - Macro Average": 0.16666666666666666
    }}

    assert result == expected_result

    # test with additional_kwargs on window
    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "filter": {
                "filters": [{"column": "a", "operator": "greater_than", "value": 12}]
            },
            "additional_kwargs": {
                "check_conf": {"scorer": ["recall_macro"]}
            }
        }
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"recall_macro": 0.16666666666666666}}


def test_run_window(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    run_window(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version,
        classification_model=classification_model
    )


def test_check_execution_for_window_without_feature_importance(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version_without_feature_importance: Payload,
    classification_model: Payload,
):
    run_window(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version_without_feature_importance,
        classification_model=classification_model
    )


def test_check_execution_for_range(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version,
        classification_model=classification_model
    )


def test_run_window_train_test(
    test_api: TestAPI,
    classification_model_train_test_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=5,
        model_id=classification_model["id"]
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=classification_model_version
    )
    result = test_api.execute_check_for_window(
        check_id=classification_model_train_test_check["id"],
        options={"start_time": start_time, "end_time": end_time}
    )

    result = t.cast(Payload, result)
    assert_that(result["v1"]["Label Drift Score"], close_to(0.495, 0.001))


def test_run_lookback_train_test(
    test_api: TestAPI,
    classification_model_train_test_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_train_test_check,
        classification_model_version=classification_model_version,
        classification_model=classification_model
    )


def test_run_lookback_no_fi(
    test_api: TestAPI,
    classification_model_check,
    classification_model_version_without_feature_importance: Payload,
    classification_model: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version_without_feature_importance,
        classification_model=classification_model
    )


def test_run_many_checks(
    test_api: TestAPI,
    client: TestClient
):
    # Arrange
    model = test_api.create_model(model={"task_type": TaskType.MULTICLASS.value})
    model_version = test_api.create_model_version(model_id=model["id"], model_version={"classes": ["0", "1", "2"]})
    check1 = test_api.create_check(model["id"])
    check2 = test_api.create_check(model["id"])
    check3 = test_api.create_check(model["id"])
    _, start_time, end_time = upload_classification_data(
        model_version_id=model_version["id"],
        api=test_api,
        model_id=model["id"],
    )
    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=model_version
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    # Act
    request = client.post(f"/api/v1/checks/run-many?check_id={check1['id']}&check_id={check2['id']}"
                          f"&check_id={check3['id']}",
                          json={"start_time": start_time, "end_time": end_time})

    # Assert
    assert request.status_code == 200


# TODO: rename or add description
def test_metric_check_w_features(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
):
    # == Arrange
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    # == Act
    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {"scorer": ["F1 Per Class"], "feature": ["a"]},
                "res_conf": ["1"]
            }
        }
    )
    result = t.cast(Payload, result)
    assert result == {"v1": {"F1 Per Class 1": 0.0}}

    result = test_api.execute_check_for_window(
        check_id=classification_model_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {
                    "scorer": ["F1 Per Class"],
                    "feature": ["a"]
                },
                "res_conf": ["2"]
            }
        }
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"F1 Per Class 2": 0.3333333333333333}}


def test_tabular_check_execution_with_classification_model_and_without_classes(test_api: TestAPI):
    # == Arrange
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(
        model_id=model["id"],
        check={
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {"scorers": ["accuracy", "f1_macro"]},
                "module_name": "deepchecks.tabular.checks"
            }
        }
    ))

    model_version = test_api.create_model_version(
        model_id=model["id"],
        model_version={
            "name": "v1",
            "features": {"a": "numeric", "b": "categorical"},
            "additional_data": {"c": "numeric"},
            "feature_importance": {"a": 0.1, "b": 0.5}
        }
    )
    model_version = t.cast(Payload, model_version)

    upload_classification_data(
        api=test_api,
        model_version_id=model_version["id"],
        with_proba=False,
        model_id=model["id"]
    )

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    # == Act
    result = test_api.execute_check_for_window(
        check_id=check["id"],
        options={"start_time": day_before.isoformat(), "end_time": now.isoformat()}
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"accuracy": 0.2, "f1_macro": 0.16666666666666666}}


def test_categorical_feature_drill_down(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    classification_model: Payload
):
    # == Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )
    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=classification_model_version
    )

    options = {
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }
    # == Act
    result = test_api.feature_drill_down(
        feature="b",
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )

    # == Assert
    result = t.cast(t.List[Payload], result)

    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "count": 4,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "ppppp",
            "value": has_length(3),
            "count": 4,
            "filters": has_entries({"filters": has_length(1)})
        })
    ))

    # == Act - display
    options["filters"] = result[1]["filters"]
    result = test_api.check_display(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )
    # == Assert - display
    assert_that(result, has_length(1))


def test_categorical_feature_drill_down_w_nulls(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    classification_model: Payload
):
    # == Arrange
    _, start_time, _ = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )
    _, _, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False,
        id_prefix="nulli_"
    )
    upload_multiclass_reference_data(
        api=test_api,
        classification_model_version=classification_model_version
    )

    options = {
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }
    # == Act
    result = test_api.feature_drill_down(
        feature="b",
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )

    # == Assert
    result = t.cast(t.List[Payload], result)

    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "count": 4,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "ppppp",
            "value": has_length(3),
            "count": 4,
            "filters": has_entries({"filters": has_length(1)})
        })
    ))

    # == Act - display
    options["filters"] = result[1]["filters"]
    result = test_api.check_display(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )
    # == Assert - display
    assert_that(result, has_length(1))


def test_numerical_feature_drill_down_with_single_value_in_bin(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    classification_model: Payload
):
    # Arrange
    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    now_str = now.isoformat()

    labels = []
    data = []
    for i in range(1500):
        sample = {
            "_dc_sample_id": str(i),
            "_dc_time": now_str,
            "_dc_prediction": "1",
            "a": i // 500,
            "b": "ppppp",
            "_dc_prediction_probabilities": [0.1, 0.3, 0.6]
        }
        data.append(sample)
        labels.append({
            "_dc_sample_id": sample["_dc_sample_id"],
            "_dc_label": "1"
        })

    test_api.upload_samples(model_version_id=classification_model_version["id"], samples=data)
    test_api.upload_labels(classification_model["id"], labels)

    options = {
        "start_time": now_str,
        "end_time": now.add(hours=1).isoformat()
    }
    # == Act
    result = test_api.feature_drill_down(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        feature="a",
        options=options
    )

    # Assert
    result = t.cast(t.List[Payload], result)

    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "count": 1500,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "0",
            "value": has_length(3),
            "count": 500,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "1",
            "value": has_length(3),
            "count": 500,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "2",
            "value": has_length(3),
            "count": 500,
            "filters": has_entries({"filters": has_length(2)})
        })
    ))

    # == Act - display
    options["filters"] = result[0]["filters"]
    result = test_api.check_display(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )
    # == Assert - display
    assert_that(result, has_length(0))


def test_numerical_feature_drill_down(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    classification_model: Payload
):
    # == Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=30,
        model_id=classification_model["id"]
    )
    options = {
        "start_time": start_time.isoformat(),
        "end_time": end_time.add(minutes=1).isoformat()
    }

    # == Act
    result = test_api.feature_drill_down(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        feature="a",
        options=options
    )

    # == Assert
    result = t.cast(t.List[Payload], result)
    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "count": 150,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "[10, 30)",
            "value": has_length(3),
            "count": 72,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "[30, 126]",
            "value": has_length(3),
            "count": 78,
            "filters": has_entries({"filters": has_length(2)})
        })
    ))

    # == Act - display
    options["filters"] = result[0]["filters"]
    result = test_api.check_display(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )
    # == Assert - display
    assert_that(result, has_length(0))


def test_numerical_feature_drill_down_w_nulls(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    classification_model: Payload
):
    # == Arrange
    _, start_time, _ = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=30,
        model_id=classification_model["id"]
    )
    _, _, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=30,
        is_labeled=False,
        id_prefix="nulli_"
    )
    options = {
        "start_time": start_time.isoformat(),
        "end_time": end_time.add(minutes=1).isoformat()
    }

    # == Act
    result = test_api.feature_drill_down(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        feature="a",
        options=options
    )

    # == Assert
    result = t.cast(t.List[Payload], result)
    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "count": 150,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "[10, 30)",
            "value": has_length(3),
            "count": 72,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "[30, 126]",
            "value": has_length(3),
            "count": 78,
            "filters": has_entries({"filters": has_length(2)})
        })
    ))

    # == Act - display
    options["filters"] = result[0]["filters"]
    result = test_api.check_display(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options=options
    )
    # == Assert - display
    assert_that(result, has_length(0))


async def test_get_notebook(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload
):
    # Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=50,
        model_id=classification_model["id"]
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    # Act
    notebook = test_api.download_check_notebook(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "additional_kwargs": {
                "check_conf": {"scorer": ["F1 Per Class"], "feature": ["a"]},
                "res_conf": ["1"]
            }
        }
    )

    notebook = t.cast(str, notebook)
    assert notebook.startswith('{\n "cells": [\n')

    notebook = test_api.download_check_notebook(
        check_id=classification_model_check["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "additional_kwargs": {
                "check_conf": {"scorer": ["F1 Per Class"], "feature": ["a"]},
                "res_conf": ["1"]
            },
            "filter": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12},
                    {"column": "b", "operator": "contains", "value": "ppppp"}
                ]
            },
            "as_script": True, "model_version_id": 1
        }
    )

    notebook = t.cast(str, notebook)
    assert notebook.startswith("import")


def test_auto_frequency(
    test_api: TestAPI,
    client: TestClient
):
    # Arrange
    model = test_api.create_model(model={"task_type": TaskType.MULTICLASS.value})
    start_time = pdl.datetime(2022, 11, 23)
    # Create 2 model versions
    model_version = test_api.create_model_version(model_id=model["id"], model_version={"classes": ["0", "1", "2"]})
    upload_classification_data(
        model_version_id=model_version["id"],
        api=test_api,
        daterange=[start_time.subtract(days=x) for x in [1, 2, 3, 10, 20, 22, 40, 51, 53]],
        model_id=model["id"]
    )
    model_version = test_api.create_model_version(model_id=model["id"], model_version={"classes": ["0", "1", "2"]})
    upload_classification_data(
        model_version_id=model_version["id"],
        api=test_api,
        daterange=[start_time.subtract(days=x) for x in [0, 1, 2, 3]],
        model_id=model["id"]
    )

    # Act
    request = client.get(f"/api/v1/models/{model['id']}/auto-frequency")

    # Assert
    expected_end = round_off_datetime(start_time, Frequency.WEEK).subtract(microseconds=1)

    assert request.status_code == 200
    assert request.json() == {
        "frequency": Frequency.WEEK.value,
        "end": expected_end.int_timestamp,
        "start": start_time.subtract(days=53, microseconds=1).int_timestamp,
    }


def test_label_check_runs_only_on_data_with_label(
    test_api: TestAPI,
):
    # Arrange
    model = test_api.create_model(model={"task_type": TaskType.MULTICLASS.value})
    curr_time = pdl.now().set(minute=0, second=0, microsecond=0).in_tz("UTC")
    model_version = test_api.create_model_version(model_id=model["id"], model_version={"classes": ["0", "1", "2"],
                                                                                       "name": "v1"})
    upload_classification_data(
        model_version_id=model_version["id"],
        api=test_api,
        daterange=[curr_time.subtract(days=1)],
        is_labeled=False,
        samples_per_date=200
    )
    check = test_api.create_check(model["id"],
                                  check={"config": SingleDatasetPerformance().config(include_version=False)})

    # Act
    result = test_api.execute_check_for_window(
        check_id=check["id"],
        options={
            "start_time": curr_time.subtract(days=1).isoformat(),
            "end_time": curr_time.isoformat()
        }
    )

    # Assert
    assert result == {"v1": None}
