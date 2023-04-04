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
from deepchecks_client import DeepchecksClient
from deepchecks_client.tabular.utils import create_schema
from hamcrest import assert_that, calling, contains_exactly, has_property, is_, raises
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models.column_type import SAMPLE_LABEL_COL, SAMPLE_PRED_COL, SAMPLE_PRED_PROBA_COL
from deepchecks_monitoring.schema_models.model_version import ModelVersion


@pytest.mark.asyncio
async def test_quick_version(deepchecks_sdk: DeepchecksClient, async_session: AsyncSession):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act
    deepchecks_sdk.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema=schema_file,
        task_type='multiclass',
        version_name='ver',
        feature_importance=pd.Series(
            [0.1, 0.1, 0.8],
            index=['a', 'b', 'c']
        )
    )

    # Assert
    model = deepchecks_sdk.get_or_create_model(name='test', task_type='multiclass')
    assert model.get_versions() == {'ver': 1}

    model_version: ModelVersion = await async_session.get(ModelVersion, 1)
    ref_table = model_version.get_reference_table(async_session)

    ref_data = (await async_session.execute(select(
        ref_table.c.a,
        ref_table.c.b,
        ref_table.c.c,
        ref_table.c[SAMPLE_LABEL_COL],
        ref_table.c[SAMPLE_PRED_COL],
        ref_table.c[SAMPLE_PRED_PROBA_COL],
    ))).all()

    assert len(ref_data) == 2
    assert len(ref_data[0]) == 6
    assert len(ref_data[0][5]) == 3


def test_quick_start_flow(deepchecks_sdk: DeepchecksClient):
    # Arrange
    data = pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)])
    dataset = Dataset(data, label='label', cat_features=['b'])
    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]
    timestamp = pd.Series([1662076799, 1662076899])

    # Act
    version = deepchecks_sdk.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema=schema_file,
        task_type='multiclass',
        version_name='ver',
        feature_importance={'a': 0.1, 'b': 0.2, 'c': 0.7}
    )
    version.log_batch(
        sample_ids=np.array([0, 1]),
        data=data.iloc[:, :3],
        timestamps=timestamp.to_numpy(),
        predictions=np.array(pred),
        prediction_probas=proba,
    )

    model = deepchecks_sdk.get_or_create_model('test')
    model.log_batch_labels(np.array([0, 1]), data['label'].to_numpy())

    # Assert
    version = deepchecks_sdk.get_model_version(model_name='test', version_name='ver')
    assert version.model_version_id == 1
    expected_statistics = {'num_samples': 2, 'num_labeled_samples': 2}
    assert version.time_window_statistics(timestamp[0], timestamp[1] + 1) == expected_statistics


def test_create_tabular_model_version_wrong_proba_length(deepchecks_sdk: DeepchecksClient):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    assert_that(
        calling(deepchecks_sdk.create_tabular_model_version).with_args(
            model_name='test',
            reference_dataset=dataset,
            reference_predictions=pred,
            reference_probas=proba,
            schema=schema_file,
            task_type='multiclass',
            version_name='ver',
            model_classes=['0', '1', '2', '3']
        ),
        raises(
            DeepchecksValueError,
            'Got 3 columns in reference_probas, but 4 model classes were provided.'
        )
    )


def test_create_tabular_model_version_pass_proba_for_regression(deepchecks_sdk: DeepchecksClient):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act & Assert
    assert_that(
        calling(deepchecks_sdk.create_tabular_model_version).with_args(
            model_name='test',
            reference_dataset=dataset,
            reference_predictions=pred,
            reference_probas=proba,
            schema=schema_file,
            task_type='regression',
            version_name='ver',
            model_classes=['0', '1', '2']
        ),
        raises(
            DeepchecksValueError,
            'Can\'t pass probabilities for task_type regression'
        )
    )


def test_create_tabular_model_version_pass_probas_wrong_type(deepchecks_sdk: DeepchecksClient):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = [[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]]
    pred = [2, 1]

    # Act & Assert
    assert_that(
        calling(deepchecks_sdk.create_tabular_model_version).with_args(
            model_name='test',
            reference_dataset=dataset,
            reference_predictions=pred,
            reference_probas=proba,
            schema=schema_file,
            task_type='multiclass',
            version_name='ver',
            model_classes=['0', '1', '2']
        ),
        raises(
            DeepchecksValueError,
            'reference_probas have to be numpy array but got list'
        )
    )


def test_create_tabular_model_infer_model_classes(deepchecks_sdk: DeepchecksClient):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]

    # Act
    deepchecks_sdk.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        reference_probas=proba,
        schema=schema_file,
        task_type='multiclass',
        version_name='ver'
    )

    # Assert
    model_ver = deepchecks_sdk.get_or_create_model(name='test', task_type='multiclass').version('ver')
    assert_that(model_ver, has_property('model_classes', contains_exactly('0', '1', '2')))


def test_create_tabular_without_probas_does_not_infer_classes(deepchecks_sdk: DeepchecksClient):
    # Arrange
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=2, b='2', c=1, label=0)]),
        label='label', cat_features=['b']
    )

    schema_file = io.StringIO()
    create_schema(dataset, schema_file)
    pred = [2, 1]

    # Act
    deepchecks_sdk.create_tabular_model_version(
        model_name='test',
        reference_dataset=dataset,
        reference_predictions=pred,
        schema=schema_file,
        task_type='multiclass',
        version_name='V1'
    )

    # Assert
    version_client = deepchecks_sdk.get_or_create_model(name='test', task_type='multiclass').version('V1')
    assert_that(version_client, has_property('model_classes', is_(None)))
