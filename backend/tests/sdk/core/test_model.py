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
from deepchecks_client import DeepchecksClient


@pytest.mark.asyncio
async def test_create_delete_model(deepchecks_sdk_client: DeepchecksClient):
    model = deepchecks_sdk_client.get_or_create_model(name='test_model', task_type='binary')
    model2 = deepchecks_sdk_client.get_or_create_model('test_model')
    assert model is model2

    # Delete
    deepchecks_sdk_client.delete_model('test_model')

    with pytest.raises(ValueError) as exc_info:
        deepchecks_sdk_client.get_model_version('test_model', 'ver1')
    assert exc_info.value.args[0] == 'Model with name test_model does not exist.'
