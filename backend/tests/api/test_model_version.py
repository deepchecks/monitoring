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

from deepchecks_monitoring.api.v1.model_version import create_version
from deepchecks_monitoring.schemas.model_version import NewVersionSchema


@pytest.mark.asyncio
async def test_add_model_version(classification_model, async_session):
    # Arrange
    request = {
        "name": "xxx",
        "column_types": {
            "x": "number",
            "y": "string",
            "w": "boolean"
        },
        "column_roles": {
            "x": "numeric_feature",
            "y": "categorical_feature",
            "w": "tag"
        }
    }
    request_schema = NewVersionSchema(**request)

    # Act
    response = await create_version(classification_model.id, request_schema, async_session)
    # Assert
    assert response == 200
    # assert response.json() == {"id": 1, "name": "44", "description": None, "task_type": "classification"}
