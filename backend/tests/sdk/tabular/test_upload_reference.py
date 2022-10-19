# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import io

import pandas as pd
import pytest
from deepchecks.tabular.dataset import Dataset
from deepchecks_client.tabular.utils import create_schema
from sqlalchemy import select

from client.deepchecks_client.tabular.client import DeepchecksModelVersionClient
from deepchecks_monitoring.models.model_version import ModelVersion


@pytest.mark.asyncio
async def test_classification_upload(multiclass_model_version_client: DeepchecksModelVersionClient, async_session):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    proba = [[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]]
    pred = [2, 1]
    multiclass_model_version_client.upload_reference(Dataset(df, features=['a', 'b'], label='label'),
                                                     prediction_proba=proba,
                                                     prediction=pred)

    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id ==
                                                             multiclass_model_version_client.model_version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    ref_table = model_version.get_reference_table(async_session)
    ref_dict = (await async_session.execute(select(ref_table))).all()
    assert ref_dict == [
        (2.0, '2', None, '2', '2', [0.1, 0.30000000000000004, 0.6000000000000001]),
        (2.0, '2', None, '0', '1', [0.1, 0.6000000000000001, 0.30000000000000004]),
    ]


@pytest.mark.asyncio
async def test_regression_upload(regression_model_version_client: DeepchecksModelVersionClient, async_session):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    pred = [2, 1]
    regression_model_version_client.upload_reference(Dataset(df, features=['a', 'b'], label='label'),
                                                     prediction=pred)

    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id ==
                                                             regression_model_version_client.model_version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    ref_table = model_version.get_reference_table(async_session)
    ref_dict = (await async_session.execute(select(ref_table))).all()
    assert ref_dict == [
        (2.0, '2', None, 2, 2),
        (2.0, '2', None, 0, 1),
    ]


@pytest.mark.asyncio
async def test_quick_version(deepchecks_sdk_client, async_session):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = [[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]]
    pred = [2, 1]
    # Act
    deepchecks_sdk_client.create_tabular_model_version(model_name='test',
                                                       reference_dataset=dataset,
                                                       reference_predictions=pred,
                                                       reference_probas=proba,
                                                       schema_file=schema_file,
                                                       task_type='multiclass',
                                                       version_name='ver')
    # Assert
    model = deepchecks_sdk_client.model(name='test', task_type='multiclass')
    assert model.get_versions() == {'ver': 1}
    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id == 1))
    model_version: ModelVersion = model_version_query.scalars().first()
    ref_table = model_version.get_reference_table(async_session)
    ref_data = (await async_session.execute(select(ref_table))).all()
    assert len(ref_data) == 2
    assert len(ref_data[0]) == 6
    assert len(ref_data[0][5]) == 3


@pytest.mark.asyncio
async def test_quick_start_flow(deepchecks_sdk_client):
    # Arrange
    data = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    dataset = Dataset(data, label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = [[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]]
    pred = [2, 1]
    timestamp = pd.Series([1662076799, 1662076899])
    # Act
    version = deepchecks_sdk_client.create_tabular_model_version(model_name='test',
                                                                 reference_dataset=dataset,
                                                                 reference_predictions=pred,
                                                                 reference_probas=proba,
                                                                 schema_file=schema_file,
                                                                 task_type='multiclass',
                                                                 version_name='ver')
    version.log_batch(data=data.iloc[:, :3], timestamp=timestamp,
                      prediction=pd.Series(pred), prediction_proba=pd.Series(proba), label=data['label'])
    # Assert
    version = deepchecks_sdk_client.get_model_version(model_name='test', version_name='ver')
    assert version.model_version_id == 1
    assert version.time_window_statistics(timestamp[0], timestamp[1] + 1) == \
           {'num_samples': 2, 'num_labeled_samples': 2}
