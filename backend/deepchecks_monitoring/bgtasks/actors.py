# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
"""Alert execution logic."""
import logging
import logging.handlers
import typing as t
from collections import defaultdict

import anyio
import pandas as pd
import pendulum as pdl
import sqlalchemy as sa
import uvloop
from deepchecks import tabular, vision
from deepchecks.core.checks import SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.utils.dataframes import un_numpy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.bgtasks.task import ExecutionStrategy, Worker, actor
from deepchecks_monitoring.config import DatabaseSettigns
from deepchecks_monitoring.logic.check_logic import MonitorOptions, load_data_for_check
from deepchecks_monitoring.logic.model_logic import dataframe_to_dataset_and_pred, dataframe_to_vision_data_pred_props
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.alert_rule import AlertRule, Condition
from deepchecks_monitoring.models.model import TaskType
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.models.monitor import Monitor
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import DataFilterList, make_oparator_func

__all__ = ["execute_alert_rule"]


@actor(queue_name="alert-rules", execution_strategy=ExecutionStrategy.NOT_ATOMIC)
async def execute_alert_rule(
    alert_rule_id: int,
    timestamp: str,
    session: AsyncSession,
    **kwargs  # pylint: disable=unused-argument
):
    """Execute alert rule."""
    alert_rule = t.cast(AlertRule, await session.scalar(
        sa.select(AlertRule)
        .where(AlertRule.id == alert_rule_id)
        .options(
            joinedload(AlertRule.monitor).options(joinedload(Monitor.check)),
        )
    ))

    if alert_rule is None:
        raise ValueError(f"Did not find alert rule with id {alert_rule.id}")

    monitor = alert_rule.monitor
    check = monitor.check
    end_time = pdl.parser.parse(timestamp)
    start_time = end_time - pdl.duration(seconds=t.cast(int, monitor.lookback))

    model_versions = t.cast(t.List[ModelVersion], (await session.scalars(
        sa.select(ModelVersion)
        .where(ModelVersion.model_id == check.model_id)
        .where(ModelVersion.start_time <= end_time)
        .where(ModelVersion.end_time >= start_time)
        .options(joinedload(ModelVersion.model))
    )).all())

    check_instance = check.initialize_check()
    load_reference = isinstance(check_instance, TrainTestBaseCheck)
    check_results: t.Dict[ModelVersion, t.Dict[str, t.Any]] = {}

    for version in model_versions:
        top_features, feature_importance = version.get_top_features()
        feature_importance = pd.Series(feature_importance)
        features_columns = t.cast(t.Dict[str, t.Any], version.features_columns)

        test_data_future, reference_data_future = load_data_for_check(
            version,
            session,
            top_features,
            with_reference=load_reference,
            options=MonitorOptions(
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                filter=t.cast(DataFilterList, monitor.data_filters)
            )
        )

        test_data = pd.DataFrame.from_dict((await test_data_future).all())

        if load_reference and reference_data_future is None:
            raise RuntimeError(
                "Internal error: load_data_for_check should have "
                "returned reference awaitable"
            )

        reference_data: t.Optional[pd.DataFrame] = None

        if reference_data_future is not None:
            reference_data = pd.DataFrame.from_dict((await reference_data_future).all())

        # release transaction resources
        # expire_on_commit is expected to be set to False
        await session.commit()

        reduced_result = execute_check(
            check=check_instance,
            model_version=version,
            test_data=test_data,
            reference_data=reference_data,
            features_columns=features_columns,
            top_features=top_features,
            feature_importance=feature_importance
        )

        if reduced_result:
            check_results[version] = {k: un_numpy(v) for k, v in reduced_result.items()}

    if alert := assert_check_results(alert_rule, check_results):
        alert.start_time = start_time
        alert.end_time = end_time
        session.add(alert)
        await session.commit()
        return alert


def assert_check_results(
    alert_rule: AlertRule,
    results: t.Dict[ModelVersion, t.Dict[str, t.Any]]
) -> t.Optional[Alert]:
    """Assert check result in accordance to alert rule."""
    monitor = alert_rule.monitor
    alert_condition = t.cast(Condition, alert_rule.condition)
    operator = make_oparator_func(alert_condition.operator)
    assert_value = lambda v: operator(v, alert_condition.value)

    failures = (
        (
            # JSON serialization fails with numerical keys,
            # therefore we cast id to string
            str(model_version.id),
            value_name
        )
        for model_version, version_results in results.items()
        for value_name, value in version_results.items()
        if (monitor.filter_key is None or monitor.filter_key == value_name) and assert_value(value)
    )

    failed_values = defaultdict(list)

    for version_id, failed_value_name in failures:
        failed_values[version_id].append(failed_value_name)

    if failed_values:
        return Alert(
            alert_rule_id=alert_rule.id,
            failed_values=failed_values
        )


