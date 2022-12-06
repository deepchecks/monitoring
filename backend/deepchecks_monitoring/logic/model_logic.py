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
import logging
import typing as t
from collections import defaultdict

import numpy as np
import pandas as pd
import pendulum as pdl
import torch
from deepchecks.core import BaseCheck
from deepchecks.core.errors import DeepchecksBaseError
from deepchecks.tabular import Dataset
from deepchecks.tabular import base_checks as tabular_base_checks
from deepchecks.vision import VisionData
from deepchecks.vision import base_checks as vision_base_checks
from deepchecks.vision.utils.vision_properties import PropertiesInputType
from sqlalchemy import VARCHAR, Table, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.selectable import Select
from torch.utils.data import DataLoader

from deepchecks_monitoring.logic.cache_functions import CacheResult
from deepchecks_monitoring.logic.vision_classes import TASK_TYPE_TO_VISION_DATA_CLASS, LabelVisionDataset
from deepchecks_monitoring.monitoring_utils import CheckParameterTypeEnum, MonitorCheckConfSchema, fetch_or_404
from deepchecks_monitoring.schema_models import Check, Model, ModelVersion, TaskType
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_PRED_COL,
                                                             SAMPLE_PRED_PROBA_COL, SAMPLE_S3_IMAGE_COL, SAMPLE_TS_COL,
                                                             ColumnType)


