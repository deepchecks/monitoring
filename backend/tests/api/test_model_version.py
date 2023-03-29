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
import typing as t

import httpx
import pendulum as pdl
import pytest
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models import ModelVersion, TaskType
from tests.common import Payload, TestAPI, upload_classification_data


def test_binary_model_version_creation_without_classes(test_api: TestAPI):
    # NOTE: all needed assertions will be done by "test_api"
    model = test_api.create_model(model={"task_type": TaskType.BINARY.value})
    model = t.cast(Payload, model)

    test_api.create_model_version(
        model_id=model["id"],
        model_version={
            "name": "xxx",
            "features": {"x": "numeric",},
            "additional_data": {"a": "numeric",}
        }
    )


def test_binary_model_version_with_classes(test_api: TestAPI):
    # NOTE: all needed assertions will be done by "test_api"
    model = test_api.create_model(model={"task_type": TaskType.BINARY.value})
    model = t.cast(Payload, model)

    test_api.create_model_version(
        model_id=model["id"],
        model_version={
            "name": "xxx",
            "features": { "x": "numeric"},
            "additional_data": {"a": "numeric",},
            "classes": ["1", "2"]
        }
    )


def test_binary_model_version_creation_with_too_many_classes(test_api: TestAPI):
    model = test_api.create_model(model={"task_type": TaskType.BINARY.value})
    model = t.cast(Payload, model)

    response = test_api.create_model_version(
        expected_status=400,
        model_id=model["id"],
        model_version={
            "name": "xxx",
            "features": {"x": "numeric"},
            "additional_data": {"a": "numeric"},
            "classes": ["1", "2", "3"]
        }
    )

    response = t.cast(httpx.Response, response)
    content = response.json()
    assert content["error_message"] == "Got 3 classes but task type is binary"


def test_model_version_creation_with_not_sorted_classes(test_api: TestAPI):
    model = test_api.create_model(model={"task_type": TaskType.MULTICLASS.value})
    model = t.cast(Payload, model)

    response = test_api.create_model_version(
        expected_status=400,
        model_id=model["id"],
        model_version={
            "name": "xxx",
            "features": {"x": "numeric",},
            "additional_data": {"a": "numeric",},
            "classes": ["1", "2", "3", "0"]
        }
    )

    content = t.cast(httpx.Response, response).json()
    assert content["error_message"] == "Classes list must be sorted alphabetically"


def test_regression_model_version_creation_with_classes(test_api: TestAPI):
    model = test_api.create_model(model={"task_type": TaskType.REGRESSION.value})
    model = t.cast(Payload, model)

    response = test_api.create_model_version(
        expected_status=400,
        model_id=model["id"],
        model_version={
            "name": "xxx",
            "features": {"x": "numeric"},
            "additional_data": {"a": "numeric"},
            "classes": ["1", "2", "3"]
        }
    )

    content = t.cast(httpx.Response, response).json()
    expected_message = "Classes parameter is valid only for classification, bot model task is regression"
    assert content["error_message"] == expected_message


def test_model_version_creation(
    test_api: TestAPI,
    classification_model: Payload,
):
    # NOTE: all needed assertions will be done by "test_api"
    test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={
            "name": "xxx",
            "features": {
                "x": "numeric",
                "y": "categorical",
                "w": "boolean"
            },
            "additional_data": {
                "a": "numeric",
                "b": "text"
            }
        }
    )


# TODO: this tests does not have much sense
#
# 'version creation endpoint' always creates a new version instance
# if to give it a payload with a model version name that does not exist yet
# otherwise it returns an error if features set is not the same.
#
# Remove or reconsider it
#
# def test_model_version_creation_with_different_set_of_features_than_already_exist(
#     test_api: TestAPI,
#     classification_model: Payload,
#     classification_model_version: Payload,
# ):
#     version = test_api.create_model_version(
#         model_id=classification_model["id"],
#         model_version={
#             "name": "xxx",
#             "features": {
#                 "x": "numeric",
#                 "y": "categorical",
#                 "w": "boolean"
#             },
#             "additional_data": {
#                 "a": "numeric",
#                 "b": "text"
#             }
#         }
#     )

#     version = t.cast(Payload, version)
#     assert version["id"] != classification_model_version["id"]


def test_model_version_duplicate_creation(
    test_api: TestAPI,
    classification_model: Payload,
    classification_model_version: Payload,
):
    """
    Verify that model-version creation endpoint does not create duplicates
    if a model version with a provided set of attributes already exists.
    """
    version = test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={
            "name": classification_model_version["name"],
            "features": classification_model_version["features_columns"],
            "feature_importance": classification_model_version["feature_importance"],
            "additional_data_columns": classification_model_version["additional_data_columns"]
        }
    )
    assert t.cast(Payload, version)["id"] == classification_model_version["id"]


