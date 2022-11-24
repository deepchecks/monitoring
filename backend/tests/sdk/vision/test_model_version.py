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
from deepchecks_client.core.utils import ColumnType

from client.deepchecks_client import DeepchecksClient
from deepchecks_monitoring.models.model import TaskType


@pytest.mark.asyncio
async def test_get_model_version_client(classification_vision_model_id,
                                        classification_vision_model_version_id,
                                        deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="vision classification model",
                                                             task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id
    model_version_client = model_client.version("v1")
    assert model_version_client.model_version_id == classification_vision_model_version_id


@pytest.mark.asyncio
async def test_add_model_version_client(classification_vision_model_id,
                                        deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.get_or_create_model(name="vision classification model",
                                                             task_type=TaskType.VISION_CLASSIFICATION.value)
    assert model_client.model["id"] == classification_vision_model_id
    model_version_client = model_client.version("v1", label_map={0: "ah", 1: "ooh", 2: "weee"},
                                                additional_data_schema={"is_good": ColumnType.BOOLEAN.value})
    assert model_version_client.model_version_id == 1
