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

import httpx
import pendulum as pdl
import pytest
from deepdiff import DeepDiff
from hamcrest import assert_that, contains_exactly, has_entries, has_items, has_length

from deepchecks_monitoring.schema_models import TaskType
from tests.common import Payload, TestAPI, upload_classification_data, upload_vision_classification_data

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
def classification_vision_check(
    test_api: TestAPI,
    classification_vision_model: Payload,
) -> Payload:
    result = test_api.create_check(
        model_id=classification_vision_model["id"],
        check={
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {},
                "module_name": "deepchecks.vision.checks"
            }
        }
    )
    return t.cast(Payload, result)


@pytest.fixture()
def classification_vision_model_version_with_label_map(
    test_api: TestAPI,
    classification_vision_model: Payload,
) -> Payload:
    result = test_api.create_model_version(
        model_id=classification_vision_model["id"],
        model_version={
            "name": "v1",
            "label_map": {0: "ahh", 1: "ooh", 2: "wee"},
            "features": {
                "images Aspect Ratio": "numeric",
                "images Area": "numeric",
                "images Brightness": "numeric",
                "images RMS Contrast": "numeric",
                "images Mean Red Relative Intensity": "numeric",
                "images Mean Blue Relative Intensity": "numeric",
                "images Mean Green Relative Intensity": "numeric",
            },
            "additional_data": {}
        }
    )
    return t.cast(Payload, result)


@pytest.fixture()
def classification_vision_model_property_check(
    test_api: TestAPI,
    classification_vision_model: Payload,
) -> Payload:
    result = test_api.create_check(
        model_id=classification_vision_model["id"],
        check={
            "config": {
                "class_name": "ImagePropertyDrift",
                "params": {},
                "module_name": "deepchecks.vision.checks"
            }
        }
    )
    return t.cast(Payload, result)


@pytest.fixture()
def classification_model_train_test_check(
    test_api: TestAPI,
    classification_model: Payload,
) -> Payload:
    result = test_api.create_check(
        model_id=classification_model["id"],
        check={
            "config": {
                "class_name": "TrainTestLabelDrift",
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
    assert response.json()["detail"] == f"Model already contains a check named {payload['name']}"


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
    assert response.json()["detail"] == "Check checky v1 is not compatible with the model task type"


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
):
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"]
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
):
    upload_classification_data(api=test_api, model_version_id=classification_model_version["id"])
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

    k = lambda x: x["name"]
    d = [{"is_agg": None, "name": "1"}, {"is_agg": None, "name": "2"}]
    assert sorted(res_conf["values"], key=k) == sorted(d, key=k)


def test_check_info_retrieval_with_vision_model_version_that_has_label_map(
    test_api: TestAPI,
    classification_vision_check: Payload,
    classification_vision_model_version_with_label_map: Payload,
):
    upload_vision_classification_data(
        test_api=test_api,
        model_version_id=classification_vision_model_version_with_label_map["id"],
    )

    info = test_api.fetch_check_execution_info(classification_vision_check["id"])
    info = t.cast(Payload, info)

    assert isinstance(info["check_conf"], list)
    assert info["res_conf"]["type"] == "class"
    assert info["res_conf"]["is_agg_shown"] is False

    k = lambda x: x["name"]
    expected_config = [{"is_agg": None, "name": "ahh"}, {"is_agg": None, "name": "ooh"}]
    assert sorted(info["res_conf"]["values"], key=k) == sorted(expected_config, key=k)


def test_check_info_retrieval_with_vision_detection_model(
    test_api: TestAPI,
    detection_model: Payload,
    detection_model_version: Payload,
):
    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    upload_detection_data(
        model_version_id=detection_model_version["id"],
        api=test_api,
        timestamp=day_before
    )

    check = test_api.create_check(
        model_id=detection_model["id"],
        check={
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {},
                "module_name": "deepchecks.vision.checks"
            }
        }
    )

    check = t.cast(Payload, check)
    info = test_api.fetch_check_execution_info(check["id"])
    info = t.cast(Payload, info)
    assert isinstance(info["check_conf"], list)

    res_conf_json = info["res_conf"]
    assert info["res_conf"]["type"] == "class"
    assert info["res_conf"]["is_agg_shown"] is False

    k = lambda x: x["name"]
    expected_conf = [
        {"is_agg": None, "name": "42"}, {"is_agg": None, "name": "45"},
        {"is_agg": None, "name": "50"}, {"is_agg": None, "name": "51"}
    ]

    assert \
        sorted(res_conf_json["values"], key=k) == sorted(expected_conf, key=k), \
        info["res_conf"]["values"]


