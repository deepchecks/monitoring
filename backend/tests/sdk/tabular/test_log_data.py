# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import typing as t

import numpy as np
import pandas as pd
import pendulum as pdl
import pytest
from deepchecks_client import DeepchecksClient, TaskType
from deepchecks_client.tabular.client import DeepchecksModelClient, DeepchecksModelVersionClient
from hamcrest import assert_that, calling, raises
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models.model_version import ModelVersion
from tests.common import Payload, TestAPI

# from tests.conftest import add_model, add_model_version


@pytest.mark.asyncio
async def test_classification_log(
    multiclass_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    multiclass_model_version_client.log_sample(
        sample_id='1',
        prediction='2',
        prediction_proba=[0.1, 0.3, 0.6],
        values={'a': 2, 'b': '2', 'c': 1}
    )
    multiclass_model_version_client.log_sample(
        sample_id='2',
        prediction='1',
        prediction_proba=[0.1, 0.6, 0.1],
        values={'a': 3, 'b': '4', 'c': -1}
    )
    multiclass_model_version_client.log_sample(
        sample_id='3',
        prediction='0',
        prediction_proba=[0.1, 0.6, 0.1],
        values={'a': 2, 'b': '0', 'c': 0}
    )

    multiclass_model_version_client.send()

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert set(stats['_dc_prediction']['values']) == {'0', '1', '2'}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_w_date_log(
    regression_model: Payload,
    deepchecks_sdk: DeepchecksClient,
    async_session: AsyncSession,
    test_api
):
    regression_model_version_w_datetime = test_api.create_model_version(
        model_id=regression_model['id'],
        model_version={
            'name': 'v1',
            'features': {'a': 'numeric', 'b': 'categorical'},
            'feature_importance': {'a': 0.1, 'b': 0.5},
            'additional_data': {'d': 'datetime'}
        }
    )
    curr_time = pdl.now()
    version_client = \
        deepchecks_sdk.get_model_version(regression_model['name'], regression_model_version_w_datetime['name'])
    version_client.log_sample(
        sample_id='1',
        prediction=2,
        values={'a': 2, 'b': '2', 'd': curr_time}
    )
    version_client.log_sample(
        sample_id='2',
        prediction=2,
        values={'a': 3, 'b': '4', 'd': curr_time.add(days=-1)}
    )
    version_client.log_sample(
        sample_id='3',
        prediction=0,
        values={'a': 3, 'b': '0', 'd': curr_time.add(days=2)}
    )

    version_client.send()

    model_version = await async_session.get(
        ModelVersion,
        version_client.model_version_id
    )

    stats = model_version.statistics
    assert stats['_dc_prediction'] == {'max': 2, 'min': 0}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['d'] == {'max': curr_time.add(days=2).timestamp(),
                          'min': curr_time.add(days=-1).timestamp()}


@pytest.mark.asyncio
async def test_classification_log_without_probas(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI,
    async_session: AsyncSession
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(
        model={'task_type': TaskType.MULTICLASS.value}
    ))
    version = t.cast(Payload, test_api.create_model_version(
        model_id=model['id'],
        model_version={'name': 'v1'}
    ))
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=model['task_type'])
        .version(version['name'])
    )

    # Act
    version_client.log_sample(
        sample_id='1',
        prediction='2',
        values={'a': 2, 'b': '2', 'c': 1}
    )
    version_client.log_sample(
        sample_id='2',
        prediction='1',
        values={'a': 3, 'b': '4', 'c': -1}
    )
    version_client.log_sample(
        sample_id='3',
        prediction='0',
        values={'a': 2, 'b': '0', 'c': 0}
    )
    version_client.send()

    # Assert
    model_version = await async_session.get(ModelVersion, version['id'])
    stats = model_version.statistics
    assert set(stats['_dc_prediction']['values']) == {'0', '1', '2'}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_log(
    regression_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    regression_model_version_client.log_sample(
        sample_id='1',
        prediction='2',
        values={'a': 2, 'b': '2', 'c': 1}
    )
    regression_model_version_client.log_sample(
        sample_id='2',
        prediction='1',
        values={'a': 3, 'b': '4', 'c': -1}
    )
    regression_model_version_client.log_sample(
        sample_id='3',
        prediction='0',
        values={'a': 2, 'b': '0', 'c': 0}
    )
    regression_model_version_client.send()

    model_version = await async_session.get(
        ModelVersion,
        regression_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert stats['_dc_prediction'] == {'max': 2.0, 'min': 0.0}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_classification_batch_log(
    multiclass_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    multiclass_model_version_client.log_batch(
        sample_ids=np.array(['1', '2', '3']),
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=np.array([
            pdl.now().int_timestamp,
            pdl.now().int_timestamp,
            pdl.now().int_timestamp
        ]),
        predictions=np.array(['2', '1', '0']),
        prediction_probas=np.array([
            [0.1, 0.3, 0.6],
            [0.1, 0.6, 0.1],
            [0.1, 0.6, 0.1]
        ])
    )

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert set(stats['_dc_prediction']['values']) == {'0', '1', '2'}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


@pytest.mark.asyncio
async def test_regression_batch_log(
    regression_model_version_client: DeepchecksModelVersionClient,
    regression_model_client: DeepchecksModelClient,
    async_session: AsyncSession
):
    regression_model_version_client.log_batch(
        sample_ids=np.array(['1', '2', '3']),
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=np.array([
            pdl.now().int_timestamp,
            pdl.now().int_timestamp,
            pdl.now().int_timestamp
        ]),
        predictions=np.array(['2', '1', '0'])
    )
    regression_model_client.log_batch_labels(['1', '2', '3'], [2, 2, 1])

    model_version = await async_session.get(
        ModelVersion,
        regression_model_version_client.model_version_id
    )

    stats = model_version.statistics
    assert stats['_dc_prediction'] == {'max': 2.0, 'min': 0.0}
    assert set(stats['b']['values']) == {'4', '0', '2'}
    assert stats['a'] == {'max': 3, 'min': 2}
    assert stats['c'] == {'max': 1, 'min': -1}


def test_regression_batch_update_only_label(regression_model_version_client: DeepchecksModelVersionClient,
                                            regression_model_client: DeepchecksModelClient):
    time = pdl.now().int_timestamp

    regression_model_version_client.log_batch(
        sample_ids=np.array(['1', '2', '3']),
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=np.array([time, time, time]),
        predictions=np.array(['2', '1', '0'])
    )

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 0}

    regression_model_client.log_batch_labels(
        sample_ids=np.array(['1', '2', '3']),
        labels=np.array([1, 2, 1])
    )

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}


def test_regression_single_update(regression_model_version_client: DeepchecksModelVersionClient,
                                  regression_model_client: DeepchecksModelClient):
    time = pdl.now().int_timestamp

    regression_model_version_client.log_batch(
        sample_ids=np.array(['1', '2', '3']),
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=np.array([time, time, time]),
        predictions=np.array(['2', '1', '0'])
    )

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 0}

    regression_model_client.log_label(sample_id='1', label=1)
    regression_model_version_client.send()
    regression_model_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 1}