async def get_model_versions_for_time_range(session: AsyncSession,
                                            check: Check,
                                            start_time: pdl.DateTime,
                                            end_time: pdl.DateTime) -> t.Tuple[Model, t.List[ModelVersion]]:
    """Get model versions for a time window."""
    model_results = await session.execute(select(Model).where(Model.id == check.model_id,
                                                              Model.id == ModelVersion.model_id,
                                                              ModelVersion.end_time >= start_time,
                                                              ModelVersion.start_time <= end_time)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    if model is not None:
        model_versions: t.List[ModelVersion] = model.versions
        return model, model_versions
    return await fetch_or_404(session, Model, id=check.model_id), []


def create_model_version_select_object(model_version: ModelVersion, mon_table: Table, top_feat: t.List[str]) -> Select:
    """Create model version select object."""
    existing_feat_columns = [mon_table.c[feat_name] for feat_name in top_feat if feat_name in mon_table.c]
    model_columns = [mon_table.c[col] for col in model_version.model_columns.keys()]
    select_obj: Select = select(*existing_feat_columns, *model_columns)
    return select_obj


def random_sample(select_obj: Select, mon_table: Table, n_samples: int = 10_000) -> Select:
    """Sample randomly on a select object by id/row number md5."""
    sampled_select_obj = select_obj
    if SAMPLE_ID_COL in mon_table.c:
        order_func = func.md5(mon_table.c[SAMPLE_ID_COL])
    else:
        order_func = func.md5(func.cast(func.row_number().over(), VARCHAR))
    return sampled_select_obj.order_by(order_func).limit(n_samples)


def dataframe_to_dataset_and_pred(df: t.Union[pd.DataFrame, None], model_version: ModelVersion, top_feat: t.List[str]) \
        -> t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
    """Dataframe_to_dataset_and_pred."""
    if df is None or len(df) == 0:
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

    available_features = [feat_name for feat_name in model_version.features_columns.keys() if feat_name in top_feat]
    cat_features = [feat_name for feat_name, feat_type in model_version.features_columns.items()
                    if feat_name in top_feat and feat_type in [ColumnType.CATEGORICAL, ColumnType.BOOLEAN]]
    dataset_params = {'features': available_features,
                      'cat_features': cat_features, 'label_type': model_version.model.task_type.value}

    if df[SAMPLE_LABEL_COL].isna().all():
        df.drop(SAMPLE_LABEL_COL, inplace=True, axis=1)
    else:
        dataset_params['label'] = SAMPLE_LABEL_COL

    if SAMPLE_TS_COL in df.columns:
        dataset_params['datetime_name'] = SAMPLE_TS_COL

    dataset = Dataset(df, **dataset_params)
    return dataset, y_pred, y_proba


def _batch_collate(batch):
    imgs, labels = zip(*batch)
    return list(imgs), list(labels)


def dataframe_to_vision_data_pred_props(df: t.Union[pd.DataFrame, None],
                                        task_type: TaskType,
                                        model_version: ModelVersion,
                                        s3_bucket: str,
                                        use_images: bool = False) \
        -> t.Tuple[VisionData, t.Dict[int, torch.Tensor], t.Dict[int, t.Any]]:
    """Dataframe_to_dataset_and_pred."""
    if df is None or len(df) == 0:
        return None, None, None

    df.reset_index(drop=True, inplace=True)
    if task_type == TaskType.VISION_DETECTION:
        labels = df[SAMPLE_LABEL_COL].apply(torch.Tensor).to_dict()
    else:
        labels = df[SAMPLE_LABEL_COL].to_dict()
    df.drop(SAMPLE_LABEL_COL, inplace=True, axis=1)

    preds = df[SAMPLE_PRED_COL].apply(torch.Tensor).to_dict()
    df.drop(SAMPLE_PRED_COL, inplace=True, axis=1)

    s3_images = None
    if SAMPLE_S3_IMAGE_COL in df.columns:
        if use_images and not df[SAMPLE_S3_IMAGE_COL].isna().any():
            s3_images = df[SAMPLE_S3_IMAGE_COL].to_list()
        df.drop(SAMPLE_S3_IMAGE_COL, inplace=True, axis=1)

    if df.empty:
        static_props = None
    else:
        static_props = defaultdict(dict)
        for col in df.columns:
            prop_type, prop_name = col.split(' ', 1)
            prop_type = PropertiesInputType(prop_type)
            for ind, item in df[col].items():
                if static_props[ind].get(prop_type) is None:
                    static_props[ind][prop_type] = {prop_name: item}
                else:
                    static_props[ind][prop_type][prop_name] = item
    data_loader = DataLoader(LabelVisionDataset(labels, s3_images), batch_size=30, collate_fn=_batch_collate)

    # We need to convert the label map to be {int: str} because in the db we must have the keys as strings
    label_map = {int(key): val for key, val in model_version.label_map.items()} if model_version.label_map else None

    return (TASK_TYPE_TO_VISION_DATA_CLASS[task_type](data_loader, s3_bucket=s3_bucket, label_map=label_map),
            preds, static_props)


def get_top_features_or_from_conf(model_version: ModelVersion,
                                  additional_kwargs: MonitorCheckConfSchema,
                                  n_top: int = 30) -> t.Tuple[t.List[str], t.Optional[pd.Series]]:
    """Get top features sorted by feature importance and the feature_importance or by the check config."""
    if additional_kwargs is not None \
        and (additional_kwargs.check_conf.get(CheckParameterTypeEnum.FEATURE) is not None
             or additional_kwargs.check_conf.get(CheckParameterTypeEnum.PROPERTY) is not None):
        features = additional_kwargs.check_conf.get(CheckParameterTypeEnum.FEATURE, []) + \
            additional_kwargs.check_conf.get(CheckParameterTypeEnum.PROPERTY, [])
        if model_version.feature_importance is not None:
            feat_dict = pd.Series({key: val for key, val in
                                   model_version.feature_importance.items() if key in features})
        else:
            feat_dict = None
        return features, feat_dict
    return model_version.get_top_features(n_top)


async def get_results_for_model_versions_per_window(
        model_versions_dataframes: t.List[t.Tuple[pd.DataFrame, t.List[t.Dict]]],
        model_versions: t.List[ModelVersion],
        model: Model,
        dp_check: BaseCheck,
        additional_kwargs: MonitorCheckConfSchema,
        s3_bucket: str,
        with_display: bool = False,
        use_images: bool = False,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions per window."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)
    task_type = model.task_type
    is_vision_check = isinstance(dp_check,
                                 (vision_base_checks.SingleDatasetCheck, vision_base_checks.TrainTestCheck))

    model_results = {}
    for (reference_table_dataframe, test_infos), model_version in zip(model_versions_dataframes, model_versions):
        # If reference is none then it wasn't queried (single dataset check) and if it's empty then it was queried
        # and data wasn't found, therefore skipping the run.
        if reference_table_dataframe is not None and reference_table_dataframe.empty:
            model_results[model_version] = None
            continue

        check_results = []
        if not is_vision_check:
            reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
                reference_table_dataframe, model_version, top_feat)
        else:
            reference_table_ds, reference_table_pred, reference_table_props = dataframe_to_vision_data_pred_props(
                reference_table_dataframe, task_type, model_version, s3_bucket, use_images=use_images)

        for curr_test_info in test_infos:
            current_data = curr_test_info['data']
            # If the data is cache result we are assuming it was indeed found in the cache and was validated before
            # passed here (meaning current_data.found must be true here)
            if isinstance(current_data, CacheResult):
                curr_result = current_data
            # If current_data is not cache result, then it must be a dataframe. If the dataframe is empty, skipping the
            # run and putting none result
            elif current_data.empty:
                curr_result = None
            else:
                if not is_vision_check:
                    test_ds, test_pred, test_proba = dataframe_to_dataset_and_pred(current_data,
                                                                                   model_version,
                                                                                   top_feat)
                else:
                    test_ds, test_pred, test_props = dataframe_to_vision_data_pred_props(current_data,
                                                                                         task_type,
                                                                                         model_version,
                                                                                         s3_bucket,
                                                                                         use_images=use_images)
                try:
                    if isinstance(dp_check,  tabular_base_checks.SingleDatasetCheck):
                        curr_result = dp_check.run(
                            test_ds, feature_importance=feat_imp,
                            y_pred_train=test_pred, y_proba_train=test_proba,
                            with_display=with_display, model_classes=model_version.classes)
                    elif isinstance(dp_check, tabular_base_checks.TrainTestCheck):
                        curr_result = dp_check.run(
                            reference_table_ds, test_ds, feature_importance=feat_imp,
                            y_pred_train=reference_table_pred, y_proba_train=reference_table_proba,
                            y_pred_test=test_pred, y_proba_test=test_proba,
                            with_display=with_display, model_classes=model_version.classes)
                    elif isinstance(dp_check,  vision_base_checks.SingleDatasetCheck):
                        curr_result = dp_check.run(
                            test_ds, train_predictions=test_pred, train_properties=test_props,
                            with_display=with_display)
                    elif isinstance(dp_check, vision_base_checks.TrainTestCheck):
                        curr_result = dp_check.run(
                            reference_table_ds, test_ds, train_predictions=reference_table_pred,
                            train_properties=reference_table_props, test_predictions=test_pred,
                            test_properties=test_props, with_display=with_display)
                    else:
                        raise ValueError('incompatible check type')

                # In case of exception in the run putting none result
                except DeepchecksBaseError as e:
                    message = f'For model(id={model.id}) version(id={model_version.id}) check({dp_check.name()}) ' \
                              f'got exception: {e.message}'
                    logging.getLogger('monitor_run_logger').error(message)
                    curr_result = None

            check_results.append({'result': curr_result, 'start': curr_test_info['start'],
                                  'end': curr_test_info['end']})

        model_results[model_version] = check_results

    return model_results


async def get_results_for_model_versions_for_reference(
        model_versions_dataframes: t.List[t.Tuple[pd.DataFrame, t.List[t.Dict]]],
        model_versions: t.List[ModelVersion],
        model: Model,
        dp_check: BaseCheck,
        additional_kwargs: MonitorCheckConfSchema,
        s3_bucket: str,
        use_images: bool = False,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions for reference."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)
    task_type = model.task_type
    is_vision_check = isinstance(dp_check,
                                 (vision_base_checks.SingleDatasetCheck, vision_base_checks.TrainTestCheck))

    model_reduces = {}
    # there is not test_info objects as in the run check per window because test isn't used here
    for (reference_table_dataframe, _), model_version in zip(model_versions_dataframes, model_versions):
        if reference_table_dataframe.empty:
            model_reduces[model_version] = None
            continue

        reduced_outs = []
        if not is_vision_check:
            reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
                reference_table_dataframe, model_version, top_feat)
        else:
            reference_table_ds, reference_table_pred, reference_table_props = dataframe_to_vision_data_pred_props(
                reference_table_dataframe, task_type, model_version, s3_bucket, use_images=use_images)
        try:
            if isinstance(dp_check,  tabular_base_checks.SingleDatasetCheck):
                curr_result = dp_check.run(reference_table_ds, feature_importance=feat_imp,
                                           y_pred_train=reference_table_pred, y_proba_train=reference_table_proba,
                                           with_display=False)
            elif isinstance(dp_check,  vision_base_checks.SingleDatasetCheck):
                curr_result = dp_check.run(reference_table_ds, train_predictions=reference_table_pred,
                                           train_properties=reference_table_props, with_display=False)
            else:
                raise ValueError('incompatible check type')

        # In case of exception in the run putting none result
        except DeepchecksBaseError as e:
            logging.getLogger('monitor_run_logger').exception(e.message)
            curr_result = None

        reduced_outs.append({'result': curr_result})

        model_reduces[model_version] = reduced_outs

    return model_reduces