def test_model_version_duplicate_creation_with_different_set_of_features(
    test_api: TestAPI,
    classification_model: Payload,
    classification_model_version: Payload
):
    response = test_api.create_model_version(
        expected_status=400,
        model_id=classification_model["id"],
        model_version={
            "name": classification_model_version["name"],
            "features": {**classification_model_version["features_columns"], "w": "categorical"},
            "additional_data": classification_model_version["additional_data_columns"],
        }
    )
    # Assert
    content = t.cast(httpx.Response, response).json()
    expected_message = 'A model version with the name "v1" already exists but with different features'
    assert content["error_message"] == expected_message


def test_time_window_statistics_retrieval(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model: Payload

):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1"}

    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[sample] * 100
    )
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"],
    )
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False,
        id_prefix="unlabeled",
    )

    # Act
    result = test_api.fetch_time_window_statistics(
        model_version_id=classification_model_version["id"],
        end_time=pdl.now().isoformat(),
    )
    # Assert
    assert t.cast(Payload, result) == {"num_samples": 10, "num_labeled_samples": 5}


def test_number_of_samples_retrieval(
    test_api: TestAPI,
    classification_model_version: Payload
):
    # Arrange
    sample = {
        "_dc_label": "2",
        "a": 11.1,
        "b": "ppppp",
        "_dc_prediction": "1",
        "_dc_prediction_probabilities": [0, 1, 2]
    }
    test_api.upload_reference(
        model_version_id=classification_model_version["id"],
        data=[sample] * 100
    )
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False
    )

    # Act
    result = test_api.fetch_n_of_samples(model_version_id=classification_model_version["id"])
    # Assert
    assert t.cast(Payload, result) == {"monitor_count": 5, "reference_count": 100}


@pytest.mark.asyncio
async def test_model_version_removal(
    test_api: TestAPI,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    model_version = await async_session.get(ModelVersion, classification_model_version["id"])
    mon_table_name = model_version.get_monitor_table_name()
    ref_table_name = model_version.get_reference_table_name()

    # Act
    test_api.delete_model_version(classification_model_version["id"])

    # Assert
    def get_table_names(conn):
        inspector = inspect(conn)
        return inspector.get_table_names()

    tables = await (await async_session.connection()).run_sync(get_table_names)

    assert mon_table_name not in tables
    assert ref_table_name not in tables


def test_model_version_schema_retrieval(
    test_api: TestAPI,
    classification_model_version: Payload
):
    result = test_api.fetch_model_version_schema(model_version_id=classification_model_version["id"])
    assert t.cast(Payload, result) == {
        "monitor_schema": {
            "type": "object",
            "required": ["a", "b", "_dc_sample_id", "_dc_time", "_dc_prediction"],
            "properties": {
                "a": {
                    "type": ["number", "null"]
                },
                "b": {
                    "type": ["string", "null"]
                },
                "c": {
                    "type": ["number", "null"]
                },
                "_dc_time": {
                    "type": "string",
                    "format": "date-time"
                },
                "_dc_sample_id": {
                    "type": "string"
                },
                "_dc_prediction": {
                    "type": "string"
                },
                "_dc_prediction_probabilities": {
                    "type": ["array", "null"],
                    "items": {
                        "type": "number"
                    },
                    "maxItems": 3,
                    "minItems": 3
                }
            },
            "additionalProperties": False
        },
        "reference_schema": {
            "type": "object",
            "required": ["a", "b", "_dc_prediction"],
            "properties": {
                "a": {
                    "type": ["number", "null"]
                },
                "b": {
                    "type": ["string", "null"]
                },
                "c": {
                    "type": ["number", "null"]
                },
                "_dc_label": {
                    "type": ["string", "null"]
                },
                "_dc_prediction": {
                    "type": "string"
                },
                "_dc_prediction_probabilities": {
                    "type": ["array", "null"],
                    "items": {
                        "type": "number"
                    },
                    "maxItems": 3,
                    "minItems": 3
                }
            },
            "additionalProperties": False
        },
        "features": {
            "a": "numeric",
            "b": "categorical"
        },
        "additional_data": {
            "c": "numeric"
        },
        "classes": ["0", "1", "2"],
        "label_map": None,
        "feature_importance": {"a": 0.1, "b": 0.5}
    }
