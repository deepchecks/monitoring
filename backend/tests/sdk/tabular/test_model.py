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
from deepchecks.tabular.checks import SingleDatasetPerformance
from deepchecks_client import DeepchecksClient

from deepchecks_monitoring.schema_models.model import TaskType
from tests.common import Payload


def test_model_client_instantiation(
    classification_model: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        description="test",
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == classification_model["id"]


def test_model_client_instantiation_with_name(
    classification_model: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == classification_model["id"]


def test_model_creation(deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model 2",
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == 1
    assert model_client.model["name"] == "classification model 2"

    model = deepchecks_sdk.api.fetch_model_by_name("classification model 2")

    assert model == {
        "id": 1,
        "name": "classification model 2",
        "task_type": "multiclass",
        "description": None,
        "alerts_delay_labels_ratio": 1.0,
        "alerts_delay_seconds": 259200
    }


def test_monitor_creation(deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value
    )
    assert model_client.model["id"] == 1
    checks_name = list(model_client.get_checks().keys())[0]
    monitor_id = model_client.add_monitor(checks_name, frequency=86400, lookback=86400 * 30)
    assert monitor_id > 0


def test_alert_rule_creation_for_existing_monitor(deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value,
        create_model_defaults=True
    )
    assert model_client.model["id"] == 1

    checks_name = list(model_client.get_checks().keys())[0]
    monitor_id = model_client.add_monitor(checks_name, frequency=86400, lookback=86400 * 30)
    assert monitor_id > 0
    alert_id = model_client.add_alert_rule_on_existing_monitor(monitor_id, 0.3)
    assert alert_id == 8


async def test_alert_rule_creation_for_new_monitor(
    classification_model: Payload,
    deepchecks_sdk: DeepchecksClient
):
    model_client = deepchecks_sdk.get_or_create_model(
        name=classification_model["name"],
        task_type=TaskType.MULTICLASS.value,
        create_model_defaults=False
    )
    assert model_client.model["id"] == classification_model["id"]
    model_client.add_checks({"check": SingleDatasetPerformance()})

    alert_id = model_client.add_alert_rule("check", 0.3, 86400)
    assert alert_id == 1
    alert_id = model_client.add_alert_rule("check", 0.3, 86400, greater_than=False)
    assert alert_id == 2


@pytest.mark.asyncio
async def test_default_checks_creation(deepchecks_sdk: DeepchecksClient):
    model_client = deepchecks_sdk.get_or_create_model(
        name="classification model",
        task_type=TaskType.MULTICLASS.value,
        create_model_defaults=True
    )
    assert model_client.model["id"] == 1
    assert len(model_client.get_checks()) == 9

    model_client.add_checks({"check": SingleDatasetPerformance()})
    assert "check" in model_client.get_checks().keys()
    monitor_id = model_client.add_monitor("check", 86400)
    assert monitor_id == 9
    alert_id = model_client.add_alert_rule("check", 0.3, 86400)
    assert alert_id == 8
