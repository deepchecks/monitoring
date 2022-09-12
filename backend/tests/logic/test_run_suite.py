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
from fastapi.testclient import TestClient

from tests.conftest import add_classification_data, add_vision_classification_data, send_reference_request


@pytest.mark.asyncio
async def test_tabular_classification_suite_with_ref(classification_model_version_id, client: TestClient):
    # Arrange
    sample = {"_dc_label": "2", "a": 11.1, "b": "ppppp", "_dc_prediction": "1"}
    send_reference_request(client, classification_model_version_id, [sample] * 100)
    resp, start_date, end_date = add_classification_data(classification_model_version_id, client)
    assert resp.status_code == 200
    # Act
    response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/suite-run",
                           json={"start_time": start_date.isoformat(),
                                 "end_time": end_date.isoformat()})
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_tabular_classification_suite_without_ref(classification_model_version_id, client: TestClient):
    # Arrange
    resp, start_date, end_date = add_classification_data(classification_model_version_id, client)
    assert resp.status_code == 200

    # Act
    response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/suite-run",
                           json={"start_time": start_date.isoformat(),
                                 "end_time": end_date.isoformat()})
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_vision_classification_suite_with_ref(classification_vision_model_version_id, client: TestClient):
    # Arrange
    sample = {"_dc_label": "2", "images Aspect Ratio": 0.2, "_dc_prediction": [0.1, 0.3, 0.6]}
    send_reference_request(client, classification_vision_model_version_id, [sample] * 100)
    resp, start_date, end_date = add_vision_classification_data(classification_vision_model_version_id, client)
    assert resp.status_code == 200
    # Act
    response = client.post(f"/api/v1/model-versions/{classification_vision_model_version_id}/suite-run",
                           json={"start_time": start_date.isoformat(),
                                 "end_time": end_date.isoformat()})
    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_vision_classification_suite_without_ref(classification_vision_model_version_id, client: TestClient):
    # Arrange
    resp, start_date, end_date = add_vision_classification_data(classification_vision_model_version_id, client)
    assert resp.status_code == 200
    # Act
    response = client.post(f"/api/v1/model-versions/{classification_vision_model_version_id}/suite-run",
                           json={"start_time": start_date.isoformat(),
                                 "end_time": end_date.isoformat()})
    # Assert
    assert response.status_code == 200
