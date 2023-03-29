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
from datetime import datetime

import numpy as np
import pandas as pd
import pendulum as pdl
import pytest
from deepchecks.tabular.dataset import Dataset
from deepchecks_client import DeepchecksClient, TaskType
from deepchecks_client.tabular.client import DeepchecksModelVersionClient
from hamcrest import assert_that, calling, raises
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models.column_type import SAMPLE_LABEL_COL, SAMPLE_PRED_COL, SAMPLE_PRED_PROBA_COL
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from tests.common import Payload, TestAPI


@pytest.mark.asyncio
async def test_classification_upload(
    multiclass_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='4', c=2, label=0)])
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    multiclass_model_version_client.upload_reference(
        Dataset(df, features=['a', 'b'], label='label'),
        prediction_probas=proba,
        predictions=pred
    )

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id
    )
    ref_table = model_version.get_reference_table(async_session)

    ref_dict = (await async_session.execute(select(
        ref_table.c.a,
        ref_table.c.b,
        ref_table.c.c,
        ref_table.c[SAMPLE_LABEL_COL],
        ref_table.c[SAMPLE_PRED_COL],
        ref_table.c[SAMPLE_PRED_PROBA_COL],
    ))).all()

    assert ref_dict == [
        (2.0, '2', 1, '2', '2', [0.1, 0.30000000000000004, 0.6000000000000001]),
        (3.0, '4', 2, '0', '1', [0.1, 0.6000000000000001, 0.30000000000000004]),
    ]


@pytest.mark.asyncio
async def test_classification_upload_fail_if_exists(
    multiclass_model_version_client: DeepchecksModelVersionClient):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='4', c=2, label=0)])
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    multiclass_model_version_client.upload_reference(
        Dataset(df, features=['a', 'b'], label='label'),
        prediction_probas=proba,
        predictions=pred
    )
    with pytest.raises(ValueError):
        multiclass_model_version_client.upload_reference(
            Dataset(df, features=['a', 'b'], label='label'),
            prediction_probas=proba,
            predictions=pred
        )


@pytest.mark.asyncio
async def test_classification_upload_without_classes(
    test_api: TestAPI,
    deepchecks_sdk: DeepchecksClient,
    async_session: AsyncSession
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={'task_type': TaskType.MULTICLASS.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model['id']))

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='4', c=2, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    pred = [2, 1]

    # Act
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )

    version_client.upload_reference(ds, predictions=pred)

    # Assert
    model_version = await async_session.get(ModelVersion, version['id'])
    ref_table = model_version.get_reference_table(async_session)

    ref_dict = (await async_session.execute(select(
        ref_table.c.a,
        ref_table.c.b,
        ref_table.c.c,
        ref_table.c[SAMPLE_LABEL_COL],
        ref_table.c[SAMPLE_PRED_COL],
    ))).all()

    assert ref_dict == [
        (2.0, '2', 1, '2', '2'),
        (3.0, '4', 2, '0', '1')
    ]


@pytest.mark.asyncio
async def test_regression_upload(
    regression_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='4', c=2, label=0)])
    pred = [2, 1]
    regression_model_version_client.upload_reference(
        Dataset(df, features=['a', 'b'], label='label'),
        predictions=pred
    )

    model_version = await async_session.get(ModelVersion, regression_model_version_client.model_version_id)
    ref_table = model_version.get_reference_table(async_session)

    ref_dict = (await async_session.execute(
        select(
            ref_table.c.a,
            ref_table.c.b,
            ref_table.c.c,
            ref_table.c[SAMPLE_LABEL_COL],
            ref_table.c[SAMPLE_PRED_COL]
        )
    )).all()

    assert ref_dict == [
        (2.0, '2', 1, 2, 2),
        (3.0, '4', 2, 0, 1),
    ]


@pytest.mark.asyncio
async def test_regression_upload_w_date(regression_model: Payload,
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
    curr_time = pdl.parse(datetime.now().isoformat())
    version_client = \
        deepchecks_sdk.get_model_version(regression_model['name'], regression_model_version_w_datetime['name'])
    df = pd.DataFrame([dict(a=2, b='2', d=curr_time, label=2), dict(a=3, b='4', d=curr_time.add(days=1), label=0)])
    pred = [2, 1]
    version_client.upload_reference(
        Dataset(df, features=['a', 'b'], label='label'),
        predictions=pred
    )
    model_version = await async_session.get(ModelVersion, version_client.model_version_id)
    ref_table = model_version.get_reference_table(async_session)

    ref_dict = (await async_session.execute(select(
        ref_table.c.a,
        ref_table.c.b,
        ref_table.c.d,
        ref_table.c[SAMPLE_LABEL_COL],
        ref_table.c[SAMPLE_PRED_COL]
    ))).all()

    assert ref_dict == [
        (2.0, '2', curr_time, 2, 2),
        (3.0, '4', curr_time.add(days=1), 0, 1),
    ]


def test_pass_probas_to_regression(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI,
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={'task_type': TaskType.REGRESSION.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model['id']))

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.REGRESSION.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
        raises(ValueError, 'Can\'t pass prediction_probas to regression task.')
    )


def test_pass_probas_without_model_classes(
    deepchecks_sdk: DeepchecksClient,
    test_api: TestAPI
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={'task_type': TaskType.MULTICLASS.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model['id']))

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
        raises(ValueError, 'Can\'t pass prediction_probas if version was not configured with model classes.')
    )


def test_pass_probas_different_length_than_model_classes(
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

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.5, 0.1], [0.1, 0.6, 0.2, 0.1]])
    pred = [2, 1]

    # Act & Assert
    version_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(version_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
        raises(
            ValueError,
            'Number of classes in prediction_probas does not match number of classes in model classes.'
        )
    )


def test_pass_new_predictions_not_in_model_classes(
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

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [3, 1]

    # Act & Assert
    dc_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
        raises(ValueError, 'Provided prediction not in allowed model classes: 3')
    )


def test_pass_new_label_not_in_model_classes(
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

    df = pd.DataFrame([dict(a=2, b='2', c=1, label=4), dict(a=2, b='2', c=1, label=0)])
    ds = Dataset(df, features=['a', 'b'], label='label')
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    dc_client = (
        deepchecks_sdk
        .get_or_create_model(name=model['name'], task_type=TaskType.MULTICLASS.value)
        .version(version['name'])
    )
    assert_that(
        calling(dc_client.upload_reference).with_args(ds, pred, prediction_probas=proba),
        raises(ValueError, 'Got labels not in model classes: {\'4\'}')
    )
