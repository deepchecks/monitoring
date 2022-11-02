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

import numpy as np
import pandas as pd
import pytest
from deepchecks.core.errors import DeepchecksValueError
from deepchecks.tabular.dataset import Dataset
from hamcrest import assert_that, calling, raises, has_property, contains_exactly, is_

from deepchecks_client.tabular.utils import create_schema
from sqlalchemy import select

from deepchecks_monitoring.models.model_version import ModelVersion


@pytest.mark.asyncio
async def test_quick_version(deepchecks_sdk_client, async_session):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
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
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
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
    version.log_batch(data=data.iloc[:, :3], timestamps=timestamp,
                      predictions=pd.Series(pred), prediction_probas=pd.Series(proba.tolist()), labels=data['label'])
    # Assert
    version = deepchecks_sdk_client.get_model_version(model_name='test', version_name='ver')
    assert version.model_version_id == 1
    assert version.time_window_statistics(timestamp[0], timestamp[1] + 1) == \
           {'num_samples': 2, 'num_labeled_samples': 2}


@pytest.mark.asyncio
async def test_create_tabular_model_version_wrong_proba_length(deepchecks_sdk_client):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    assert_that(calling(deepchecks_sdk_client.create_tabular_model_version).with_args(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema_file=schema_file,
        task_type='multiclass',
        version_name='ver',
        model_classes=['0', '1', '2', '3']
    ),
        raises(DeepchecksValueError, 'Got 3 columns in reference_probas, but 4 model classes were provided.'))


@pytest.mark.asyncio
async def test_create_tabular_model_version_pass_proba_for_regression(deepchecks_sdk_client):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    assert_that(calling(deepchecks_sdk_client.create_tabular_model_version).with_args(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema_file=schema_file,
        task_type='regression',
        version_name='ver',
        model_classes=['0', '1', '2']
    ),
        raises(DeepchecksValueError, 'Can\'t pass probabilities for task_type regression'))


@pytest.mark.asyncio
async def test_create_tabular_model_version_pass_probas_wrong_type(deepchecks_sdk_client):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = [[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]]
    pred = [2, 1]

    # Act & Assert
    assert_that(calling(deepchecks_sdk_client.create_tabular_model_version).with_args(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema_file=schema_file,
        task_type='multiclass',
        version_name='ver',
        model_classes=['0', '1', '2']
    ),
        raises(DeepchecksValueError, 'reference_probas have to be numpy array but got list'))


@pytest.mark.asyncio
async def test_create_tabular_model_infer_model_classes(deepchecks_sdk_client):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act
    deepchecks_sdk_client.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema_file=schema_file,
        task_type='multiclass',
        version_name='ver'
    )

    # Assert
    model_ver = deepchecks_sdk_client.model(name='test', task_type='multiclass').version('ver')
    assert_that(model_ver, has_property('model_classes', contains_exactly('0', '1', '2')))


@pytest.mark.asyncio
async def test_create_tabular_without_probas_does_not_infer_classes(deepchecks_sdk_client):
    # Arrange
    dataset = Dataset(pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
                      label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    pred = [2, 1]

    # Act
    deepchecks_sdk_client.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        schema_file=schema_file,
        task_type='multiclass',
        version_name='ver'
    )

    # Assert
    model_ver = deepchecks_sdk_client.model(name='test', task_type='multiclass').version('ver')
    assert_that(model_ver, has_property('model_classes', is_(None)))
