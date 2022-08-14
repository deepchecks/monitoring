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
import pendulum as pdl


@pytest.mark.asyncio
async def test_add_model_version(classification_model_id, client: TestClient):
    # Arrange
    request = {
        "name": "xxx",
        "features": {
            "x": "numeric",
            "y": "categorical",
            "w": "boolean"
        },
        "non_features": {
            "a": "numeric",
            "b": "text"
        }
    }

    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/version", json=request)

    # Assert
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_run_suite_on_model_version(classification_model_version_id, client: TestClient):
    # Act
    request = {"end_time": pdl.now().isoformat(), "start_time": pdl.now().subtract(days=1).isoformat()}
    response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/suite-run", json=request)

    # Assert
    assert response.status_code == 200
