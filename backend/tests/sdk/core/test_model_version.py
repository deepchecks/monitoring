# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pendulum as pdl
import pytest

from client.deepchecks_client.tabular.client import DeepchecksModelVersionClient


@pytest.mark.asyncio
async def test_regression_log(regression_model_version_client: DeepchecksModelVersionClient):
    regression_model_version_client.log_sample('1', prediction='2', label=2, a=2, b='2', c=1)
    regression_model_version_client.log_sample('2', prediction='1', label=2, a=3, b='4', c=-1)
    regression_model_version_client.log_sample('3', prediction='0', a=2, b='0', c=0)
    time = pdl.datetime(2021, 1, 1, 1, 1, 1)
    regression_model_version_client.log_sample('4', prediction='2', label=2, a=2, b='2', c=1, timestamp=time)
    regression_model_version_client.log_sample('5', prediction='1', label=2, a=3, b='4', c=-1, timestamp=time)
    regression_model_version_client.log_sample('6', prediction='0', a=2, b='0', c=0, timestamp=time)
    regression_model_version_client.send()

    stats = regression_model_version_client.time_window_statistics()
    assert stats == {'num_samples': 6, 'num_labeled_samples': 4}

    stats = regression_model_version_client.time_window_statistics(start_time=time.add(seconds=1))
    assert stats == {'num_samples': 3, 'num_labeled_samples': 2}
