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
from sqlalchemy import select

from client.deepchecks_client.tabular.client import DeepchecksModelVersionClient
from deepchecks_monitoring.models.model_version import ModelVersion


@pytest.mark.asyncio
async def test_classification_log(multiclass_model_version_client: DeepchecksModelVersionClient, async_session):
    multiclass_model_version_client.log_sample('1', prediction='2',
                                               prediction_proba=[0.1, 0.3, 0.6], label=2,
                                               a=2, b='2', c=1)
    multiclass_model_version_client.log_sample('2', prediction='1',
                                               prediction_proba=[0.1, 0.6, 0.1], label=2,
                                               a=3, b='4', c=-1)
    multiclass_model_version_client.log_sample('3', prediction='0',
                                               prediction_proba=[0.1, 0.6, 0.1], label=1,
                                               a=2, b='0', c=0)
    multiclass_model_version_client.send()

    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id ==
                                                             multiclass_model_version_client.model_version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    stats = model_version.statistics
    assert set(stats['_dc_label']['values']) == set(['1', '2'])
    assert set(stats['_dc_prediction']['values']) == set(['0', '1', '2'])
    assert set(stats['b']['values']) == set(['4', '0', '2'])
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_log(regression_model_version_client: DeepchecksModelVersionClient, async_session):
    regression_model_version_client.log_sample('1', prediction='2', label=2,
                                               a=2, b='2', c=1)
    regression_model_version_client.log_sample('2', prediction='1', label=2,
                                               a=3, b='4', c=-1)
    regression_model_version_client.log_sample('3', prediction='0', label=1,
                                               a=2, b='0', c=0)
    regression_model_version_client.send()

    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id ==
                                                             regression_model_version_client.model_version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    stats = model_version.statistics
    assert stats['_dc_label'] == {'max': 2.0, 'min': 1.0}
    assert stats['_dc_prediction'] == {'max': 2.0, 'min': 0.0}
    assert set(stats['b']['values']) == set(['4', '0', '2'])
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}
