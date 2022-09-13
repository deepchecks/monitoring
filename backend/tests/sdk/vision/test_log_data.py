# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import numpy as np
import pytest
from sqlalchemy import select

from client.deepchecks_client.vision.client import DeepchecksModelVersionClient
from deepchecks_monitoring.models.model_version import ModelVersion


@pytest.mark.asyncio
async def test_classification_log(vision_classification_model_version_client: DeepchecksModelVersionClient,
                                  async_session):
    vision_classification_model_version_client.log_sample('1', img=np.array([[[1, 2, 0], [3, 4, 0]]]),
                                                          prediction=[0.1, 0.3, 0.6], label=2)
    vision_classification_model_version_client.log_sample('2', img=np.array([[[1, 3, 5]]]),
                                                          prediction=[0.1, 0.3, 0.6], label=0)
    vision_classification_model_version_client.log_sample('3', img=np.array([[[7, 9, 0], [9, 6, 0]]]),
                                                          prediction=[0.1, 0.3, 0.6], label=1)
    vision_classification_model_version_client.send()

    model_version_query = await async_session.execute(
        select(ModelVersion)
        .where(ModelVersion.id ==
               vision_classification_model_version_client.model_version_id)
    )
    model_version: ModelVersion = model_version_query.scalars().first()
    stats = model_version.statistics
    assert stats['_dc_label'] == {'max': 2, 'min': 0}
    assert stats['images Aspect Ratio'] == {'max': 1, 'min': 0.5}

    mon_table = model_version.get_monitor_table(async_session)
    mon_arr = (await async_session.execute(select(mon_table))).all()
    mon_arr = [list(arr[:-2]) + [arr[-1]] for arr in mon_arr]
    assert mon_arr == [
        [0.5, 2, [0.1, 0.3, 0.6], '1'],
        [1.0, 0, [0.1, 0.3, 0.6], '2'],
        [0.5, 1, [0.1, 0.3, 0.6], '3'],
    ]


@pytest.mark.asyncio
async def test_detection_log(detection_vision_model_version_client: DeepchecksModelVersionClient,
                             async_session):
    detection_vision_model_version_client.log_sample('1', img=np.array([[[1, 2, 0], [3, 4, 0]]]),
                                                     prediction=[[0, 0, 1, 1, 0.6, 2]], label=[[1, 0, 0, 1, 1]])
    detection_vision_model_version_client.log_sample('2', img=np.array([[[1, 3, 5]]]),
                                                     prediction=[[0, 0, 1, 1, 0.6, 2]], label=[[0, 0, 0, 1, 1]])
    detection_vision_model_version_client.log_sample('3', img=np.array([[[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                                                                        [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                                                                        [[7, 9, 0], [9, 6, 0], [9, 6, 0]],
                                                                        [[7, 9, 0], [9, 6, 0], [9, 6, 0]]]),
                                                     prediction=[[0, 0, 2, 2, 0.6, 2]], label=[[2, 0, 0, 2, 2]])
    detection_vision_model_version_client.send()

    model_version_query = await async_session.execute(
        select(ModelVersion)
        .where(ModelVersion.id ==
               detection_vision_model_version_client.model_version_id)
    )
    model_version: ModelVersion = model_version_query.scalars().first()
    stats = model_version.statistics
    assert stats['images Aspect Ratio'] == {'max': 1.3333333333333333, 'min': 0.5}

    mon_table = model_version.get_monitor_table(async_session)
    mon_arr = (await async_session.execute(select(mon_table))).all()
    mon_arr = [list(arr[:-2]) + [arr[-1]] for arr in mon_arr]
    assert mon_arr == [
        [0.5, [], [[1, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6, 2]], '1'],
        [1, [], [[0, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6, 2]], '2'],
        [1.3333333333333333, [1], [[2, 0, 0, 2, 2]], [[0, 0, 2, 2, 0.6, 2]], '3'],
    ]
