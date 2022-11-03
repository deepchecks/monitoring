# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pytest

from client.deepchecks_client import DeepchecksClient
from deepchecks_monitoring.models.model import TaskType


@pytest.mark.asyncio
async def test_get_model_version_client(classification_vision_model_id,
                                        classification_vision_model_version_id,
                                        deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id
    model_version_client = model_client.version("v1")
    assert model_version_client.model_version_id == classification_vision_model_version_id


@pytest.mark.asyncio
async def test_add_model_version_client(classification_vision_model_id,
                                        vision_classification_and_prediction,
                                        deepchecks_sdk_client: DeepchecksClient):
    vision_data, _ = vision_classification_and_prediction
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id
    model_version_client = model_client.version("v1",
                                                vision_data=vision_data)
    assert model_version_client.model_version_id == 1
