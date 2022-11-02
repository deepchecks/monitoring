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
import pandas as pd
import pytest
from deepchecks.tabular.dataset import Dataset
from hamcrest import assert_that, calling, raises
from sqlalchemy import select
from starlette.testclient import TestClient

from client.deepchecks_client.tabular.client import DeepchecksModelVersionClient
from deepchecks_client import TaskType
from deepchecks_monitoring.models.model_version import ModelVersion
from tests.conftest import add_model, add_model_version


@pytest.mark.asyncio
async def test_classification_upload(multiclass_model_version_client: DeepchecksModelVersionClient, async_session):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]
    multiclass_model_version_client.upload_reference(Dataset(df, features=['a', 'b'], label='label'),
                                                     prediction_probas=proba,
                                                     predictions=pred)

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
async def test_classification_upload_without_classes(client, deepchecks_sdk_client, async_session):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    version_id = add_model_version(model_id, client, name='v1')
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    pred = [2, 1]

    # Act
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.MULTICLASS.value).version('v1')
    dc_client.upload_reference(ds, predictions=pred)

    # Assert
    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id == version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    ref_table = model_version.get_reference_table(async_session)
    ref_dict = (await async_session.execute(select(ref_table))).all()
    assert ref_dict == [
        (2.0, '2', None, '2', '2'),
        (2.0, '2', None, '0', '1')
    ]


@pytest.mark.asyncio
async def test_regression_upload(regression_model_version_client: DeepchecksModelVersionClient, async_session):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    pred = [2, 1]
    regression_model_version_client.upload_reference(Dataset(df, features=['a', 'b'], label='label'),
                                                     predictions=pred)

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
async def test_pass_probas_to_regression(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.REGRESSION)
    add_model_version(model_id, client, name='v1')
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.REGRESSION.value).version('v1')
    assert_that(calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
                raises(ValueError, 'Can\'t pass prediction_probas to regression task.'))


@pytest.mark.asyncio
async def test_pass_probas_without_model_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1')
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.MULTICLASS.value).version('v1')
    assert_that(calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
                raises(ValueError, 'Can\'t pass prediction_probas if version was not configured with model classes.'))


@pytest.mark.asyncio
async def test_pass_probas_different_length_than_model_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1', classes=['0', '1', '2'])
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.5, 0.1], [0.1, 0.6, 0.2, 0.1]])
    pred = [2, 1]

    # Act & Assert
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.MULTICLASS.value).version('v1')
    assert_that(calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
                raises(ValueError,
                       'number of classes in prediction_probas does not match number of classes in model classes.'))


@pytest.mark.asyncio
async def test_pass_new_predictions_not_in_model_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1', classes=['0', '1', '2'])
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [3, 1]

    # Act & Assert
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.MULTICLASS.value).version('v1')
    assert_that(calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
                raises(ValueError, 'Got predictions not in model classes: {\'3\'}'))


@pytest.mark.asyncio
async def test_pass_new_label_not_in_model_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1', classes=['0', '1', '2'])
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=4), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    dc_client = deepchecks_sdk_client.model(name='model', task_type=TaskType.MULTICLASS.value).version('v1')
    assert_that(calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
                raises(ValueError, 'Got labels not in model classes: {\'4\'}'))
