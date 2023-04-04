# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# import pytest
# from deepchecks_client import API
#
#
# @pytest.mark.asyncio
# async def test_api_instantiate():
#     """Since in the tests we skip the instantiate method, add manual test for it."""
#     # TODO: switch URL to app after we upgrade version (right now it raises 500 instead of 401)
#     api = API.instantiate(host='https://staging-v2.deepchecks.com', token='test-token')
#     response = api.say_hello(raise_on_status=False)

#     # The token is invalid therefore expecting 401
#     assert response.status_code == 401
#     # Validating the request was done right
#     assert response.request.url.path == '/api/v1/say-hello'
#     assert response.request.headers.get('Authorization') == 'Basic test-token'
