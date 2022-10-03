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
from deepchecks.vision.checks import SingleDatasetPerformance

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
async def test_create_model(deepchecks_sdk_client: DeepchecksClient):
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


@pytest.mark.asyncio
async def test_add_monitor(classification_vision_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id

    checks_name = list(model_client.get_checks().keys())[0]
    monitor_id = model_client.add_monitor(checks_name, 30 * 86400)
    assert monitor_id > 0


@pytest.mark.asyncio
async def test_add_alert(classification_vision_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value,
                                               create_defaults=False)
    assert model_client.model["id"] == classification_vision_model_id
    model_client.add_checks({"check": SingleDatasetPerformance()})

    alert_id = model_client.add_alert_rule("check", 0.3, 86400)
    assert alert_id == 1
    alert_id = model_client.add_alert_rule("check", 0.3, 86400, greater_than=False)
    assert alert_id == 2


@pytest.mark.asyncio
async def test_add_defaults(classification_vision_model_id, deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="vision classification model",
                                               task_type=TaskType.VISION_CLASSIFICATION.value,
                                               create_defaults=True)
    assert model_client.model["id"] == classification_vision_model_id
    assert len(model_client.get_checks()) == 4

    checks_added = model_client.add_checks({"check": SingleDatasetPerformance()})
    assert checks_added["check"] == 5
    monitor_id = model_client.add_monitor("check", 86400)
    assert monitor_id == 4
    alert_id = model_client.add_alert_rule("check", 0.3, 86400)
    assert alert_id == 4
