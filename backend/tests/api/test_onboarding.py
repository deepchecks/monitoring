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
from deepchecks_client.core.utils import TaskType
from fastapi.testclient import TestClient

from deepchecks_monitoring.api.v1.onboarding import Step
from tests.common import Payload, TestAPI, upload_classification_data


def get_onboarding_step(client: TestClient, model_name=None):
    response = client.get("/api/v1/onboarding", params=model_name and {"model_name": model_name})
    assert response.status_code == 200, response
    return response.json()


@pytest.mark.asyncio
async def test_start_onboarding(
    test_api: TestAPI,
    client: TestClient,
):
    assert get_onboarding_step(client)["step"] == Step.MODEL.value
    assert get_onboarding_step(client, model_name="moodel")["step"] == Step.MODEL.value
    model = t.cast(Payload, test_api.create_model(model={"name": "moodel", "task_type": TaskType.MULTICLASS.value}))
    test_api.create_model_version(model_id=model["id"])
    assert get_onboarding_step(client)["step"] == Step.DATA.value
    assert get_onboarding_step(client, model_name="moodel")["step"] == Step.DATA.value
    assert get_onboarding_step(client, model_name="moodel2")["step"] == Step.MODEL.value


@pytest.mark.asyncio
async def test_model_onboarding(
    test_api: TestAPI,
    client: TestClient,
    classification_model_version: Payload,
    classification_model: Payload
):
    resp, _, _ = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"],
        is_labeled=False
    )
    assert resp.status_code == 200, resp
    assert get_onboarding_step(client)["step"] == Step.LABELS.value
    resp, _, _ = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"]
    )
    assert resp.status_code == 200, resp
    assert get_onboarding_step(client)["step"] == Step.DONE.value
