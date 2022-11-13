# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pandas as pd
import pendulum as pdl
import pytest
from hamcrest import assert_that, calling, raises
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.testclient import TestClient

from client.deepchecks_client.tabular.client import DeepchecksModelVersionClient
from deepchecks_client import TaskType
from deepchecks_monitoring.models.column_type import SAMPLE_ID_COL
from deepchecks_monitoring.models.model_version import ModelVersion
from tests.conftest import add_model, add_model_version


@pytest.mark.asyncio
async def test_classification_log(
        multiclass_model_version_client: DeepchecksModelVersionClient,
        async_session: AsyncSession
):
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
async def test_classification_log_without_probas(
        deepchecks_sdk_client, client: TestClient, async_session: AsyncSession
):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    version_id = add_model_version(model_id, client, name='v1')
    dc_client = deepchecks_sdk_client.get_or_create_model(name='model', task_type=TaskType.MULTICLASS.value).version(
        'v1')

    # Act
    dc_client.log_sample('1', prediction='2', label=2, a=2, b='2', c=1)
    dc_client.log_sample('2', prediction='1', label=2, a=3, b='4', c=-1)
    dc_client.log_sample('3', prediction='0', label=1, a=2, b='0', c=0)
    dc_client.send()

    # Assert
    model_version_query = await async_session.execute(select(ModelVersion)
                                                      .where(ModelVersion.id == version_id))
    model_version: ModelVersion = model_version_query.scalars().first()
    stats = model_version.statistics
    assert set(stats['_dc_label']['values']) == {'1', '2'}
    assert set(stats['_dc_prediction']['values']) == {'0', '1', '2'}
    assert set(stats['b']['values']) == {'4', '0', '2'}
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


@pytest.mark.asyncio
async def test_classification_batch_log(
        multiclass_model_version_client: DeepchecksModelVersionClient,
        async_session: AsyncSession
):
    multiclass_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([
            pdl.now().int_timestamp,
            pdl.now().int_timestamp,
            pdl.now().int_timestamp
        ], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']),
        prediction_probas=pd.Series([[0.1, 0.3, 0.6], [0.1, 0.6, 0.1], [0.1, 0.6, 0.1]], index=['1', '2', '3']),
        labels=pd.Series([2, 2, 1], index=['1', '2', '3'])
    )

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert set(stats['_dc_label']['values']) == set(['1', '2'])
    assert set(stats['_dc_prediction']['values']) == set(['0', '1', '2'])
    assert set(stats['b']['values']) == set(['4', '0', '2'])
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_batch_log(
        regression_model_version_client: DeepchecksModelVersionClient,
        async_session: AsyncSession
):
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([
            pdl.now().int_timestamp,
            pdl.now().int_timestamp,
            pdl.now().int_timestamp
        ], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']),
        labels=pd.Series([2, 2, 1], index=['1', '2', '3'])
    )

    model_version = await async_session.get(
        ModelVersion,
        regression_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert stats['_dc_label'] == {'max': 2.0, 'min': 1.0}
    assert stats['_dc_prediction'] == {'max': 2.0, 'min': 0.0}
    assert set(stats['b']['values']) == set(['4', '0', '2'])
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_batch_update(regression_model_version_client: DeepchecksModelVersionClient,
                                       async_session: AsyncSession):
    time = pdl.now().int_timestamp
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([time, time, time], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']))

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 0}

    data_to_update = pd.DataFrame([['1', 1], ['2', 2], ['3', 3]], columns=['sample_id', 'a'])
    regression_model_version_client.update_batch(data_to_update, labels=pd.Series([1, 2, 1], index=['1', '2', '3']))
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}

    model_version = await async_session.get(
        ModelVersion,
        regression_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert stats['_dc_label'] == {'max': 2.0, 'min': 1.0}
    assert stats['_dc_prediction'] == {'max': 2.0, 'min': 0.0}
    assert stats['a'] == {'max': 3, 'min': 1}


@pytest.mark.asyncio
async def test_regression_batch_update_only_label(regression_model_version_client: DeepchecksModelVersionClient):
    time = pdl.now().int_timestamp
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([time, time, time], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']))

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 0}

    regression_model_version_client.update_batch(['1', '2', '3'], labels=pd.Series([1, 2, 1], index=['1', '2', '3']))
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}


@pytest.mark.asyncio
async def test_regression_single_update(regression_model_version_client: DeepchecksModelVersionClient):
    time = pdl.now().int_timestamp
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([time, time, time], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']))

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 0}

    regression_model_version_client.update_sample(sample_id=str(1), label=1)
    regression_model_version_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 1}


