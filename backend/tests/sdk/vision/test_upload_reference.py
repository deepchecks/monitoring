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

from client.deepchecks_client.vision.client import DeepchecksModelVersionClient
from deepchecks_monitoring.models.model_version import ModelVersion


async def get_classification_reference_table_as_array(model_version, async_session):
    ref_table = model_version.get_reference_table(async_session)
    ref_arr = [dict(row) for row in (await async_session.execute(select(ref_table))).all()]
    return [(row['images Aspect Ratio'], row['_dc_label'], row['_dc_prediction'])
            for row in ref_arr]


@pytest.mark.asyncio
async def test_classification_upload_reference(vision_classification_model_version_client: DeepchecksModelVersionClient,
                                               vision_classification_and_prediction,
                                               async_session):
    vision_classification_model_version_client.upload_reference(*vision_classification_and_prediction)

    model_version_query = await async_session.execute(
        select(ModelVersion)
        .where(ModelVersion.id ==
               vision_classification_model_version_client.model_version_id)
    )
    model_version: ModelVersion = model_version_query.scalars().first()
    ref_arr = await get_classification_reference_table_as_array(model_version, async_session)
    assert ref_arr == [
        (0.5, 2, [0.1, 0.30000000000000004, 0.6000000000000001]),
        (1.0, 0, [0.6000000000000001, 0.30000000000000004, 0.1]),
        (0.5, 1, [0.1, 0.6000000000000001, 0.30000000000000004]),
    ]


@pytest.mark.asyncio
async def test_detection_upload_reference(detection_vision_model_version_client: DeepchecksModelVersionClient,
                                          vision_detection_and_prediction,
                                          async_session):
    detection_vision_model_version_client.upload_reference(*vision_detection_and_prediction)

    model_version = await async_session.get(
        ModelVersion,
        detection_vision_model_version_client.model_version_id
    )

    ref_table = model_version.get_reference_table(async_session)
    ref_arr = [dict(row) for row in (await async_session.execute(select(ref_table))).all()]
    ref_arr = [(row['images Aspect Ratio'], row['partial_images Aspect Ratio'], row['_dc_label'], row['_dc_prediction'])
               for row in ref_arr]
    assert ref_arr == [
        (0.5, [], [[1, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6000000000000001, 2]]),
        (1, [], [[0, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6000000000000001, 2]]),
        (1.3333333333000001, [1], [[2, 0, 0, 2, 2]], [[0, 0, 2, 2, 0.6000000000000001, 2]]),
    ]


@pytest.mark.asyncio
async def test_detection_upload_reference_raw(detection_vision_model_version_client: DeepchecksModelVersionClient,
                                              vision_detection_and_prediction_raw,
                                              async_session):
    imgs, labels, predictions = vision_detection_and_prediction_raw
    detection_vision_model_version_client.upload_reference_batch(images=imgs, labels=labels,
                                                                 predictions=predictions.values())
    detection_vision_model_version_client.upload_reference_batch(images=imgs, labels=labels,
                                                                 predictions=predictions.values())

    model_version = await async_session.get(
        ModelVersion,
        detection_vision_model_version_client.model_version_id
    )

    ref_table = model_version.get_reference_table(async_session)
    ref_arr = [dict(row) for row in (await async_session.execute(select(ref_table))).all()]
    ref_arr = [(row['images Aspect Ratio'], row['partial_images Aspect Ratio'], row['_dc_label'], row['_dc_prediction'])
               for row in ref_arr]
    assert ref_arr == [
        (0.5, [], [[1, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6000000000000001, 2]]),
        (1, [], [[0, 0, 0, 1, 1]], [[0, 0, 1, 1, 0.6000000000000001, 2]]),
        (1.3333333333000001, [1], [[2, 0, 0, 2, 2]], [[0, 0, 2, 2, 0.6000000000000001, 2]]),
    ] * 2