def execute_check(
    check: t.Union[TrainTestBaseCheck, SingleDatasetBaseCheck],
    model_version: ModelVersion,
    test_data: pd.DataFrame,
    reference_data: t.Optional[pd.DataFrame],
    features_columns: t.Dict[str, t.Any],
    top_features: t.List[str],
    feature_importance: pd.Series
) -> t.Optional[t.Dict[str, t.Any]]:
    """Execute check instance with given parameters."""
    tabular_checks = (tabular.SingleDatasetCheck, tabular.TrainTestCheck)
    vision_checks = (vision.SingleDatasetCheck, vision.TrainTestCheck)
    if isinstance(check, tabular_checks):
        return execute_tabular_check(
            check=check,
            test_data=test_data,
            reference_data=reference_data,
            features_columns=features_columns,
            top_features=top_features,
            feature_importance=feature_importance
        )
    elif isinstance(check, vision_checks):
        return execute_vision_check(
            check=check,
            test_data=test_data,
            reference_data=reference_data,
            task_type=t.cast(TaskType, model_version.model.task_type)
        )
    else:
        raise TypeError(f"Unknown type of check {type(check)}")


def execute_tabular_check(
    check: t.Union[tabular.TrainTestCheck, tabular.SingleDatasetCheck],
    test_data: pd.DataFrame,
    reference_data: t.Optional[pd.DataFrame],
    features_columns: t.Dict[str, t.Any],
    top_features: t.List[str],
    feature_importance: pd.Series
) -> t.Optional[t.Dict[str, t.Any]]:
    """Execute tabular check instance with given parameters."""
    test_dataset, test_pred, test_proba = dataframe_to_dataset_and_pred(
        df=test_data,
        feat_schema=features_columns,
        top_feat=top_features
    )
    if isinstance(check, tabular.SingleDatasetCheck):
        return check.run(
            test_dataset,
            feature_importance=pd.Series(feature_importance),
            y_pred_train=test_pred,
            y_proba_train=test_proba,
            with_display=False
        ).reduce_output()

    if isinstance(check, tabular.TrainTestCheck):
        if reference_data is None:
            raise ValueError("TrainTestCheck requires referece data")
        reference_dataset, reference_pred, reference_proba = dataframe_to_dataset_and_pred(
            df=reference_data,
            feat_schema=features_columns,
            top_feat=top_features
        )
        return check.run(
            reference_dataset,
            test_dataset,
            feature_importance=pd.Series(feature_importance),
            y_pred_train=reference_pred,
            y_proba_train=reference_proba,
            y_pred_test=test_pred,
            y_proba_test=test_proba,
            with_display=False
        ).reduce_output()


def execute_vision_check(
    check: t.Union[vision.SingleDatasetCheck, vision.TrainTestCheck],
    test_data: pd.DataFrame,
    reference_data: t.Optional[pd.DataFrame],
    task_type: TaskType,
) -> t.Optional[t.Dict[str, t.Any]]:
    """Execute vision check instance with given parameters."""
    test_dataset, test_pred, test_props = dataframe_to_vision_data_pred_props(test_data, task_type)

    if isinstance(check, vision.SingleDatasetCheck):
        return check.run(
            test_dataset,
            train_predictions=test_pred,
            train_properties=test_props,
            with_display=False
        ).reduce_output()

    if isinstance(check, vision.TrainTestCheck):
        if reference_data is None:
            raise ValueError("TrainTestCheck requires referece data")
        r = dataframe_to_vision_data_pred_props(reference_data, task_type)
        reference_dataset, reference_table_pred, reference_table_props = r
        return check.run(
            reference_dataset,
            test_dataset,
            train_predictions=reference_table_pred,
            train_properties=reference_table_props,
            test_predictions=test_pred,
            test_properties=test_props,
            with_display=False
        ).reduce_output()


def execute_worker():
    class Settings(DatabaseSettigns):
        worker_logfile: t.Optional[str] = None  # scheduler.log
        worker_loglevel: str = "INFO"
        worker_logfile_maxsize: int = 10000000  # 10MB
        worker_logfile_backup_count: int = 3

    async def main():
        settings = Settings()  # type: ignore

        root_logger = logging.getLogger()
        logger = logging.getLogger("alerts-executor")

        root_logger.setLevel(settings.worker_loglevel)
        logger.setLevel(settings.worker_loglevel)

        if settings.worker_logfile:
            logger.addHandler(logging.handlers.RotatingFileHandler(
                filename=settings.worker_logfile,
                maxBytes=settings.worker_logfile_backup_count,
            ))

        async with ResourcesProvider(settings) as rp:
            async with anyio.create_task_group() as g:
                g.start_soon(Worker(
                    engine=rp.async_database_engine,
                    actors=[execute_alert_rule],
                ).start)

    uvloop.install()
    anyio.run(main)


if __name__ == "__main__":
    execute_worker()