@pytest.mark.asyncio
async def test_regression_single_update_none(regression_model_version_client: DeepchecksModelVersionClient):
    time = pdl.now().int_timestamp
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
            {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
            {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=pd.Series([time, time, time], index=['1', '2', '3']),
        predictions=pd.Series(['2', '1', '0'], index=['1', '2', '3']),
        labels=pd.Series(['2', None, '0'], index=['1', '2', '3']))

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 2}

    regression_model_version_client.update_sample(sample_id=str(2), label=1)
    regression_model_version_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}

    regression_model_version_client.update_sample(sample_id=str(1), label=1)
    regression_model_version_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}

    # Does not work yet
    # regression_model_version_client.update_sample(sample_id=str(3), labels=None)
    # stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    # assert stats == {'num_samples': 3, 'num_labeled_samples': 2}


@pytest.mark.asyncio
async def test_batch_log_with_parameters_of_different_length(
        regression_model_version_client: DeepchecksModelVersionClient,
):
    with pytest.raises(ValueError):
        regression_model_version_client.log_batch(
            data=pd.DataFrame.from_records([
                {'sample_id': '1', 'a': 2, 'b': '2', 'c': 1},
                {'sample_id': '2', 'a': 3, 'b': '4', 'c': -1},
                {'sample_id': '3', 'a': 2, 'b': '0', 'c': 0},
            ]),
            predictions=pd.Series(['2', '1', '0', '0'], index=['1', '2', '3']),
            labels=pd.Series([2, 2, 1, 1], index=['1', '2', '3']),
            timestamps=pd.Series([
                pdl.now().int_timestamp,
                pdl.now().int_timestamp,
                pdl.now().int_timestamp
            ], index=['1', '2', '3']),
        )


@pytest.mark.asyncio
async def test_batch_log_without_sample_id_column(
        regression_model_version_client: DeepchecksModelVersionClient,
        async_session: AsyncSession
):
    regression_model_version_client.log_batch(
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        predictions=pd.Series(['2', '1', '0']),
        labels=pd.Series([2, 2, 1]),
        timestamps=pd.Series([
            pdl.now().int_timestamp,
            pdl.now().int_timestamp,
            pdl.now().int_timestamp
        ]),
    )

    model_version = await async_session.get(
        ModelVersion,
        regression_model_version_client.model_version_id
    )

    assert model_version is not None

    monitor_table = model_version.get_monitor_table(async_session)
    ids = await async_session.scalars(select(monitor_table.c[SAMPLE_ID_COL]))

    assert set(ids) == {'0', '1', '2'}


@pytest.mark.asyncio
async def test_classification_log_pass_probas_without_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1')

    # Act & Assert
    dc_client = deepchecks_sdk_client.get_or_create_model(name='model', task_type=TaskType.MULTICLASS.value).version(
        'v1')
    assert_that(calling(dc_client.log_sample).with_args(
        '1', prediction='2', prediction_proba=[0.1, 0.3, 0.6], label=2, a=2, b='2', c=1
    ),
        raises(ValueError, 'Can\'t pass prediction_proba if version was not configured with model classes'))


@pytest.mark.asyncio
async def test_classification_log_pass_probas_not_same_length_as_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1', classes=['0', '1', '2'])

    # Act & Assert
    dc_client = deepchecks_sdk_client.get_or_create_model(name='model', task_type=TaskType.MULTICLASS.value).version(
        'v1')
    assert_that(calling(dc_client.log_sample).with_args(
        '1', prediction='2', prediction_proba=[0.1, 0.3, 0.5, 0.1], label=2, a=2, b='2', c=1
    ),
        raises(ValueError, 'Number of classes in prediction_proba does not match number of classes in model classes.'))


@pytest.mark.asyncio
async def test_classification_log_pass_prediction_not_in_classes(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.MULTICLASS)
    add_model_version(model_id, client, name='v1', classes=['0', '1', '2'])

    # Act & Assert
    dc_client = deepchecks_sdk_client.get_or_create_model(name='model', task_type=TaskType.MULTICLASS.value).version(
        'v1')
    assert_that(calling(dc_client.log_sample).with_args(
        '1', prediction='10', prediction_proba=[0.1, 0.3, 0.6], label=2, a=2, b='2', c=1
    ),
        raises(ValueError, 'Provided prediction not in allowed model classes: 10'))


@pytest.mark.asyncio
async def test_regression_log_sample_pass_proba(deepchecks_sdk_client, client: TestClient):
    # Arrange
    model_id = add_model(client, name='model', task_type=TaskType.REGRESSION)
    add_model_version(model_id, client, name='v1')

    # Act & Assert
    dc_client = deepchecks_sdk_client.get_or_create_model(name='model', task_type=TaskType.REGRESSION.value).version(
        'v1')
    assert_that(calling(dc_client.log_sample).with_args(
        '1', prediction=10, prediction_proba=[0.1], label=2, a=2, b='2', c=1
    ),
        raises(ValueError, 'Can\'t pass prediction_proba for regression task.'))
