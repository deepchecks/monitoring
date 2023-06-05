# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining parallel check execution logic."""
import contextlib
import logging
import typing as t
from collections import defaultdict

import numpy as np
import pandas as pd
import ray
import sqlalchemy as sa
from deepchecks.core import errors
from deepchecks.tabular import Dataset, Suite
from deepchecks.tabular import base_checks as tabular_base_checks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload

from deepchecks_monitoring.exceptions import NotFound
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.check_logic import MonitorOptions, create_execution_data_query, reduce_check_result
from deepchecks_monitoring.logic.model_logic import (dataframe_to_dataset_and_pred, get_model_versions_for_time_range,
                                                     get_top_features_or_from_conf, initialize_check)
from deepchecks_monitoring.monitoring_utils import MonitorCheckConfSchema, configure_logger, fetch_or_404
from deepchecks_monitoring.public_models.organization import Organization
from deepchecks_monitoring.schema_models.check import Check
from deepchecks_monitoring.schema_models.model import Model, TaskType
from deepchecks_monitoring.utils.database import SessionParameter

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    import pendulum as pdl

__all__ = ['execute_check_per_window', 'CheckPerWindowExecutor']


class WindowResult(t.TypedDict):
    index: int
    result: t.Any
    start: 'pdl.datetime.DateTime'
    end: 'pdl.datetime.DateTime'


class WindowExecutionArgs(t.TypedDict):
    model_version_id: int
    window_index: int
    start: 'pdl.datetime.DateTime'
    end: 'pdl.datetime.DateTime'
    samples_query: 'sa.sql.Selectable'


class CheckPerWindowExecutionArgs(t.TypedDict):
    """Arguments for check execution on a set for windows."""

    check_config: dict[str, t.Any]
    additional_check_kwargs: MonitorCheckConfSchema | None
    windows: list[WindowExecutionArgs]
    classes: dict[int, t.Optional[list[str | int]]]   # dict[model-version-id, list-of-classes]
    balance_classes: dict[int, bool]                  # dict[model-version-id, bool]
    feature_columns: dict[int, dict[str, str]]        # dict[model-version-id, columns]
    references_queries: dict[int, 'sa.sql.Selectable']  # dict[model-version-id, window-query]
    task_type: TaskType
    top_features: list[str]
    feature_importance: dict[str, float] | None
    organization_id: int


