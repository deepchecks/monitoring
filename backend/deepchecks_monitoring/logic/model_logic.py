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

import numpy as np
import pandas as pd
import pendulum as pdl
from deepchecks.core import BaseCheck, errors
from deepchecks.tabular import Dataset, Suite
from deepchecks.tabular import base_checks as tabular_base_checks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.monitoring_utils import CheckParameterTypeEnum, MonitorCheckConfSchema, fetch_or_404
from deepchecks_monitoring.schema_models import Check, Model, ModelVersion
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_LABEL_COL, SAMPLE_PRED_COL, SAMPLE_PRED_PROBA_COL,
                                                             SAMPLE_TS_COL, ColumnType)

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    from deepchecks_monitoring.schema_models.model import TaskType

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


def dataframe_to_dataset_and_pred(
    df: t.Union[pd.DataFrame, None],
    features_columns: t.Dict[t.Any, str],
    task_type: str,
    top_feat: t.List[str],
    dataset_name: t.Optional[str] = None
) -> t.Tuple[t.Optional[Dataset], t.Optional[np.ndarray], t.Optional[np.ndarray]]:
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
        for feat_name in features_columns.keys()
        if feat_name in top_feat
    ]
    cat_features = [
        feat_name
        for feat_name, feat_type in features_columns.items()
        if feat_name in top_feat and feat_type in [ColumnType.CATEGORICAL, ColumnType.BOOLEAN]
    ]
    dataset_params = {
        'features': available_features,
        'cat_features': cat_features,
        'label_type': task_type,
        'dataset_name': dataset_name
    }

    if SAMPLE_LABEL_COL in df.columns:
        if df[SAMPLE_LABEL_COL].isna().all():
            df = df.drop(SAMPLE_LABEL_COL, axis=1)
        else:
            df = df.rename(columns={SAMPLE_LABEL_COL: 'label'})
            dataset_params['label'] = 'label'

    # TODO: add support in deepchecks for train/test without both having a datetime column
    if SAMPLE_TS_COL in df.columns:
        df = df.drop(SAMPLE_TS_COL, axis=1)

    dataset = Dataset(df, **dataset_params)
    return dataset, y_pred, y_proba


def get_top_features_or_from_conf(
    model_version: ModelVersion,
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = None,
    n_top: int = 30
) -> t.Tuple[t.List[str], t.Optional[pd.Series]]:
    """Get top features sorted by feature importance and the feature_importance or by the check config."""
    if (
        additional_kwargs is not None
        and (
            additional_kwargs.check_conf.get(CheckParameterTypeEnum.FEATURE) is not None
            or additional_kwargs.check_conf.get(CheckParameterTypeEnum.PROPERTY) is not None
        )
    ):
        features = (
            additional_kwargs.check_conf.get(CheckParameterTypeEnum.FEATURE, [])
            + additional_kwargs.check_conf.get(CheckParameterTypeEnum.PROPERTY, [])
        )  # type: ignore TODO
        if model_version.feature_importance is not None:
            feat_dict = pd.Series({
                key: val
                for key, val in model_version.feature_importance.items()
                if key in features
            })
        else:
            feat_dict = None
        return features, feat_dict

    return model_version.get_top_features(n_top)


def initialize_check(
    check_config: t.Any,
    balance_classes,
    additional_kwargs=None
) -> BaseCheck:
    """Initialize an instance of Deepchecks' check. also filter the extra parameters to only include the parameters \
    that are relevant to the check type.

    Returns
    -------
    Deepchecks' check.
    """
    new_config = check_config.copy()
    extra_kwargs = additional_kwargs.check_conf if additional_kwargs is not None else {}
    for kwarg_type, kwarg_val in extra_kwargs.items():
        kwarg_type = CheckParameterTypeEnum(kwarg_type)
        kwarg_name = kwarg_type.to_kwarg_name()
        if kwarg_val is not None and kwarg_type == CheckParameterTypeEnum.AGGREGATION_METHOD:
            kwarg_val = kwarg_val[0]
        if kwarg_type != CheckParameterTypeEnum.PROPERTY:
            new_config['params'][kwarg_name] = kwarg_val

    new_config['params']['n_samples'] = None
    new_config['params']['balance_classes'] = balance_classes
    return BaseCheck.from_config(new_config)


