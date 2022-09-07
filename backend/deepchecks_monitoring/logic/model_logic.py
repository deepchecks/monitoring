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
from collections import defaultdict

import numpy as np
import pandas as pd
import pendulum as pdl
import torch
from deepchecks.core import BaseCheck
from deepchecks.tabular import Dataset
from deepchecks.tabular import base_checks as tabular_base_checks
from deepchecks.utils.dataframes import un_numpy
from deepchecks.vision import VisionData
from deepchecks.vision import base_checks as vision_base_checks
from sqlalchemy import VARCHAR, Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import func
from sqlalchemy.sql.selectable import Select
from torch.utils.data import DataLoader

from deepchecks_monitoring.logic.vision_classes import TASK_TYPE_TO_VISION_DATA_CLASS, LabelVisionDataset
from deepchecks_monitoring.models import Check, Model, ModelVersion, TaskType
from deepchecks_monitoring.models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_PRED_COL,
                                                      SAMPLE_PRED_PROBA_COL, SAMPLE_TS_COL)
from deepchecks_monitoring.utils import DataFilterList, make_oparator_func


async def get_model_versions_for_time_range(session: AsyncSession,
                                            check: Check,
                                            start_time: pdl.DateTime,
                                            end_time: pdl.DateTime) -> t.Tuple[Model, t.List[ModelVersion]]:
    """Get model versions for a time window."""
    model_results = await session.execute(select(Model).where(Model.id == check.model_id)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    model_versions: t.List[ModelVersion] = [version for version in model.versions
                                            if start_time <= version.end_time and end_time >= version.start_time]
    return model, model_versions


def create_model_version_select_object(model_version: ModelVersion, mon_table: Table, top_feat: t.List[str]) -> Select:
    """Create model version select object."""
    existing_feat_columns = [mon_table.c[feat_name] for feat_name in top_feat if feat_name in mon_table.c]
    model_columns = [mon_table.c[col] for col in model_version.model_columns.keys()]
    select_obj: Select = select(*existing_feat_columns, *model_columns)
    return select_obj


def filter_select_object_by_window(select_obj: Select, mon_table: Table,
                                   start_time: pdl.DateTime, end_time: pdl.DateTime) -> Select:
    """Filter select object by window."""
    filtered_select_obj = select_obj
    return filtered_select_obj.where(mon_table.c[SAMPLE_TS_COL] < end_time,
                                     mon_table.c[SAMPLE_TS_COL] >= start_time)


def random_sample(select_obj: Select, mon_table: Table, n_samples: int = 10_000) -> Select:
    """Sample randomly on a select object by id/row number md5."""
    sampled_select_obj = select_obj
    if SAMPLE_ID_COL in mon_table.c:
        order_func = func.md5(mon_table.c[SAMPLE_ID_COL])
    else:
        order_func = func.md5(func.cast(func.row_number().over(), VARCHAR))
    return sampled_select_obj.order_by(order_func).limit(n_samples)


def dataframe_to_dataset_and_pred(df: t.Union[pd.DataFrame, None], feat_schema: t.Dict, top_feat: t.List[str]) -> \
        t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
    """Dataframe_to_dataset_and_pred."""
    if df is None:
        return None, None, None
    y_pred = None
    y_proba = None
    if SAMPLE_PRED_COL in df.columns:
        if not df[SAMPLE_PRED_COL].isna().all():
            y_pred = np.array(df[SAMPLE_PRED_COL].to_list())
        df.drop(SAMPLE_PRED_COL, inplace=True, axis=1)
    if SAMPLE_PRED_PROBA_COL in df.columns:
        if not df[SAMPLE_PRED_PROBA_COL].isna().all():
            y_proba = np.array(df[SAMPLE_PRED_PROBA_COL].to_list())
        df.drop(SAMPLE_PRED_PROBA_COL, inplace=True, axis=1)

    cat_features = [feat[0] for feat in feat_schema.items() if feat[0] in top_feat and feat[1] == 'categorical']
    dataset = Dataset(df, label=SAMPLE_LABEL_COL, cat_features=cat_features)
    return dataset, y_pred, y_proba


def dataframe_to_vision_data_pred_props(df: t.Union[pd.DataFrame, None], task_type: TaskType) \
        -> t.Tuple[VisionData, t.Dict[int, torch.Tensor], t.Dict[int, t.Any]]:
    """Dataframe_to_dataset_and_pred."""
    if df is None:
        return None, None, None

    df.reset_index(drop=True, inplace=True)
    if task_type == TaskType.VISION_DETECTION:
        labels = df[SAMPLE_LABEL_COL].apply(torch.Tensor).to_dict()
    else:
        labels = df[SAMPLE_LABEL_COL].to_dict()
    df.drop(SAMPLE_LABEL_COL, inplace=True, axis=1)

    preds = df[SAMPLE_PRED_COL].apply(torch.Tensor).to_dict()
    df.drop(SAMPLE_PRED_COL, inplace=True, axis=1)

    if df.empty:
        static_props = None
    else:
        static_props = defaultdict(dict)
        for col in df.columns:
            prop_type, prop_name = col.split(' ', 1)
            for ind, item in df[col].items():
                if static_props[ind].get(prop_type) is None:
                    static_props[ind][prop_type] = {prop_name: item}
                else:
                    static_props[ind][prop_type][prop_name] = item

    data_loader = DataLoader(LabelVisionDataset(labels), batch_size=len(labels), collate_fn=list)
    return TASK_TYPE_TO_VISION_DATA_CLASS[task_type](data_loader), preds, static_props


def filter_table_selection_by_data_filters(data_table: Table, table_selection: Select, data_filters: DataFilterList):
    """Filter table selection by data filter."""
    filtered_table_selection = table_selection
    for data_filter in data_filters.filters:
        filtered_table_selection = filtered_table_selection.where(make_oparator_func(data_filter.operator)(
            getattr(data_table.c, data_filter.column), data_filter.value))
    return filtered_table_selection


async def get_results_for_model_versions_per_window(
        model_versions_dataframes: t.List[t.Tuple[pd.DataFrame, t.List[pd.DataFrame]]],
        model_versions: t.List[ModelVersion],
        model: Model,
        dp_check: BaseCheck) -> t.Dict[int, t.Dict[str, float]]:
    """Get results for active model version sessions per window."""
    top_feat, feat_imp = model_versions[0].get_top_features()
    task_type = model.task_type
    is_vision_check = isinstance(dp_check,
                                 (vision_base_checks.SingleDatasetCheck, vision_base_checks.TrainTestCheck))

    model_reduces = {}
    for (reference_table_dataframe, test_dataframes), model_version in zip(model_versions_dataframes, model_versions):
        # If we have empty reference skip the run
        if reference_table_dataframe is not None and reference_table_dataframe.empty:
            model_reduces[model_version.id] = None
            continue

        reduced_outs = []
        if not is_vision_check:
            reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
                reference_table_dataframe, model_version.features_columns, top_feat)
        else:
            reference_table_ds, reference_table_pred, reference_table_props = dataframe_to_vision_data_pred_props(
                reference_table_dataframe, task_type)

        for test_data_dataframe in test_dataframes:
            if test_data_dataframe.empty:
                reduced_outs.append(None)
                continue
            if not is_vision_check:
                test_ds, test_pred, test_proba = dataframe_to_dataset_and_pred(test_data_dataframe,
                                                                               model_version.features_columns,
                                                                               top_feat)
            else:
                test_ds, test_pred, test_props = dataframe_to_vision_data_pred_props(test_data_dataframe,
                                                                                     task_type)
                # 1/0
            if isinstance(dp_check,  tabular_base_checks.SingleDatasetCheck):
                reduced = dp_check.run(test_ds, feature_importance=feat_imp,
                                       y_pred_train=test_pred, y_proba_train=test_proba,
                                       with_display=False).reduce_output()
            elif isinstance(dp_check, tabular_base_checks.TrainTestCheck):
                reduced = dp_check.run(reference_table_ds, test_ds, feature_importance=feat_imp,
                                       y_pred_train=reference_table_pred, y_proba_train=reference_table_proba,
                                       y_pred_test=test_pred, y_proba_test=test_proba,
                                       with_display=False).reduce_output()
            elif isinstance(dp_check,  vision_base_checks.SingleDatasetCheck):
                reduced = dp_check.run(test_ds,
                                       train_predictions=test_pred, train_properties=test_props,
                                       with_display=False).reduce_output()
            elif isinstance(dp_check, vision_base_checks.TrainTestCheck):
                reduced = dp_check.run(reference_table_ds, test_ds,
                                       train_predictions=reference_table_pred, train_properties=reference_table_props,
                                       test_predictions=test_pred, test_properties=test_props,
                                       with_display=False).reduce_output()
            else:
                raise ValueError('incompatible check type')

            reduced_outs.append(dict({(key, un_numpy(value)) for key, value in reduced.items()}))
        model_reduces[model_version.id] = reduced_outs

    return model_reduces


def filter_monitor_table_by_window_and_data_filters(model_version: ModelVersion,
                                                    table_selection: Select,
                                                    mon_table: Table,
                                                    start_time: pdl.DateTime,
                                                    end_time: pdl.DateTime,
                                                    data_filter: t.Optional[DataFilterList] = None):
    """Filter monitor table by window and data filter."""
    if start_time <= model_version.end_time and end_time >= model_version.start_time:
        select_time_filtered = filter_select_object_by_window(table_selection, mon_table, start_time, end_time)
        if data_filter:
            select_time_filtered = filter_table_selection_by_data_filters(mon_table,
                                                                          select_time_filtered,
                                                                          data_filter)
        return random_sample(select_time_filtered, mon_table)
    else:
        return None