def test_regression_single_update_none(regression_model_version_client: DeepchecksModelVersionClient,
                                       regression_model_client: DeepchecksModelClient):
    time = pdl.now().int_timestamp

    regression_model_version_client.log_batch(
        sample_ids=np.array(['1', '2', '3']),
        data=pd.DataFrame.from_records([
            {'a': 2, 'b': '2', 'c': 1},
            {'a': 3, 'b': '4', 'c': -1},
            {'a': 2, 'b': '0', 'c': 0},
        ]),
        timestamps=np.array([time, time, time]),
        predictions=np.array(['2', '1', '0']),
    )

    labels = np.array(['2', None, '0'])
    regression_model_client.log_batch_labels(sample_ids=['1', '2', '3'], labels=labels)
    regression_model_client.send()

    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 2}

    regression_model_client.log_label(sample_id='2', label=1)
    regression_model_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}

    regression_model_client.log_label(sample_id='1', label=1)
    regression_model_client.send()
    stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    assert stats == {'num_samples': 3, 'num_labeled_samples': 3}

    # Does not work yet
    # regression_model_version_client.update_sample(sample_id=str(3), labels=None)
    # stats = regression_model_version_client.time_window_statistics(time - 1, time + 1)
    # assert stats == {'num_samples': 3, 'num_labeled_samples': 2}


def test_batch_log_with_parameters_of_different_length(
    regression_model_version_client: DeepchecksModelVersionClient,
):
    with pytest.raises(ValueError):
        regression_model_version_client.log_batch(
            sample_ids=np.array(['1', '2', '3']),
            data=pd.DataFrame.from_records([
                {'a': 2, 'b': '2', 'c': 1},
                {'a': 3, 'b': '4', 'c': -1},
                {'a': 2, 'b': '0', 'c': 0},
            ]),
            predictions=np.array(['2', '1', '0', '0']),
            timestamps=np.array([
                pdl.now().int_timestamp,
                pdl.now().int_timestamp,
                pdl.now().int_timestamp
            ]),
        )


def test_classification_log_pass_probas_without_classes(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={'task_type': TaskType.MULTICLASS.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model['id']))

    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.log_sample).with_args(
            sample_id='1',
            prediction='2',
            prediction_proba=[0.1, 0.3, 0.6],
            values={'a': 2, 'b': '2', 'c': 1}
        ),
        raises(
            ValueError,
            'Can\'t pass prediction_probas if version was not configured with model classes.'
        )
    )


def test_classification_log_pass_probas_not_same_length_as_classes(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(
        model={'task_type': TaskType.MULTICLASS.value}
    ))
    version = t.cast(Payload, test_api.create_model_version(
        model_id=model['id'],
        model_version={'classes': ['0', '1', '2']}
    ))

    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )

    assert_that(
        calling(version_client.log_sample).with_args(
            sample_id='1',
            prediction='2',
            prediction_proba=[0.1, 0.3, 0.5, 0.1],
            values={'a': 2, 'b': '2', 'c': 1}
        ),
        raises(
            ValueError,
            'Number of classes in prediction_probas does not match number of classes in model classes.'
        )
    )


def test_classification_log_pass_prediction_not_in_classes(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(
        model={'task_type': TaskType.MULTICLASS.value}
    ))
    version = t.cast(Payload, test_api.create_model_version(
        model_id=model['id'],
        model_version={'classes': ['0', '1', '2']}
    ))
    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.log_sample).with_args(
            sample_id='1',
            prediction='10',
            prediction_proba=[0.1, 0.3, 0.6],
            values={'a': 2, 'b': '2', 'c': 1}
        ),
        raises(
            ValueError,
            'Provided prediction not in allowed model classes: 10'
        )
    )


def test_regression_log_sample_pass_proba(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={'task_type': TaskType.REGRESSION.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model['id']))
    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.REGRESSION.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.log_sample).with_args(
            sample_id='1',
            prediction=10,
            prediction_proba=[0.1],
            values={'a': 2, 'b': '2', 'c': 1}
        ),
        raises(
            ValueError,
            'Can\'t pass prediction_proba for regression task.'
        )
    )