async def get_results_for_model_versions_per_window(
        model_versions_data: t.Dict,
        model_versions: t.List[ModelVersion],
        model: Model,
        check: t.Union[Check, t.List[Check]],
        additional_kwargs: MonitorCheckConfSchema,
        with_display: bool = False,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions per window."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)

    model_results = {}
    need_ref = check.is_reference_required if isinstance(check, Check) else \
        any((c.is_reference_required for c in check))

    for model_version in model_versions:
        data_dict = model_versions_data[model_version.id]
        # If this is a train test check then we require reference data in order to run
        if 'reference' in data_dict and data_dict['reference'] is not None:
            reference_results = await data_dict['reference']
            reference = pd.DataFrame(reference_results.all(), columns=[str(key) for key in reference_results.keys()])
        else:
            reference = None

        if isinstance(check, Check):
            dp_check = initialize_check(
                check.config,
                model_version.balance_classes,
                additional_kwargs
            )
        else:
            all_checks = []
            for c in check:
                init_check = initialize_check(
                    c.config,
                    model_version.balance_classes,
                    additional_kwargs
                )
                init_check.check_id = c.id
                all_checks.append(init_check)
            dp_check = Suite('', *all_checks)

        reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
            df=reference,
            features_columns=t.cast('dict[str, str]', model_version.features_columns),
            task_type=t.cast('TaskType', model.task_type).value,
            top_feat=top_feat,
            dataset_name='Reference'
        )

        model_results[model_version] = []
        for curr_window in data_dict['windows']:
            result = {'start': curr_window.get('start'), 'end': curr_window.get('end'), 'from_cache': False,
                      'result': None}
            model_results[model_version].append(result)

            # If we already loaded result from the cache, then no need to run the check again
            if 'result' in curr_window:
                result['from_cache'] = True
                result['result'] = curr_window['result']
                continue
            elif 'query' in curr_window:
                # The given window might be out of range for the model version, so we get None as query
                if curr_window['query'] is None:
                    continue
                data_results = await curr_window['query']
                data_df = pd.DataFrame(data_results.all(), columns=[str(key) for key in data_results.keys()])
            else:
                raise ValueError('Window must have either result or query, something went wrong')

            # If reference is none it was not provided at all.
            if need_ref and reference is None:
                raise ValueError(f'Reference data is required for {check.name} check, but was not provided.')
            # If reference is empty, query was provided but no reference data was found
            if data_df.empty or (need_ref and reference.empty):
                continue

            result['result'] = run_deepchecks(data_df, model_version, model, top_feat, dp_check,
                                              feat_imp, with_display, reference_table_ds, reference_table_pred,
                                              reference_table_proba)

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
        df=test_data,
        features_columns=model_version.features_columns,
        task_type=t.cast('TaskType', model.task_type).value,
        top_feat=top_feat,
        dataset_name='Production',
    )
    shared_args = dict(
        feature_importance=feat_imp,
        with_display=with_display,
        model_classes=model_version.classes
    )
    single_dataset_args = dict(
        # NOTE: this is not a bug or a mistake
        #
        # it is not possible to execute a check instance only on a test dataset,
        # without a train dataset, but a reverse situation is allowed, a check
        # instance can be executed only on a train dataset. Therefore, here, we are
        # passing our test dataset as a train dataset
        #
        # see 'deepchecks.tabular.context.Context.__init__' method for more info
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


async def get_results_for_model_versions_for_reference(
        model_versions_dataframes: t.Dict,
        model_versions: t.List[ModelVersion],
        model: Model,
        check: Check,
        additional_kwargs: MonitorCheckConfSchema,
) -> t.Dict[ModelVersion, t.Optional[t.List[t.Dict]]]:
    """Get results for active model version sessions for reference."""
    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], additional_kwargs)

    model_reduces = {}
    for model_version in model_versions:
        version_data = model_versions_dataframes[model_version.id]
        reference = await version_data['reference']
        reference = pd.DataFrame(reference.all(), columns=[str(key) for key in reference.keys()])
        if reference.empty:
            model_reduces[model_version] = None
            continue

        reduced_outs = []
        reference_table_ds, reference_table_pred, reference_table_proba = dataframe_to_dataset_and_pred(
            df=reference,
            features_columns=t.cast('dict[str, str]', model_version.features_columns),
            task_type=t.cast('TaskType', model.task_type).value,
            top_feat=top_feat,
            dataset_name='Reference'
        )

        dp_check = initialize_check(
            check.config,
            model_version.balance_classes,
            additional_kwargs
        )
        try:
            if isinstance(dp_check, tabular_base_checks.SingleDatasetCheck):
                curr_result = dp_check.run(reference_table_ds, feature_importance=feat_imp,
                                           y_pred_train=reference_table_pred, y_proba_train=reference_table_proba,
                                           with_display=False)
            else:
                curr_result = None

        # In case of exception in the run putting none result
        except errors.DeepchecksBaseError as e:
            message = f'For model(id={model.id}) version(id={model_version.id}) check({dp_check.name()}) ' \
                f'got exception: {e.message}'
            logging.getLogger('monitor_run_logger').error(message)
            curr_result = None

        reduced_outs.append({'result': curr_result})

        model_reduces[model_version] = reduced_outs

    return model_reduces
