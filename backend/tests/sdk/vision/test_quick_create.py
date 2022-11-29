# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import copy
import typing as t

import pytest
import sqlalchemy as sa
from deepchecks.vision import VisionData
from deepchecks_client import DeepchecksClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models import Model, ModelVersion
from tests.sdk.vision.test_upload_reference import get_classification_reference_table_as_array


@pytest.mark.asyncio
async def test_version_creation(
    deepchecks_sdk_client: DeepchecksClient,
    async_session: AsyncSession,
    vision_classification_and_prediction: t.Tuple[VisionData, t.Dict[int, t.List[float]]]
):
    # Prepare
    dataset, predictions = vision_classification_and_prediction
    kwargs = {
        "model_name": "New Model",
        "version_name": "Version#1",
        "label_map": {0: "ah", 1: "ooh", 2: "weee"},
        "description": "Super duper cool model",
        "additional_data": {0: {"is_good": True},
                            1: {"is_good": True},
                            2: {"is_good": False}},
        "reference_dataset": dataset,
        "reference_predictions": predictions
    }

    # Act
    version_client = deepchecks_sdk_client.create_vision_model_version(**kwargs)

    # Assert
    model = await async_session.get(Model, version_client.model["id"])
    version = await async_session.get(ModelVersion, version_client.model_version_id)

    assert model is not None
    assert model.name == kwargs["model_name"]
    assert model.description == kwargs["description"]
    assert version is not None
    assert version.name == kwargs["version_name"]

    reference_table = version.get_reference_table(async_session)

    n_of_reference_records = await async_session.scalar(
        sa.select(sa.func.count())
        .select_from(reference_table)
    )

    assert n_of_reference_records == dataset.num_samples


@pytest.mark.asyncio
async def test_version_creation_list_prediciton(
    deepchecks_sdk_client: DeepchecksClient,
    async_session: AsyncSession,
    vision_classification_and_list_prediction: t.Tuple[VisionData, t.Dict[int, t.List[float]]]
):
    # Prepare
    dataset, predictions = vision_classification_and_list_prediction
    kwargs = {
        "model_name": "New Model",
        "version_name": "Version#1",
        "description": "Super duper cool model",
        "additional_data": {0: {"is_good": True},
                            1: {"is_good": True},
                            2: {"is_good": False}},
        "additional_data_schema": {"is_good": "boolean"},
        "reference_dataset": dataset,
        "reference_predictions": predictions
    }

    # Act
    version_client = deepchecks_sdk_client.create_vision_model_version(**kwargs)

    # Assert
    model = await async_session.get(Model, version_client.model["id"])
    version = await async_session.get(ModelVersion, version_client.model_version_id)

    assert model is not None
    assert model.name == kwargs["model_name"]
    assert model.description == kwargs["description"]
    assert version is not None
    assert version.name == kwargs["version_name"]

    reference_table = version.get_reference_table(async_session)

    n_of_reference_records = await async_session.scalar(
        sa.select(sa.func.count())
        .select_from(reference_table)
    )

    assert n_of_reference_records == dataset.num_samples


@pytest.mark.asyncio
async def test_version_creation_list_prediciton_same_as_regular(
    deepchecks_sdk_client: DeepchecksClient,
    async_session: AsyncSession,
    vision_classification_and_prediction_big: t.Tuple[VisionData, t.Dict[int, t.List[float]]]
):
    dataset, predictions = vision_classification_and_prediction_big

    # Get dict prediction table
    kwargs = {
        "model_name": "New Model",
        "version_name": "Version#dict",
        "description": "Super duper cool model",
        "reference_dataset": copy.copy(dataset),
        "reference_predictions": predictions
    }

    dict_version_client = deepchecks_sdk_client.create_vision_model_version(**kwargs)
    dict_version = await async_session.get(ModelVersion, dict_version_client.model_version_id)

    dict_reference_records = \
        await get_classification_reference_table_as_array(dict_version, async_session)

    # Get list prediction table
    kwargs = {
        "model_name": "New Model",
        "version_name": "Version#list",
        "description": "Super duper cool model",
        "reference_dataset": dataset,
        "reference_predictions": list(predictions.values())
    }

    list_version_client = deepchecks_sdk_client.create_vision_model_version(**kwargs)
    list_version = await async_session.get(ModelVersion, list_version_client.model_version_id)

    list_reference_records = await get_classification_reference_table_as_array(list_version, async_session)

    # Assert
    assert dict_version_client.model_version_id != list_version_client.model_version_id
    assert dict_reference_records == list_reference_records
