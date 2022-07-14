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
async def test_add_check(classification_model, client: TestClient):
    # Arrange
    request = {
        "name": "checky",
        "config": {"class_name": "PerformanceReport",
                   "params": {"reduce": "mean"},
                   "module_name": "deepchecks.tabular.checks"
        },
    }

    # Act
    response = client.post(f"/api/v1/models/{classification_model.id}/check", json=request)
    # Assert
    assert response.status_code == 200
    assert response.json()["id"] == 1
