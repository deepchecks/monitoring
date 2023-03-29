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
import time

import numpy as np
import pandas as pd
import pytest
from deepchecks.tabular import Dataset
from deepchecks_client import DeepchecksClient, DeepchecksModelVersionClient
from deepchecks_client.tabular.utils import create_schema, describe_dataset, read_schema
from hamcrest import assert_that, calling, raises
from httpx import HTTPError
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models import ModelVersion, TaskType
from tests.common import Payload


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
    classification_model: Payload,
    classification_model_version: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == classification_model["id"]
    model_version_client = model_client.version(classification_model_version["name"])
    assert model_version_client.model_version_id == classification_model_version["id"]


def test_get_model_version_with_features(
        classification_model: Payload,
        classification_model_version: Payload,
        deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    schema_dict = {
        "features": {"a": "numeric", "b": "categorical"},
        "additional_data": {"c": "numeric"}
    }
    assert model_client.model["id"] == classification_model["id"]
    model_version_client = model_client.version(classification_model_version["name"], schema_dict)
    assert model_version_client.model_version_id == classification_model_version["id"]


def test_get_model_version_with_wrong_features(
        classification_model: Payload,
        classification_model_version: Payload,
        deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    schema_dict = {
        "features": {"a": "numeric", "not-exist": "categorical"},
        "additional_data": {"c": "numeric"}
    }
    assert model_client.model["id"] == classification_model["id"]

    assert_that(
        calling(model_client.version).with_args(
            classification_model_version["name"],
            schema_dict
        ),
        raises(ValueError)
    )


def test_add_model_version(
        classification_model: Payload,
        deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    schema_dict = {
        "features": {"a": "numeric", "b": "categorical"},
        "additional_data": {"c": "numeric"}
    }
    assert model_client.model["id"] == classification_model["id"]
    model_version_client = model_client.version("v1", schema_dict)
    assert model_version_client.model_version_id == 1
    model_version_client = model_client.version("v2", schema_dict)
    assert model_version_client.model_version_id == 2


def test_create_read_schema_string_io(
    classification_model: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == classification_model["id"]
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
        "additional_data": {
            "bool_feature": "boolean",
            "index_col": "integer"
        }
    }

    model_version_client = model_client.version("v1",schema_dict)
    assert model_version_client.model_version_id == 1


def test_create_read_schema_file(
    classification_model: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )

    assert model_client.model["id"] == classification_model["id"]

    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    file = "test_schema.yaml"
    create_schema(dataset, file)
    schema_dict = read_schema(file)
    model_version_client = model_client.version("v1",schema_dict)
    assert model_version_client.model_version_id == 1


@pytest.mark.asyncio
async def test_model_version_feature_importance_update(
        deepchecks_sdk: DeepchecksClient,
        async_session: AsyncSession
):
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    dataset_schema = describe_dataset(dataset)

    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    version_client = model_client.version(
        name="test-version",
        schema=dataset_schema
    )

    feature_importance = {
        feature: 0.5
        for feature in dataset_schema["features"]
    }

    version_client.set_feature_importance(feature_importance)
    model_version = await async_session.get(ModelVersion, version_client.model_version_id)

    assert model_version is not None
    assert isinstance(model_version.feature_importance, dict)
    assert model_version.feature_importance == feature_importance


@pytest.mark.asyncio
async def test_model_version_feature_importance_set_fail_if_data_and_monitors_exist(deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    ref_dataset = Dataset(df={"a": [2], "b": ["2"], "c": [1]})
    schema_file_path = "schema_file.yaml"
    create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)

    model_version_client = model_client.version(name="test", schema=schema_file_path)
    model_version_client.log_sample(
        sample_id="1",
        prediction="2",
        values={"a": 2, "b": "2", "c": 1}
    )
    model_version_client.send()
    # Making sure data is ingested in the system because otherwise the test will fail
    timeout = time.time() + 5  # 5 seconds from now
    while True:
        prod_data = model_version_client.get_production_data(start_time=0, end_time=int(time.time()), rows_count=1)
        if len(prod_data.index) > 0 or time.time() > timeout:
            break
    assert len(prod_data.index) > 0

    feature_importance = {"a": 0.5, "b": 0.4, "c": 0.1}
    with pytest.raises(ValueError):
        model_version_client.set_feature_importance(feature_importance)


@pytest.mark.asyncio
async def test_model_version_feature_importance_set_success_if_data_but_no_monitors_exist(
        deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="Model without monitor",
        task_type=TaskType.MULTICLASS.value,
        create_model_defaults=False
    )
    assert model_client.model["id"] == 1

    ref_dataset = Dataset(df={"a": [2], "b": ["2"], "c": [1]})
    schema_file_path = "schema_file.yaml"
    create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
    model_version_client = model_client.version(name="test", schema=schema_file_path)
    model_version_client.log_sample(
        sample_id="1",
        prediction="2",
        values={"a": 2, "b": "2", "c": 1}
    )
    model_version_client.send()

    # Making sure data is ingested in the system because otherwise the test will fail
    timeout = time.time() + 5  # 5 seconds from now
    while True:
        prod_data = model_version_client.get_production_data(start_time=0, end_time=int(time.time()), rows_count=1)
        if len(prod_data.index) > 0 or time.time() > timeout:
            break
    assert len(prod_data.index) > 0

    model_with_monitors = deepchecks_sdk.get_or_create_model(
        name="Model with monitor",
        task_type=TaskType.MULTICLASS.value
    )
    assert model_with_monitors.model["id"] != model_client.model["id"]

    feature_importance = {"a": 0.5, "b": 0.4, "c": 0.1}
    # Assert
    model_version_client.set_feature_importance(feature_importance)


@pytest.mark.asyncio
async def test_model_version_upload_reference_data_fail_if_exists(
    multiclass_model_version_client: DeepchecksModelVersionClient,
):
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b="2", c=1, label=2), dict(a=3, b="3", c=2, label=0)]),
        label="label",
        cat_features=["b"]
    )


    proba = np.asarray([[0.2, 0.4, 0.2], [0.4, 0.2, 0.2]])
    pred = [2, 1]
    multiclass_model_version_client.upload_reference(dataset, pred, proba)

    with pytest.raises(ValueError):
        multiclass_model_version_client.upload_reference(dataset, pred, proba)


def test_model_version_deletion(deepchecks_sdk: DeepchecksClient):
    df = _get_wierd_df()
    dataset = Dataset(df, label="classification_label", features=["binary_feature", "fake_bool_feature"])
    dataset_schema = describe_dataset(dataset)

    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    version_client = model_client.version(
        name="test-version",
        schema=dataset_schema,
    )

    deepchecks_sdk.delete_model_version(
        model_name="classification model",
        version_name="test-version"
    )

    with pytest.raises(HTTPError):
        deepchecks_sdk.api.fetch_model_version_by_id(version_client.model_version_id)