def test_property_check_info_retrieval(
    test_api: TestAPI,
    classification_vision_model_property_check: Payload,
    classification_vision_model_version: Payload,
):
    upload_classification_data(
        model_version_id=classification_vision_model_version["id"],
        api=test_api
    )

    info = test_api.fetch_check_execution_info(classification_vision_model_property_check["id"])
    info = t.cast(Payload, info)

    assert info == {
        "check_conf":[
            {
                "is_agg_shown": None,
                "type": "aggregation method",
                "values": [
                    {"name": "mean", "is_agg": True},
                    {"name": "max", "is_agg": True},
                    {"name": "none", "is_agg": False}
                ]
            },
            {
                "type": "property",
                "values": [
                    {"is_agg": None, "name": "Area"},
                    {"is_agg": None, "name": "Brightness"},
                    {"is_agg": None, "name": "Aspect Ratio"},
                    {"is_agg": None, "name": "RMS Contrast"},
                    {"is_agg": None, "name": "Mean Red Relative Intensity"},
                    {"is_agg": None, "name": "Mean Blue Relative Intensity"},
                    {"is_agg": None, "name": "Mean Green Relative Intensity"},
                ],
                "is_agg_shown": False
            }
        ],
        "res_conf": None
    }


def test_feature_check_info(
    test_api: TestAPI,
    classification_model_category_mismatch_check: Payload,
    classification_model_version: Payload,
):
    upload_classification_data(
        model_version_id=classification_model_version["id"],
        api=test_api,
    )

    info = test_api.fetch_check_execution_info(classification_model_category_mismatch_check["id"])
    info = t.cast(Payload, info)

    assert info == {
        "check_conf":[
            {
                "is_agg_shown": None,
                "type": "aggregation method",
                "values": [
                    {"name": "mean", "is_agg": True},
                    {"name": "max", "is_agg": True},
                    {"name": "none", "is_agg": False},
                    {"name": "weighted", "is_agg": True},
                    {"name": "l2_weighted", "is_agg": True}
                ]
            },
            {
                "type": "feature",
                "values": [
                    {"is_agg": None, "name": "a"},
                    {"is_agg": None, "name": "b"}
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
):
    _, start_time, end_time = upload_classification_data(
        model_version_id=classification_model_version["id"],
        api=test_api,
        samples_per_date=50
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
                    {"column": "b", "operator": "contains", "value": "ppppp"}
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    assert len([out for out in result["output"]["v1"] if out is not None]) == 4


def test_run_lookback_empty_filters(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model_train_test_check: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
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
    assert result["output"]["v1"] is None


def run_window(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=2
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
):
    run_window(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version,
    )


def test_check_execution_for_window_without_feature_importance(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version_without_feature_importance: Payload,
):
    run_window(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version_without_feature_importance
    )


def test_check_execution_for_range(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version
    )


def test_run_window_train_test(
    test_api: TestAPI,
    classification_model_train_test_check: Payload,
    classification_model_version: Payload,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=5
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
    assert result == {"v1": {"Label Drift Score": 0.25584714587462043}}


def test_run_lookback_train_test(
    test_api: TestAPI,
    classification_model_train_test_check: Payload,
    classification_model_version: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_train_test_check,
        classification_model_version=classification_model_version
    )


def test_run_lookback_no_fi(
    test_api: TestAPI,
    classification_model_check,
    classification_model_version_without_feature_importance: Payload,
):
    run_lookback(
        test_api=test_api,
        classification_model_check=classification_model_check,
        classification_model_version=classification_model_version_without_feature_importance,
    )


def test_check_vision_check_execution_for_reference_data(
    test_api: TestAPI,
    classification_vision_model: Payload,
    classification_vision_model_version: Payload,
):
    # Act
    check = test_api.create_check(
        model_id=classification_vision_model["id"],
        check={
            "name": "checky v3",
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {"scorers": ["accuracy"]},
                "module_name": "deepchecks.vision.checks"
            },
        }
    )

    check = t.cast(Payload, check)

    # Act
    test_api.upload_reference(
        model_version_id=classification_vision_model_version["id"],
        data=[
            {
                "_dc_prediction": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
                "_dc_label": 2,
                "images Aspect Ratio": 0.677 / hour,
                "images Brightness": 0.5,
                "images Area": 0.5 + (1 / (j + 1)),
                "images RMS Contrast": 0.5,
                "images Mean Red Relative Intensity": 0.5,
                "images Mean Blue Relative Intensity": 0.5,
                "images Mean Green Relative Intensity": 0.5,

            }
            for j in range(10)
            for i, hour in enumerate([1, 3, 7, 13])
        ]
    )

    result = test_api.execute_check_for_reference(
        check_id=check["id"],
        options={
            "filter": {
                "filters": [
                    {"column": "images Aspect Ratio", "operator": "greater_than", "value": 0}
                ]
            },
            "additional_kwargs": {
                "check_conf": {"scorer": ["precision_macro"]}
            }
        }
    )

    result = t.cast(Payload, result)
    assert result == {"v1": {"precision_macro": 0.3333333333333333}}


# TODO:
# refactor this test, split it into smaller tests
def test_vision_check_execution(
    test_api: TestAPI,
    classification_vision_model: Payload,
    classification_vision_model_version: Payload,
):
    # Act
    first_check = test_api.create_check(
        model_id=classification_vision_model["id"],
        check={
            "config": {
                "class_name": "TrainTestPredictionDrift",
                "params": {},
                "module_name": "deepchecks.vision.checks"
            }
        }
    )
    second_check = test_api.create_check(
        model_id=classification_vision_model["id"],
        check={
            "config": {
                "class_name": "SingleDatasetPerformance",
                "params": {"scorers": ["accuracy"]},
                "module_name": "deepchecks.vision.checks"
            },
        }
    )

    first_check = t.cast(Payload, first_check)
    second_check = t.cast(Payload, second_check)

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    for i, hour in enumerate([1, 3, 7, 13]):
        time = day_before.add(hours=hour).isoformat()
        samples = []

        for j in range(10):
            samples.append({
                "_dc_sample_id": f"{i} {j}",
                "_dc_time": time,
                "_dc_prediction": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
                "_dc_label": 2,
                "images Aspect Ratio": 0.677 / hour,
                "images Brightness": 0.5,
                "images Area": 0.5,
                "images RMS Contrast": 0.5,
                "images Mean Red Relative Intensity": 0.5,
                "images Mean Blue Relative Intensity": 0.5,
                "images Mean Green Relative Intensity": 0.5,

            })

        test_api.upload_samples(
            model_version_id=classification_vision_model_version["id"],
            samples=samples
        )

    sample = {
        "_dc_prediction": [0.1, 0.3, 0.6],
        "_dc_label": 2,
        "images Aspect Ratio": 0.677,
        "images Brightness": 0.5,
        "images Area": 0.5,
        "images RMS Contrast": 0.5,
        "images Mean Red Relative Intensity": 0.5,
        "images Mean Blue Relative Intensity": 0.5,
        "images Mean Green Relative Intensity": 0.5,
    }

    # Act
    test_api.upload_reference(
        model_version_id=classification_vision_model_version["id"],
        data=[sample] * 100
    )

    # test no filter + 3 hour agg window
    result = test_api.execute_check_for_range(
        check_id=second_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "aggregation_window": 10800,
            "frequency": 3600,
        }
    )

    result = t.cast(Payload, result)
    expected_result = [
        None,
        {"accuracy": 0.0},
        {"accuracy": 0.0},
        {"accuracy": 0.5},
        {"accuracy": 1.0},
        {"accuracy": 1.0},
        None,
        {"accuracy": 0.0},
        {"accuracy": 0.0},
        {"accuracy": 0.0},
        None, None, None,
        {"accuracy": 1.0},
        {"accuracy": 1.0},
        {"accuracy": 1.0},
        None, None, None, None, None, None, None, None
    ]

    assert result["output"]["v1"] == expected_result
    assert len([out for out in result["output"]["v1"] if out is not None]) == 11

    # test with filter
    result = test_api.execute_check_for_range(
        check_id=second_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "filter": {
                "filters": [{
                    "column": "images Aspect Ratio",
                    "operator": "greater_than",
                    "value": 0.2
                }]
            }
        }
    )

    result = t.cast(Payload, result)
    assert len([out for out in result["output"]["v1"] if out is not None]) == 2

    # test with filter no reference because of filter
    result = test_api.execute_check_for_range(
        check_id=first_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "filter": {
                "filters": [{
                    "column": "images Aspect Ratio",
                    "operator": "greater_than",
                    "value": 1
                }]
            }
        }
    )

    result = t.cast(Payload, result)
    assert result["output"] == {"v1": None}

    # test with filter no reference because of filter 2

    result = test_api.execute_check_for_range(
        check_id=first_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "filter": {
                "filters": [
                    {
                        "column": "images Aspect Ratio",
                        "operator": "greater_than",
                        "value": 0
                    },
                    {
                        "column": "images Aspect Ratio",
                        "operator": "equals",
                        "value": 2
                    }
                ]
            }
        }
    )

    result = t.cast(Payload, result)
    assert result["output"] == {"v1": None}

    # test with filter on window
    result = test_api.execute_check_for_window(
        check_id=second_check["id"],
        options={
            "start_time": day_before.add(hours=3).isoformat(),
            "end_time": day_before.add(hours=9).isoformat(),
            "filter": {
                "filters": [
                    {
                        "column": "images Aspect Ratio",
                        "operator": "greater_than",
                        "value": 0
                    }
                ]
            }
        }
    )
    result = t.cast(Payload, result)
    assert result == {"v1": {"accuracy": 0.5}}


def test_vision_check_execution_for_detection_model(
    test_api: TestAPI,
    detection_model: Payload,
    detection_model_version: Payload,
):
    # == Arrange
    checks = [
        test_api.create_check(
            model_id=detection_model["id"],
            check={
                "config": {
                    "class_name": "TrainTestPredictionDrift",
                    "params": {},
                    "module_name": "deepchecks.vision.checks"
                }
            }
        ),
        test_api.create_check(
            model_id=detection_model["id"],
            check={
                "config": {
                    "class_name": "SingleDatasetPerformance",
                    "params": {},
                    "module_name": "deepchecks.vision.checks"
                }
            }
        )
    ]

    checks = t.cast(t.List[Payload], checks)
    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    upload_detection_data(
        api=test_api,
        model_version_id=detection_model_version["id"],
        timestamp=day_before
    )

    sample = {
        "_dc_prediction": [[325.03, 1.78, 302.36, 237.5, 0.7, 45], [246.24, 222.74, 339.79, 255.17, 0.57, 50]],
        "_dc_label": [[42, 1.08, 187.69, 611.59, 285.84], [51, 249.6, 229.27, 316.24, 245.08]],
        "images Aspect Ratio": 0.677,
        "images Brightness": 0.5,
        "images Area": 0.5,
        "images RMS Contrast": 0.5,
        "images Mean Red Relative Intensity": 0.5,
        "images Mean Blue Relative Intensity": 0.5,
        "images Mean Green Relative Intensity": 0.5,
        "partial_images Aspect Ratio": [0.677, 0.9],
        "partial_images Brightness": [0.5, 0.5],
        "partial_images Area": [0.5, 0.5],
        "partial_images RMS Contrast": [0.5, 0.5],
        "partial_images Mean Red Relative Intensity": [0.5, 0.5],
        "partial_images Mean Blue Relative Intensity": [0.5, 0.5],
        "partial_images Mean Green Relative Intensity": [0.5, 0.5],
    }

    test_api.upload_reference(
        model_version_id=detection_model_version["id"],
        data=[sample] * 100
    )

    # == Act
    # test no filter
    result = test_api.execute_check_for_range(
        check_id=checks[0]["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat()
        }
    )

    result = t.cast(Payload, result)
    assert len([out for out in result["output"]["v1"] if out is not None]) == 4

    # test with filter on window
    result = test_api.execute_check_for_window(
        check_id=checks[1]["id"],
        options={
            "start_time": day_before.add(hours=7).isoformat(),
            "end_time": day_before.add(hours=9).isoformat(),
            "filter": {
                "filters": [{"column": "images Aspect Ratio","operator": "greater_than", "value": 0}]
            }
        }
    )

    result = t.cast(Payload, result)
    expected_result = {
        "v1": {
            "Average Precision 42": 0.0,
            "Average Precision 51": 0.0,
            "Average Recall 42": 0.0,
            "Average Recall 51": 0.0
        }
    }

    assert result == expected_result


# TODO: rename or add description
def test_metric_check_w_features(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    # == Arrange
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
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


# TODO: rename or add description
def test_property_check_execution_with_properties_configuration(
    test_api: TestAPI,
    classification_vision_model_property_check: Payload,
    classification_vision_model_version: Payload,
):
    # == Arrange
    upload_vision_classification_data(
        test_api=test_api,
        model_version_id=classification_vision_model_version["id"],
    )

    sample = {
        "_dc_prediction": [0.1, 0.3, 0.6],
        "_dc_label": 2,
        "images Aspect Ratio": 0.677,
        "images Brightness": 0.5,
        "images Area": 0.5,
        "images RMS Contrast": 0.5,
        "images Mean Red Relative Intensity": 0.5,
        "images Mean Blue Relative Intensity": 0.5,
        "images Mean Green Relative Intensity": 0.5,
    }
    test_api.upload_reference(
        model_version_id=classification_vision_model_version["id"],
        data=[sample] * 100
    )

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    # == Act
    result = test_api.execute_check_for_window(
        check_id=classification_vision_model_property_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {"aggregation method": ["none"], "property": ["images Brightness"]},
                "res_conf": None
            }
        }
    )
    result = t.cast(Payload, result)
    assert result == {"v1": {"Brightness": 0}}

    result = test_api.execute_check_for_window(
        check_id=classification_vision_model_property_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {"aggregation method": ["none"],"property": ["images Area"]},
                "res_conf": None
            }
        }
    )
    result = t.cast(Payload, result)
    assert result == {"v1": {"Area": 0}}


