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
from sqlalchemy import inspect

from deepchecks_monitoring.schema_models import ModelVersion, TaskType
from tests.conftest import add_classification_data, add_model, send_reference_request


@pytest.mark.asyncio
async def test_add_model_version_binary_no_classes(client: TestClient):
    # Arrange
    model_id = add_model(client, task_type=TaskType.BINARY)
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
        },
        "additional_data": {
            "a": "numeric",
        }
    }

    # Act
    response = client.post(f"/api/v1/models/{model_id}/version", json=request)

    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_model_version_binary_with_classes(client: TestClient):
    # Arrange
    model_id = add_model(client, task_type=TaskType.BINARY)
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
        },
        "additional_data": {
            "a": "numeric",
        },
        "classes": ["1", "2"]
    }

    # Act
    response = client.post(f"/api/v1/models/{model_id}/version", json=request)

    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_model_version_binary_with_too_many_classes(client: TestClient):
    # Arrange
    model_id = add_model(client, task_type=TaskType.BINARY)
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
        },
        "additional_data": {
            "a": "numeric",
        },
        "classes": ["1", "2", "3"]
    }

    # Act
    response = client.post(f"/api/v1/models/{model_id}/version", json=request)

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Got 3 classes but task type is binary"


@pytest.mark.asyncio
async def test_add_model_version_classes_not_sorted(client: TestClient):
    # Arrange
    model_id = add_model(client, task_type=TaskType.MULTICLASS)
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
        },
        "additional_data": {
            "a": "numeric",
        },
        "classes": ["1", "2", "3", "0"]
    }

    # Act
    response = client.post(f"/api/v1/models/{model_id}/version", json=request)

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Classes list must be sorted alphabetically"


@pytest.mark.asyncio
async def test_add_model_version_classes_for_regression(client: TestClient):
    # Arrange
    model_id = add_model(client, task_type=TaskType.REGRESSION)
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
        },
        "additional_data": {
            "a": "numeric",
        },
        "classes": ["1", "2", "3"]
    }

    # Act
    response = client.post(f"/api/v1/models/{model_id}/version", json=request)

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Classes parameter is valid only for classification, bot model task is " \
                                        "regression"


@pytest.mark.asyncio
async def test_add_model_version(classification_model_id, client: TestClient):
    # Arrange
    request = {
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

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_another_model_version(classification_model_id, classification_model_version_id, client: TestClient):
    # Arrange
    request = {
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

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 200
    assert response.json()["id"] != classification_model_version_id


@pytest.mark.asyncio
async def test_get_model_version_same_features(classification_model_id,
                                               classification_model_version_id, client: TestClient):
    # Arrange
    request = {
        "name": "v1",
        "features": {"a": "numeric", "b": "categorical"},
        "feature_importance": {"a": 0.1, "b": 0.5},
        "additional_data": {"c": "numeric"}
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.json() == {"id": classification_model_version_id}


# pylint: disable=W0613 # noqa
@pytest.mark.asyncio
async def test_get_model_version_different_features(classification_model_id,
                                                    classification_model_version_id, client: TestClient):
    # Arrange
    request = {
        "name": "v1",
        "features": {"d": "numeric", "b": "categorical"},
        "additional_data": {"c": "numeric"}
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 400
    assert response.content == \
        b'{"detail":"A model version with the name \\"v1\\" already exists but with different features"}'


@pytest.mark.asyncio
async def test_time_window_statistics(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1"}
    send_reference_request(client, classification_model_version_id, [sample] * 100)
    add_classification_data(classification_model_version_id, client)
    add_classification_data(classification_model_version_id, client, is_labeled=False, id_prefix="unlabeled")
    # Act
    response = client.request("get", f"/api/v1/model-versions/{classification_model_version_id}/time-window-statistics",
                              json={"end_time": pdl.now().isoformat()})
    # Assert
    assert response.status_code == 200
    assert response.json() == {"num_samples": 10, "num_labeled_samples": 5}


@pytest.mark.asyncio
async def test_count_tables(client: TestClient, classification_model_version_id: int):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1",
              "_dc_prediction_probabilities": [0, 1, 2]}
    send_reference_request(client, classification_model_version_id, [sample] * 100)
    add_classification_data(classification_model_version_id, client)
    # Act
    response = client.get(f"/api/v1/model-versions/{classification_model_version_id}/count-samples")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"monitor_count": 5, "reference_count": 100}


@pytest.mark.asyncio
async def test_remove_version(client: TestClient, classification_model_version_id: int, async_session):
    # Arrange
    model_version = (await ModelVersion.filter_by(async_session, id=classification_model_version_id)).scalar()
    mon_table_name = model_version.get_monitor_table_name()
    ref_table_name = model_version.get_reference_table_name()
    # Act
    response = client.delete(f"/api/v1/model-versions/{classification_model_version_id}")
    # Assert
    assert response.status_code == 200

    def get_table_names(conn):
        inspector = inspect(conn)
        return inspector.get_table_names()

    tables = await (await async_session.connection()).run_sync(get_table_names)

    assert mon_table_name not in tables
    assert ref_table_name not in tables


@pytest.mark.asyncio
async def test_get_schema(client: TestClient, classification_model_version_id: int):
    response = client.get(f"/api/v1/model-versions/{classification_model_version_id}/schema")
    assert response.status_code == 200
    assert response.json() == {
        "monitor_schema": {
            "type": "object",
            "required": ["a", "b", "_dc_sample_id", "_dc_time", "_dc_prediction", "_dc_prediction_probabilities"],
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
                "_dc_label": {
                    "type": ["string", "null"]
                },
                "_dc_sample_id": {
                    "type": "string"
                },
                "_dc_prediction": {
                    "type": "string"
                },
                "_dc_prediction_probabilities": {
                    "type": "array",
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
            "required": ["a", "b", "_dc_prediction", "_dc_prediction_probabilities"],
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
                    "type": "array",
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
    }
