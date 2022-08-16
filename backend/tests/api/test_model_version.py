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
