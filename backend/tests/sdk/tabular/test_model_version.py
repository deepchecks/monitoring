# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import io

import numpy as np
import pandas as pd
import pytest
from deepchecks.tabular import Dataset
from deepchecks_client import DeepchecksClient
from deepchecks_client.tabular.utils import _describe_dataset, create_schema, read_schema
from httpx import HTTPError
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.models import ModelVersion, TaskType


def _get_wierd_df():
    return pd.DataFrame(
        {
            "index_col": list(range(1000)),
            "binary_feature": np.random.choice([0, 1], size=1000),
            "bool_feature": np.random.choice([True, False], size=1000),
            "fake_bool_feature": np.random.choice([True, False, 0, 1, np.nan],
                                                  p=[0.4, 0.4, 0.1, 0.05, 0.05], size=1000),
            "classification_label": np.random.choice([0, 1, 9, 8], size=1000),
        }
    )


def test_get_model_version(
        classification_model_id,
        classification_model_version_id,
        deepchecks_sdk_client: DeepchecksClient
):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version("v1")
    assert model_version_client.model_version_id == classification_model_version_id


def test_get_model_version_with_features(
        classification_model_id,
        classification_model_version_id,
        deepchecks_sdk_client: DeepchecksClient
):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version(
        "v1",
        features={"a": "numeric", "b": "categorical"},
        non_features={"c": "numeric"}
    )
    assert model_version_client.model_version_id == classification_model_version_id


def test_add_model_version(
        classification_model_id,
        deepchecks_sdk_client: DeepchecksClient
):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version("v1",
                                                features={"a": "numeric", "b": "categorical"},
                                                non_features={"c": "numeric"})
    assert model_version_client.model_version_id == 1
    model_version_client = model_client.version("v2",
                                                features={"a": "numeric", "b": "categorical"},
                                                non_features={"c": "numeric"})
    assert model_version_client.model_version_id == 2


def test_create_read_schema_string_io(classification_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    file = io.StringIO()
    create_schema(dataset, file)
    schema_dict = read_schema(file)

    assert schema_dict == {
        "features": {
            "binary_feature": "categorical",
            "fake_bool_feature": "categorical"
        },
        "non_features": {
            "bool_feature": "boolean",
            "index_col": "integer"
        }
    }

    model_version_client = model_client.version(
        "v1",
        features=schema_dict["features"],
        non_features=schema_dict["non_features"]
    )

    assert model_version_client.model_version_id == 1


def test_create_read_schema_file(classification_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="classification model",
                                                             task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    file = "test_schema.yaml"
    create_schema(dataset, file)
    schema_dict = read_schema(file)
    model_version_client = model_client.version(
        "v1",
        features=schema_dict["features"],
        non_features=schema_dict["non_features"]
    )
    assert model_version_client.model_version_id == 1


@pytest.mark.asyncio
async def test_model_version_feature_importance_update(
        deepchecks_sdk_client: DeepchecksClient,
        async_session: AsyncSession
):
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    dataset_schema = _describe_dataset(dataset)

    model_client = deepchecks_sdk_client.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    version_client = model_client.version(
        name="test-version",
        features=dataset_schema["features"],
        non_features=dataset_schema["non_features"],
    )

    feature_importance = {feature: 0.5 for feature in
                          dataset_schema["features"].keys()}  # pylint: disable=consider-iterating-dictionary
    version_client.set_feature_importance(feature_importance)

    model_version = await async_session.get(ModelVersion, version_client.model_version_id)
    assert model_version is not None
    assert isinstance(model_version.feature_importance, dict)
    assert model_version.feature_importance == feature_importance


def test_model_version_deletion(deepchecks_sdk_client: DeepchecksClient):
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    dataset_schema = _describe_dataset(dataset)

    model_client = deepchecks_sdk_client.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    version_client = model_client.version(
        name="test-version",
        features=dataset_schema["features"],
        non_features=dataset_schema["non_features"],
    )

    deepchecks_sdk_client.delete_model_version(
        model_name="classification model",
        version_name="test-version"
    )

    with pytest.raises(HTTPError):
        deepchecks_sdk_client.api.fetch_model_version_by_id(version_client.model_version_id)