def test_vision_check_execution_with_label_map(
    test_api: TestAPI,
    classification_vision_check: Payload,
    classification_vision_model_version_with_label_map: Payload,
):
    # == Arrange
    upload_vision_classification_data(
        test_api=test_api,
        model_version_id=classification_vision_model_version_with_label_map["id"],
    )

    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    # == Act
    result = test_api.execute_check_for_window(
        check_id=classification_vision_check["id"],
        options={
            "start_time": day_before.isoformat(),
            "end_time": now.isoformat(),
            "additional_kwargs": {
                "check_conf": {
                    "aggregation method": ["none"],
                    "property": ["images Brightness"]
                },
                "res_conf": None
            }
        }
    )

    result = t.cast(Payload, result)
    expected_result = {
        "v1": {
            "Precision ahh": 0.0, "Precision ooh": 0.5,
            "Recall ahh": 0.0, "Recall ooh": 0.5
        }
    }

    assert result == expected_result


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
    classification_model_check: Payload
):
    # == Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
    )

    # == Act
    result = test_api.feature_drill_down(
        feature="b",
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        options={
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
    )

    # == Assert
    result = t.cast(t.List[Payload], result)

    assert_that(result, contains_exactly(
        has_entries({
            "name":
            "All Data",
            "value": has_length(3),
            "display": has_length(0),
            "count": 4,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "ppppp",
            "value": has_length(3),
            "display": has_length(0),
            "count": 4,
            "filters": has_entries({"filters": has_length(1)})
        })
    ))


def test_numerical_feature_drill_down_with_single_value_in_bin(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload
):
    # Arrange
    now = t.cast("PendulumDateTime", pdl.now().set(minute=0, second=0, microsecond=0))
    day_before = t.cast("PendulumDateTime", now - pdl.duration(days=1))

    daterange = [day_before.add(hours=hours) for hours in [1, 3, 7]]

    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=2,
        daterange=daterange
    )

    # == Act
    result = test_api.feature_drill_down(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        feature="a",
        options={
            "start_time": start_time.isoformat(),
            "end_time": end_time.add(minutes=1).isoformat()
        }
    )

    # Assert
    result = t.cast(t.List[Payload], result)

    assert_that(result, contains_exactly(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "display": has_length(0),
            "count": 6,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "10.0",
            "value": has_length(3),
            "display": has_length(0),
            "count": 4,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "11.0",
            "value": has_length(3),
            "display": has_length(0),
            "count": 1,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "12.0",
            "value": has_length(3),
            "display": has_length(0),
            "count": 1,
            "filters": has_entries({"filters": has_length(2)})
        })
    ))


def test_numerical_feature_drill_down(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload
):
    # == Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=30
    )

    # == Act
    result = test_api.feature_drill_down(
        check_id=classification_model_check["id"],
        model_version_id=classification_model_version["id"],
        feature="a",
        options={
            "start_time": start_time.isoformat(),
            "end_time": end_time.add(minutes=1).isoformat()
        }
    )

    # == Assert
    result = t.cast(t.List[Payload], result)

    # Checking first and last bin and all data
    assert_that(result, has_items(
        has_entries({
            "name": "All Data",
            "value": has_length(3),
            "display": has_length(0),
            "count": 150,
            "filters": has_entries({"filters": has_length(0)})
        }),
        has_entries({
            "name": "[10.0, 11.0)",
            "value": has_length(3),
            "display": has_length(0),
            "count": 34,
            "filters": has_entries({"filters": has_length(2)})
        }),
        has_entries({
            "name": "[106.0, 126.0]",
            "value": has_length(3),
            "display": has_length(0),
            "count": 6,
            "filters": has_entries({"filters": has_length(2)})
        })
    ))


async def test_get_notebook(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    # Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=50
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