async def execute_check_per_window(
    check_id: int,
    session: AsyncSession,
    actor_pool: t.Any,
    monitor_options: MonitorOptions,
    organization_id: int,
    monitor_id: t.Optional[int] = None,
    cache_funcs: t.Optional[CacheFunctions] = None,
    n_of_windows_per_worker: int = 10,
):
    """Execute check."""
    check = await fetch_or_404(
        session=session,
        model=Check,
        id=check_id,
        options=joinedload(Check.model).load_only(Model.timezone)
    )

    all_windows = monitor_options.calculate_windows(check.model.timezone)[-31:]
    frequency = monitor_options.frequency
    assert frequency is not None

    aggregation_window = frequency.to_pendulum_duration() * monitor_options.aggregation_window

    model, model_versions = await get_model_versions_for_time_range(
        session=session,
        model_id=t.cast(int, check.model_id),
        start_time=all_windows[0] - aggregation_window,
        end_time=all_windows[-1]
    )

    if len(model_versions) == 0:
        raise NotFound('No relevant model versions found')

    top_feat, feat_imp = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)
    model_columns = list(model_versions[0].model_columns.keys())
    columns = top_feat + model_columns

    results: dict[int, dict[int, WindowResult]] = defaultdict(dict)
    windows_to_calculate: list[WindowExecutionArgs] = []

    model_versions_names: dict[int, str] = {}
    references_queries: dict[int, 'sa.sql.Selectable'] = {}
    features_per_model_version: dict[int, dict[str, str]] = {}
    balance_classes_per_model_version: dict[int, bool] = {}
    classes_per_model_version: dict[int, t.Optional[list[str | int]]] = {}

    for model_version in model_versions:
        if not model_version.is_filter_fit(monitor_options.filter):
            continue

        model_version_id = t.cast(int, model_version.id)
        model_versions_names[model_version_id] = t.cast(str, model_version.name)
        create_reference_query = False

        for window_index, window_end in enumerate(all_windows):
            window_start = window_end - aggregation_window

            results[model_version_id][window_index] = {
                'index': window_index,
                'start': window_start,
                'end': window_end,
                'result': None  # will be filled later
            }

            if monitor_id and cache_funcs:
                cached_result = cache_funcs.get_monitor_cache(
                    organization_id,
                    model_version_id,
                    monitor_id,
                    window_start,
                    window_end
                )
                if cached_result.found:
                    results[model_version_id][window_index]['result'] = cached_result.value
                    continue

            if not model_version.is_in_range(window_start, window_end):
                continue

            features_per_model_version[model_version_id] = t.cast('dict[t.Any, t.Any]', model_version.features_columns)
            balance_classes_per_model_version[model_version_id] = t.cast('bool', model_version.balance_classes)
            classes_per_model_version[model_version_id] = t.cast('t.Optional[list[str|int]]', model_version.classes)

            create_reference_query = True
            period = window_end - window_start

            samples_query = create_execution_data_query(
                model_version,
                monitor_options,
                period=period,
                columns=columns,
                with_labels=t.cast(bool, check.is_label_required),
                filter_labels_exist=t.cast(bool, check.is_label_required),
                is_ref=False
            )
            windows_to_calculate.append({
                'window_index': window_index,
                'model_version_id': model_version_id,
                'samples_query': samples_query,
                'start': window_start,
                'end': window_end,
            })

        if check.is_reference_required and create_reference_query:
            references_queries[model_version_id] = create_execution_data_query(
                model_version,
                monitor_options,
                columns=columns,
                with_labels=t.cast(bool, check.is_label_required),
                filter_labels_exist=t.cast(bool, check.is_label_required),
                is_ref=True
            )

    # TODO: do not use actors pool if you have small number of windows

    task_factory = lambda pool, batch: pool.execute.remote(CheckPerWindowExecutionArgs(
        check_config=t.cast('dict[t.Any, t.Any]', check.config),
        additional_check_kwargs=monitor_options.additional_kwargs,
        windows=batch,
        task_type=t.cast(TaskType, model.task_type),
        organization_id=organization_id,
        references_queries=references_queries,
        feature_importance=dict(feat_imp) if feat_imp is not None else None,
        top_features=top_feat,
        balance_classes=balance_classes_per_model_version,
        feature_columns=features_per_model_version,
        classes=classes_per_model_version
    ))
    windows_batches = (
        windows_to_calculate[i:i + n_of_windows_per_worker]
        for i in range(0, len(windows_to_calculate), n_of_windows_per_worker)
    )
    calculated_check_results = (
        result
        for batch_results in actor_pool.map_unordered(task_factory, windows_batches)
        for result in batch_results
    )

    for result in calculated_check_results:
        value = result['result']
        window_index = result['window_index']
        model_version_id = result['model_version_id']
        start = results[model_version_id][window_index]['start']
        end = results[model_version_id][window_index]['end']

        # TODO: consider caching results not only when a 'monitor_id' is provided
        if cache_funcs and monitor_id:
            cache_funcs.set_monitor_cache(
                organization_id,
                result['model_version_id'],
                monitor_id,
                start,
                end,
                value
            )

        results[model_version_id][window_index]['result'] = value

    output = {}

    for k, v in results.items():
        key = lambda it: it['index']
        output[model_versions_names[k]] = [
            it['result'] if it else None
            for it in sorted(v.values(), key=key)
        ]

    return {
        'output': output,
        'time_labels': [d.isoformat() for d in all_windows]
    }


def _execute_check_per_window(
    session: Session,
    args: CheckPerWindowExecutionArgs,
    logger: logging.Logger | None = None
) -> t.List[WindowResult]:
    logger = logger or configure_logger('check-executor')
    references_queries = args['references_queries']

    references_dataframes: dict[int, tuple[
        pd.DataFrame,
        Dataset | None,
        np.ndarray | None,
        np.ndarray | None
    ]] = {}

    results = []

    for window in args['windows']:
        reference_df = None
        reference_dataset = None
        reference_pred = None
        reference_proba = None
        features_columns = args['feature_columns'][window['model_version_id']]
        model_classes = args['classes'][window['model_version_id']]

        check_instance = initialize_check(
            args['check_config'],
            args['balance_classes'][window['model_version_id']],
            args['additional_check_kwargs']
        )
        window_result = {
            'window_index': window['window_index'],
            'model_version_id': window['model_version_id'],
            'result': None
        }

        results.append(window_result)

        if window['model_version_id'] in references_dataframes:
            reference_data = references_dataframes[window['model_version_id']]
            reference_df, reference_dataset, reference_pred, reference_proba = reference_data

        elif window['model_version_id'] in references_queries:
            query = references_queries[window['model_version_id']]
            query_result = session.execute(query)
            reference_df = pd.DataFrame(
                query_result.all(),
                columns=[str(key) for key in query_result.keys()]
            )
            reference_dataset, reference_pred, reference_proba = dataframe_to_dataset_and_pred(
                reference_df,
                features_columns=features_columns,
                task_type=args['task_type'].value,
                top_feat=args['top_features'],
                dataset_name='Reference'
            )
            references_dataframes[window['model_version_id']] = (
                reference_df,
                reference_dataset,
                reference_pred,
                reference_proba
            )

        if reference_df is not None and reference_df.empty:
            continue

        window_data = session.execute(window['samples_query'])
        window_df = pd.DataFrame(window_data.all(), columns=[str(key) for key in window_data.keys()])

        if window_df.empty:
            continue

        test_dataset, test_pred, test_proba = dataframe_to_dataset_and_pred(
            window_df,
            features_columns=features_columns,
            task_type=args['task_type'].value,
            top_feat=args['top_features'],
            dataset_name='Production'
        )

        try:
            check_result = _execute_check_instance(
                check_instance,
                test_dataset=test_dataset,
                train_dataset=reference_dataset,
                y_pred_test=test_pred,
                y_proba_test=test_proba,
                y_pred_train=reference_pred,
                y_proba_train=reference_proba,
                model_classes=model_classes,
                feature_importance=(
                    pd.Series(feature_importance)
                    if (feature_importance := args['feature_importance']) is not None
                    else None
                )
            )
        except errors.NotEnoughSamplesError:
            test_length = (
                test_dataset.n_samples
                if test_dataset is not None
                else None
            )
            reference_length = (
                reference_dataset.n_samples
                if reference_dataset is not None
                else None
            )
            logger.warning({
                'message': 'Window does not have enough sampes. ',
                'organization_id': args['organization_id'],
                'model_version_id': window['model_version_id'],
                'window_start': window['start'],
                'window_end': window['end'],
                'test_dataset_length': test_length,
                'reference_dataset_length': reference_length,
                'check_type_name': type(check_instance).__name__
            })
        except Exception:  # pylint: disable=broad-except
            logger.exception({
                'message': 'Unexpected exception, failed to execute the check instance',
                'organization_id': args['organization_id'],
                'model_version_id': window['model_version_id'],
                'window_start': window['start'],
                'window_end': window['end'],
                'check_type_name': type(check_instance).__name__
            })
        else:
            window_result['result'] = reduce_check_result(
                check_result,
                args['additional_check_kwargs']
            )

    return results


