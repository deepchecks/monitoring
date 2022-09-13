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
async def test_get_model_version_client(classification_model_id,
                                        classification_model_version_id,
                                        deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="classification model", task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version("v1")
    assert model_version_client.model_version_id == classification_model_version_id


@pytest.mark.asyncio
async def test_get_model_version_client_with_features(classification_model_id,
                                                      classification_model_version_id,
                                                      deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="classification model", task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version("v1",
                                                features={"a": "numeric", "b": "categorical"},
                                                non_features={"c": "numeric"})
    assert model_version_client.model_version_id == classification_model_version_id


@pytest.mark.asyncio
async def test_add_model_version_client(classification_model_id,
                                            deepchecks_sdk_client: DeepchecksClient):
    model_client = deepchecks_sdk_client.model(name="classification model", task_type=TaskType.MULTICLASS.value)
    assert model_client.model["id"] == classification_model_id
    model_version_client = model_client.version("v1",
                                                features={"a": "numeric", "b": "categorical"},
                                                non_features={"c": "numeric"})
    assert model_version_client.model_version_id == 1
