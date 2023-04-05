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
import warnings

import numpy as np
import pandas as pd
import pendulum as pdl
from deepchecks.core import BaseCheck, errors
from deepchecks.tabular import Dataset, Suite
from deepchecks.tabular import base_checks as tabular_base_checks
from joblib import Parallel, delayed
from sqlalchemy import VARCHAR, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.monitoring_utils import CheckParameterTypeEnum, MonitorCheckConfSchema, fetch_or_404
from deepchecks_monitoring.schema_models import Check, Model, ModelVersion
from deepchecks_monitoring.schema_models.column_type import (REFERENCE_SAMPLE_ID_COL, SAMPLE_ID_COL, SAMPLE_LABEL_COL,
                                                             SAMPLE_PRED_COL, SAMPLE_PRED_PROBA_COL, SAMPLE_TS_COL,
                                                             ColumnType)

DEFAULT_N_SAMPLES = 5000


async def get_model_versions_for_time_range(session: AsyncSession,
                                            model_id: int,
                                            start_time: pdl.DateTime,
                                            end_time: pdl.DateTime) -> t.Tuple[Model, t.List[ModelVersion]]:
    """Get model versions for a time window."""
    model_results = await session.execute(select(Model).where(Model.id == model_id,
                                                              Model.id == ModelVersion.model_id,
                                                              ModelVersion.end_time >= start_time,
                                                              ModelVersion.start_time <= end_time)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    if model is not None:
        model_versions: t.List[ModelVersion] = model.versions
        return model, model_versions
    return await fetch_or_404(session, Model, id=model_id), []


def random_sample(select_obj: Select, table, n_samples: int = DEFAULT_N_SAMPLES) -> Select:
    """Sample randomly on a select object by id/row number md5."""
    sampled_select_obj = select_obj

    if SAMPLE_ID_COL in table.c:
        order_func = func.md5(table.c[SAMPLE_ID_COL])
    elif REFERENCE_SAMPLE_ID_COL in table.c:
        order_func = func.md5(func.cast(table.c[REFERENCE_SAMPLE_ID_COL], VARCHAR))
    else:
        name = (
            table.schema
            if not table.schema
            else f'{table.schema}.{table.name}'
        )
        warnings.warn(
            f'Table "{name}" does not contain neither "{SAMPLE_ID_COL}" '
            f'column nor "{REFERENCE_SAMPLE_ID_COL}" column'
        )
        order_func = func.md5(func.cast(func.row_number().over(), VARCHAR))

    return sampled_select_obj.order_by(order_func).limit(n_samples)


def dataframe_to_dataset_and_pred(
    df: t.Union[pd.DataFrame, None],
    model_version: ModelVersion,
    model: Model,
    top_feat: t.List[str],
    dataset_name: t.Optional[str] = None
) -> t.Tuple[Dataset, t.Optional[np.ndarray], t.Optional[np.ndarray]]:
    """Dataframe_to_dataset_and_pred."""
    if df is None or len(df) == 0:
        return None, None, None

    y_pred = None
    y_proba = None

    if SAMPLE_PRED_COL in df.columns:
        if not df[SAMPLE_PRED_COL].isna().all():
            y_pred = np.array(df[SAMPLE_PRED_COL].to_list())
        df = df.drop(SAMPLE_PRED_COL, axis=1)

    if SAMPLE_PRED_PROBA_COL in df.columns:
        if not df[SAMPLE_PRED_PROBA_COL].isna().all():
            y_proba = np.array(df[SAMPLE_PRED_PROBA_COL].to_list())
        df = df.drop(SAMPLE_PRED_PROBA_COL, axis=1)

    available_features = [
        feat_name
        for feat_name in model_version.features_columns.keys()
        if feat_name in top_feat
    ]
    cat_features = [
        feat_name
        for feat_name, feat_type in model_version.features_columns.items()
        if feat_name in top_feat and feat_type in [ColumnType.CATEGORICAL, ColumnType.BOOLEAN]
    ]
    dataset_params = {
        'features': available_features,
        'cat_features': cat_features,
        'label_type': model.task_type.value,
        'dataset_name': dataset_name
    }

    if SAMPLE_LABEL_COL in df.columns:
        if df[SAMPLE_LABEL_COL].isna().all():
            df = df.drop(SAMPLE_LABEL_COL, axis=1)
        else:
            df = df.rename(columns={SAMPLE_LABEL_COL: 'label'})
            dataset_params['label'] = 'label'

    if SAMPLE_TS_COL in df.columns:
        dataset_params['datetime_name'] = SAMPLE_TS_COL

    dataset = Dataset(df, **dataset_params)
    return dataset, y_pred, y_proba


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


def initialize_check(check: Check, model_version, additional_kwargs=None) -> BaseCheck:
    """Initialize an instance of Deepchecks' check. also filter the extra parameters to only include the parameters \
    that are relevant to the check type.

    Returns
    -------
    Deepchecks' check.
    """
    new_config = check.config.copy()
    extra_kwargs = additional_kwargs.check_conf if additional_kwargs is not None else {}
    for kwarg_type, kwarg_val in extra_kwargs.items():
        kwarg_type = CheckParameterTypeEnum(kwarg_type)
        kwarg_name = kwarg_type.to_kwarg_name()
        if kwarg_val is not None and kwarg_type == CheckParameterTypeEnum.AGGREGATION_METHOD:
            kwarg_val = kwarg_val[0]
        if kwarg_type != CheckParameterTypeEnum.PROPERTY:
            new_config['params'][kwarg_name] = kwarg_val

    new_config['params']['n_samples'] = None
    new_config['params']['balance_classes'] = model_version.balance_classes
    return BaseCheck.from_config(new_config)


def get_results_for_model_versions_per_window(
        model_versions_dataframes: t.List[t.Tuple[pd.DataFrame, t.List[t.Dict]]],
        model_versions: t.List[ModelVersion],
        model: Model,
        check: t.Union[Check, t.List[Check]],
        additional_kwargs: MonitorCheckConfSchema,
        with_display: bool = False,
        parallel: bool = True,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions per window."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)

    jobs = []
    model_results = {}
    need_ref = check.is_reference_required if isinstance(check, Check) else \
        any((c.is_reference_required for c in check))

    for (reference_table_dataframe, test_infos), model_version in zip(model_versions_dataframes, model_versions):
        # If this is a train test check then we require reference data in order to run
        missing_reference = need_ref and (reference_table_dataframe is None or reference_table_dataframe.empty)

        if isinstance(check, Check):
            dp_check = initialize_check(check, model_version, additional_kwargs)
        else:
            all_checks = []
            for c in check:
                init_check = initialize_check(c, model_version, additional_kwargs)
                init_check.check_id = c.id
                all_checks.append(init_check)
            dp_check = Suite('', *all_checks)

        reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
            reference_table_dataframe,
            model_version,
            model,
            top_feat,
            dataset_name='Reference'
        )

        model_results[model_version] = []
        for curr_test_info in test_infos:
            result = {'start': curr_test_info['start'], 'end': curr_test_info['end'], 'from_cache': False,
                      'result': None}
            model_results[model_version].append(result)
            # If we already loaded result from the cache, then no need to run the check again
            if 'result' in curr_test_info:
                result['from_cache'] = True
                result['result'] = curr_test_info['result']
            # If the check needs reference to run, but it is missing then skip the check and put none result.
            # If there is no result then must have a dataframe data. If the dataframe is empty, skipping the
            # run and putting none result
            elif missing_reference or curr_test_info['data'].empty:
                continue
            else:
                jobs.append(delayed(run_deepchecks)(curr_test_info['data'], model_version, model, top_feat, dp_check,
                                                    feat_imp, with_display, reference_table_ds, reference_table_pred,
                                                    reference_table_proba))
                # Map index of the job to location in dict
                result['job_index'] = len(jobs) - 1

    if jobs:
        # Do not want to use parallel for less than 3 jobs
        if parallel or len(jobs) <= 2:
            jobs = [job[0](*job[1], **job[2]) for job in jobs]
        else:
            jobs = Parallel(n_jobs=-1)(jobs)

        for model_version, version_results in model_results.items():
            for result in version_results:
                if 'job_index' in result:
                    result['result'] = jobs[result.pop('job_index')]
    return model_results


def run_deepchecks(
    test_data,
    model_version,
    model,
    top_feat,
    dp_check,
    feat_imp,
    with_display,
    reference_table_ds,
    reference_table_pred,
    reference_table_proba
):
    test_ds, test_pred, test_proba = dataframe_to_dataset_and_pred(
        test_data,
        model_version,
        model,
        top_feat,
        dataset_name='Production',
    )
    shared_args = dict(
        feature_importance=feat_imp,
        with_display=with_display,
        model_classes=model_version.classes
    )
    single_dataset_args = dict(
        y_pred_train=test_pred,
        y_proba_train=test_proba,
        **shared_args
    )
    train_test_args = dict(
        train_dataset=reference_table_ds,
        test_dataset=test_ds,
        y_pred_train=reference_table_pred,
        y_proba_train=reference_table_proba,
        y_pred_test=test_pred,
        y_proba_test=test_proba,
        **shared_args
    )
    try:
        if isinstance(dp_check, tabular_base_checks.SingleDatasetCheck):
            return dp_check.run(test_ds, **single_dataset_args)
        elif isinstance(dp_check, tabular_base_checks.TrainTestCheck):
            return dp_check.run(**train_test_args)
        elif isinstance(dp_check, Suite):
            if reference_table_ds is None:
                return dp_check.run(test_ds, **single_dataset_args)
            else:
                return dp_check.run(**train_test_args, run_single_dataset='Test')
        else:
            raise ValueError(f'incompatible check type {type(dp_check)}')
    # For not enough samples does not log the error
    except errors.NotEnoughSamplesError:
        # In case of exception in the run putting none result
        pass
    # For rest of the errors logs them
    except Exception as e:  # pylint: disable=broad-except
        # TODO: send error to sentry, needs to be done in the ee sub-package
        error_message = (
            str(e)
            if not (msg := getattr(e, 'message', None))
            else msg
        )
        logging.getLogger('monitor_run_logger').exception(
            'For model(id=%s) version(id=%s) check(%s) '
            'got exception: %s',
            model.id,
            model_version.id,
            dp_check.name(),
            error_message
        )


def get_results_for_model_versions_for_reference(
        model_versions_dataframes: t.List[t.Tuple[pd.DataFrame, t.List[t.Dict]]],
        model_versions: t.List[ModelVersion],
        model: Model,
        dp_check: BaseCheck,
        additional_kwargs: MonitorCheckConfSchema,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions for reference."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)

    model_reduces = {}
    # there is not test_info objects as in the run check per window because test isn't used here
    for (reference_table_dataframe, _), model_version in zip(model_versions_dataframes, model_versions):
        if reference_table_dataframe.empty:
            model_reduces[model_version] = None
            continue

        reduced_outs = []
        reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
            reference_table_dataframe,
            model_version,
            model,
            top_feat,
            dataset_name='Reference'
        )
        try:
            if isinstance(dp_check,  tabular_base_checks.SingleDatasetCheck):
                curr_result = dp_check.run(reference_table_ds, feature_importance=feat_imp,
                                           y_pred_train=reference_table_pred, y_proba_train=reference_table_proba,
                                           with_display=False)
            else:
                raise ValueError('incompatible check type')

        # In case of exception in the run putting none result
        except errors.DeepchecksBaseError as e:
            message = f'For model(id={model.id}) version(id={model_version.id}) check({dp_check.name()}) ' \
                        f'got exception: {e.message}'
            logging.getLogger('monitor_run_logger').error(message)
            curr_result = None

        reduced_outs.append({'result': curr_result})

        model_reduces[model_version] = reduced_outs

    return model_reduces
