# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for specific db objects."""
import typing as t

import pandas as pd
import pendulum as pdl
from deepchecks import BaseCheck, Dataset, SingleDatasetBaseCheck, TrainTestBaseCheck
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import func
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.logic.data_tables import (SAMPLE_LABEL_COL, SAMPLE_PRED_LABEL_COL, SAMPLE_PRED_VALUE_COL,
                                                     SAMPLE_TS_COL, get_columns_for_task_type)
from deepchecks_monitoring.models import Check, Model, ModelVersion, TaskType
from deepchecks_monitoring.utils import DataFilter, make_oparator_func


async def get_model_versions_and_task_type_per_time_window(session: AsyncSession,
                                                           check: Check,
                                                           start_time: pdl.DateTime,
                                                           end_time: pdl.DateTime) -> \
        t.Tuple[t.List[ModelVersion], TaskType]:
    """Get model versions and task type per time window."""
    model_results = await session.execute(select(Model).where(Model.id == check.model_id)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    model_versions: t.List[ModelVersion] = sorted(filter(
        lambda version: start_time <= version.end_time and end_time >= version.start_time, model.versions),
        key=lambda version: version.end_time, reverse=True)
    return model_versions, model.task_type


def create_model_version_select_object(task_type: TaskType, mon_table: Table, top_feat: t.List[str]) -> Select:
    """Create model version select object."""
    existing_feat = [feat_name for feat_name in top_feat if hasattr(mon_table.c, feat_name)]
    select_obj: Select = select(*([getattr(mon_table.c, feat_name) for feat_name in existing_feat] +
                                  [getattr(mon_table.c, task_col) for task_col in
                                   get_columns_for_task_type(task_type)]))
    return select_obj


def filter_select_object_by_window(select_obj: Select, mon_table: Table,
                                   start_time: pdl.DateTime, end_time: pdl.DateTime, n_samples: int = 10_000) -> Select:
    """Filter select object by window."""
    return select_obj.where(getattr(mon_table.c, SAMPLE_TS_COL) < end_time,
                            getattr(mon_table.c, SAMPLE_TS_COL) >= start_time) \
        .order_by(func.random()).limit(n_samples)


def dataframe_to_dataset_and_pred(df: t.Union[pd.DataFrame, None], feat_schema: t.Dict, top_feat: t.List[str]) -> \
        t.Tuple[Dataset, pd.Series, pd.Series]:
    """Dataframe_to_dataset_and_pred."""
    if df is None:
        return None, None, None

    if SAMPLE_PRED_LABEL_COL in df.columns:
        y_pred = df[SAMPLE_PRED_LABEL_COL]
        df.drop(SAMPLE_PRED_LABEL_COL, inplace=True, axis=1)
    else:
        y_pred = None
    if SAMPLE_PRED_VALUE_COL in df.columns:
        y_proba = df[SAMPLE_PRED_VALUE_COL]
        df.drop(SAMPLE_PRED_VALUE_COL, inplace=True, axis=1)
    else:
        y_proba = None
    cat_features = [feat[0] for feat in feat_schema.items() if feat[0] in top_feat and feat[1] == 'categorical']
    dataset = Dataset(df, label=SAMPLE_LABEL_COL, cat_features=cat_features)
    return dataset, y_pred, y_proba


def filter_table_selection_by_data_filter(table_selection: Select, data_filter: DataFilter):
    """Filter table selection by data filter."""
    table_selection = table_selection.where(make_oparator_func(data_filter.operator)(
        getattr(table_selection.c, data_filter.column), data_filter.value))
    return table_selection


async def get_results_for_active_model_version_sessions_per_window(
        model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]],
        model_versions: t.List[ModelVersion],
        dp_check: BaseCheck) -> t.Dict[int, t.Dict[str, float]]:
    """Get results for active model version sessions per window."""
    top_feat, feat_imp = model_versions[0].get_top_features()

    model_reduces = {}
    for model_versions_session, model_version in zip(model_versions_sessions, model_versions):
        test_data_dataframes: t.List[pd.DataFrame] = []
        refrence_table_data_session, test_data_sessions = model_versions_session
        for test_data_session in test_data_sessions:
            if test_data_session is None:
                test_data_dataframes.append(pd.DataFrame())
            else:
                test_data_session = await test_data_session
                test_data_dataframes.append(pd.DataFrame.from_dict(test_data_session.all()))
        if refrence_table_data_session is not None:
            refrence_table_data_session = await refrence_table_data_session
            refrence_table_data_dataframe = pd.DataFrame.from_dict(refrence_table_data_session.all())
            if refrence_table_data_dataframe.empty:
                model_reduces[model_version.id] = None
                continue
        else:
            refrence_table_data_dataframe = None
        reduced_outs = []
        refrence_table_ds, refrence_table_pred, refrence_table_proba = dataframe_to_dataset_and_pred(
            refrence_table_data_dataframe, model_version.features, top_feat)
        for test_data_dataframe in test_data_dataframes:
            if test_data_dataframe.empty:
                reduced_outs.append(None)
                continue
            test_ds, test_pred, test_proba = dataframe_to_dataset_and_pred(
                test_data_dataframe, model_version.features, top_feat)
            if isinstance(dp_check, SingleDatasetBaseCheck):
                reduced = dp_check.run(test_ds, feature_importance=feat_imp,
                                       y_pred_train=test_pred, y_proba_train=test_proba).reduce_output()
            elif isinstance(dp_check, TrainTestBaseCheck):
                reduced = dp_check.run(refrence_table_ds, test_ds, feature_importance=feat_imp,
                                       y_pred_train=refrence_table_pred, y_proba_train=refrence_table_proba,
                                       y_pred_test=test_pred, y_proba_test=test_proba).reduce_output()
            else:
                raise ValueError('incompatible check type')

            reduced_outs.append(reduced)
        model_reduces[model_version.id] = reduced_outs

    return model_reduces


def filter_monitor_table_by_window_and_data_filter(model_version: ModelVersion,
                                                   table_selection: Select,
                                                   mon_table: Table,
                                                   data_filter: DataFilter,
                                                   start_time: pdl.DateTime,
                                                   end_time: pdl.DateTime):
    """Filter monitor table by window and data filter."""
    if start_time <= model_version.end_time and end_time >= model_version.start_time:
        select_time_filtered = filter_select_object_by_window(table_selection, mon_table, start_time, end_time)
        if data_filter:
            select_time_filtered = filter_table_selection_by_data_filter(
                select_time_filtered, data_filter)
        return select_time_filtered
    else:
        return None
