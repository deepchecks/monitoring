# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import typing as t

import pytest
import sqlalchemy as sa
from deepchecks.vision import VisionData
from deepchecks_client import DeepchecksClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.models import Model, ModelVersion


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
        "description": "Super duper cool model",
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

