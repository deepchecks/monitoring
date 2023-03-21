# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# import io

import numpy as np
import pandas as pd
import pytest
from deepchecks.tabular.dataset import Dataset
from deepchecks_client.core.utils import DataFilter, OperatorsEnum
from deepchecks_client.tabular.client import DeepchecksModelVersionClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_PRED_PROBA_COL
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from tests.common import Payload, TestAPI, upload_classification_data


@pytest.mark.asyncio
async def test_classification_model_production_data_retrieval(
    test_api: TestAPI,
    multiclass_model_version_client: DeepchecksModelVersionClient,
    classification_model_version: Payload,
    classification_model: Payload,
    async_session: AsyncSession
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version['id'],
        model_id=classification_model['id'],
    )

    df = multiclass_model_version_client.get_production_data(start_time, end_time.add(hours=1))

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id,
        options=[joinedload(ModelVersion.model)]
    )

    prod_table = model_version.get_monitor_table(async_session)
    labels_table = model_version.model.get_sample_labels_table(async_session)
    prod_query = await async_session.execute(
        select(list(prod_table.c) + [labels_table.c[SAMPLE_LABEL_COL]])
        .join(labels_table, prod_table.c[SAMPLE_ID_COL] == labels_table.c[SAMPLE_ID_COL])
    )

    prod_df = pd.DataFrame(
        prod_query.all(),
        columns=[str(key) for key in prod_query.keys()]
    )

    # to make them comparable
    prod_df = prod_df[df.columns]
    df.sort_values(by=[SAMPLE_ID_COL], inplace=True)
    prod_df.sort_values(by=[SAMPLE_ID_COL], inplace=True)
    df.set_index(SAMPLE_ID_COL, inplace=True)
    prod_df.set_index(SAMPLE_ID_COL, inplace=True)
    prod_df[SAMPLE_PRED_PROBA_COL] = prod_df[SAMPLE_PRED_PROBA_COL].apply(list)

    assert len(prod_df.compare(df)) == 0


def test_classification_model_production_data_retrieval_with_filter(
    classification_model_version: Payload,
    test_api: TestAPI,
    multiclass_model_version_client: DeepchecksModelVersionClient,
):
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version['id'],
        samples_per_date=2,
        is_labeled=False
    )
    df = multiclass_model_version_client.get_production_data(
        start_time,
        end_time.add(hours=1),
        filters=[DataFilter(column='a', operator=OperatorsEnum.GE, value=12)]
    )

    assert len(df) == 3
    is_a_bigger = df['a'].apply(lambda x: x >= 12)
    assert is_a_bigger.all(), df['a']


@pytest.mark.asyncio
async def test_classification_model_reference_data_retrieval(
    multiclass_model_version_client: DeepchecksModelVersionClient,
    async_session: AsyncSession
):
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='3', c=2, label=0)]),
        label='label',
        cat_features=['b']
    )

    # schema_file = io.StringIO()
    # create_schema(dataset, schema_file)

    proba = np.asarray([[0.2, 0.4, 0.2], [0.4, 0.2, 0.2]])
    pred = [2, 1]
    multiclass_model_version_client.upload_reference(dataset, pred, proba)

    df = multiclass_model_version_client.get_reference_data()

    model_version = await async_session.get(
        ModelVersion,
        multiclass_model_version_client.model_version_id
    )

    prod_table = model_version.get_reference_table(async_session)
    prod_query = await async_session.execute(select(prod_table))

    prod_df = pd.DataFrame(
        prod_query.all(),
        columns=[str(key) for key in prod_query.keys()]
    )

    # to make them comparable
    prod_df = prod_df[df.columns]
    df.sort_values(by=['a'], inplace=True)
    prod_df.sort_values(by=['a'], inplace=True)
    df.set_index('a', inplace=True)
    prod_df.set_index('a', inplace=True)
    prod_df[SAMPLE_PRED_PROBA_COL] = prod_df[SAMPLE_PRED_PROBA_COL].apply(list)

    assert len(df) == 2
    assert len(prod_df.compare(df)) == 0, f'{df}\n{prod_df}'


def test_classification_model_reference_data_retrieval_with_filter(
    multiclass_model_version_client: DeepchecksModelVersionClient,
):
    dataset = Dataset(
        pd.DataFrame([dict(a=2, b='2', c=1, label=2), dict(a=3, b='3', c=2, label=0)]),
        label='label',
        cat_features=['b']
    )

    # schema_file = io.StringIO()
    # create_schema(dataset, schema_file)

    proba = np.asarray([[0.1, 0.3, 0.6], [0.1, 0.6, 0.3]])
    pred = [2, 1]
    multiclass_model_version_client.upload_reference(dataset, pred, proba)

    df = multiclass_model_version_client.get_reference_data(
        filters=[DataFilter(column='a', operator=OperatorsEnum.GT, value=2)]
    )

    assert len(df) == 1
    a_is_bigger = df['a'].apply(lambda x: x > 2)
    assert a_is_bigger.all(), df['a']