def _execute_check_instance(
    check_instance,
    train_dataset,
    test_dataset,
    y_pred_train,
    y_proba_train,
    y_pred_test,
    y_proba_test,
    feature_importance,
    model_classes,
):
    shared_args = {
        'feature_importance': feature_importance,
        'with_display': False,
        'model_classes': model_classes
    }
    single_dataset_args = {
        # NOTE: this is not a bug or a mistake
        #
        # it is not possible to execute a check instance only on a test dataset,
        # without a train dataset, but a reverse situation is allowed, a check
        # instance can be executed only on a train dataset. Therefore, here, we are
        # passing our test dataset as a train dataset
        #
        # see 'deepchecks.tabular.context.Context.__init__' method for more info
        'y_pred_train': y_pred_test,
        'y_proba_train': y_proba_test,
        **shared_args
    }
    train_test_args = {
        'train_dataset': train_dataset,
        'test_dataset': test_dataset,
        'y_pred_train': y_pred_train,
        'y_proba_train': y_proba_train,
        'y_pred_test': y_pred_test,
        'y_proba_test': y_proba_test,
        **shared_args
    }
    if isinstance(check_instance, tabular_base_checks.SingleDatasetCheck):
        args, kwargs = (test_dataset,), single_dataset_args
    elif isinstance(check_instance, tabular_base_checks.TrainTestCheck):
        args, kwargs = tuple(), train_test_args
    elif isinstance(check_instance, Suite):
        args, kwargs = (
            ((test_dataset,), single_dataset_args)
            if train_dataset is None
            else (tuple(), train_test_args | {'run_single_dataset': 'Test'})
        )
    else:
        raise ValueError(f'incompatible check type {type(check_instance)}')

    return check_instance.run(*args, **kwargs)


@ray.remote(max_restarts=-1)
class CheckPerWindowExecutor:
    """Ray actor for parallel check execution."""

    def __init__(self, database_uri: str):
        self.logger = configure_logger('parallel-check-executor-actor')
        self.engine = sa.create_engine(
            database_uri,
            pool_pre_ping=True,
            pool_recycle=1800  # 30 mins
        )

    def execute(self, args: CheckPerWindowExecutionArgs):
        try:
            with self._session(args['organization_id']) as s:
                return _execute_check_per_window(
                    session=s,
                    args=args,
                    logger=self.logger
                )
        except Exception:
            self.logger.exception({'message': 'Unexpected exception'})
            raise

    @contextlib.contextmanager
    def _session(self, organization_id):
        with Session(self.engine) as s:
            org = t.cast(t.Optional[Organization], s.get(Organization, organization_id))

            if org is None:
                message = f'Organization with id "{organization_id}" does not exist'
                self.logger.error({'message': message})
                raise RuntimeError(message)

            search_path = t.cast(str, org.schema_name)
            s.execute(SessionParameter('search_path', value=search_path))

            try:
                yield s
            except Exception:  # pylint: disable=broad-except
                s.rollback()
                raise
            else:
                s.commit()
            finally:
                s.close()
