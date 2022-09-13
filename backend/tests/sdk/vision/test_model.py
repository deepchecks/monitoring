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

from client.deepchecks_client.core.client import DeepchecksClient
from deepchecks_monitoring.models.model import TaskType


@pytest.mark.asyncio
async def test_get_model_client(classification_vision_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               description="test", task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id


@pytest.mark.asyncio
async def test_get_model_client_just_name(classification_vision_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id


@pytest.mark.asyncio
async def test_get_model_create(deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model 2",
                                               task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == 1
    assert model_client.model["name"] == "vision classification model 2"

    response = deepchecks_sdk_client.session.get("models/")
    assert response.status_code == 200
    resp_json = response.json()
    assert len(resp_json) == 1
    assert resp_json[0] == {"id": 1, "name": "vision classification model 2", "task_type": "vision_classification",
                            "description": None, "alerts_count": 0, "latest_time": None}
