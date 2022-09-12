# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for check running."""
import typing as t

import pandas as pd
import pendulum as pdl
from deepchecks import BaseCheck, SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.core.reduce_classes import ReduceFeatureMixin, ReducePropertyMixin
from deepchecks.tabular.metric_utils.scorers import (binary_scorers_dict, multiclass_scorers_dict,
                                                     regression_scorers_higher_is_better_dict)
from deepchecks.vision.metrics_utils.scorers import classification_dict, detection_dict
from deepchecks.vision.utils.vision_properties import PropertiesInputType
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import NotFound
from deepchecks_monitoring.logic.model_logic import (create_model_version_select_object,
                                                     filter_monitor_table_by_window_and_data_filters,
                                                     filter_table_selection_by_data_filters,
                                                     get_model_versions_for_time_range,
                                                     get_results_for_model_versions_per_window, random_sample)
from deepchecks_monitoring.models import ModelVersion, Monitor
from deepchecks_monitoring.models.alert import Alert
from deepchecks_monitoring.models.alert_rule import AlertRule
from deepchecks_monitoring.models.check import Check
from deepchecks_monitoring.models.column_type import SAMPLE_LABEL_COL
from deepchecks_monitoring.models.model import Model, TaskType
from deepchecks_monitoring.utils import (CheckParameterTypeEnum, DataFilterList, MonitorCheckConf,
                                         MonitorCheckConfSchema, fetch_or_404, make_oparator_func)


class AlertCheckOptions(BaseModel):
    """Alert check schema."""

    end_time: str
    grace_period: t.Optional[bool] = True


class MonitorOptions(BaseModel):
    """Monitor run schema."""

    end_time: str
    start_time: str
    filter: t.Optional[DataFilterList] = None
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = None

    def start_time_dt(self) -> pdl.DateTime:
        """Get start time as datetime object."""
        return pdl.parse(self.start_time)

    def end_time_dt(self) -> pdl.DateTime:
        """Get end time as datetime object."""
        return pdl.parse(self.end_time)


class FilterWindowOptions(MonitorOptions):
    """Window with filter run schema."""

    model_version_ids: t.Optional[t.Union[t.List[int], None]] = None


def _get_properties_by_type(property_type: PropertiesInputType, vision_features):
    props = []
    for feat in vision_features:
        prop_type, prop_name = feat.split(" ", 1)
        if prop_type == property_type.value:
            props.append({"name": prop_name})
    return props


def _metric_name_pretify(metric_name: str) -> str:
    return str.title(metric_name.replace("_", " "))


def _metric_api_listify(metric_names: t.List[str], ignore_binary: bool = True):
    """Convert metric names to be check/info api compatible."""
    metric_list = []
    for metric_name in metric_names:
        # the metric_name split is a workaround for vision metrics as the default metric dict contains binary scorers
        if not ignore_binary or len(metric_name.split("_")) != 1:
            metric_list.append({"name": _metric_name_pretify(metric_name),
                                "is_agg": "per_class" not in metric_name})
    return metric_list


def get_metric_class_info(latest_version: ModelVersion, model: Model) -> MonitorCheckConf:
    """Get check info for checks that are instance of ReduceMetricClassMixin."""
    classes = None if latest_version is None else latest_version.statistics.get(SAMPLE_LABEL_COL, {}).get("values")
    if classes is not None:
        classes = [{"name": class_name} for class_name in classes]
    # get the scorers by task type
    if model.task_type in [TaskType.VISION_CLASSIFICATION, TaskType.MULTICLASS]:
        scorers = _metric_api_listify(multiclass_scorers_dict, ignore_binary=False)
        # vision classification tasks support the tabular metrics too
        if model.task_type == TaskType.VISION_CLASSIFICATION:
            scorers += _metric_api_listify(classification_dict.keys())
    elif model.task_type == TaskType.REGRESSION:
        scorers = [{"name": _metric_name_pretify(scorer_name), "is_agg": True}
                   for scorer_name in regression_scorers_higher_is_better_dict.values()]
    elif model.task_type == TaskType.BINARY:
        scorers = [{"name": scorer_name, "is_agg": True} for scorer_name in binary_scorers_dict]
    elif model.task_type == TaskType.VISION_DETECTION:
        scorers = _metric_api_listify(detection_dict.keys())
    return {"check_conf": [{"type": CheckParameterTypeEnum.SCORER.value, "values": scorers}],
            "res_conf": {"type": CheckParameterTypeEnum.CLASS.value, "values": classes, "is_agg_shown": False}}


def get_feature_property_info(latest_version: ModelVersion, check: Check, dp_check: BaseCheck) -> MonitorCheckConf:
    """Get check info for checks that are instance of ReduceFeatureMixin or ReducePropertyMixin."""
    feat_names = [] if latest_version is None else latest_version.get_top_features()[0]
    aggs_names = ["mean", "max", "none"]
    # FeatureMixin has additional aggregation options
    if isinstance(dp_check, ReduceFeatureMixin):
        aggs_names += ["weighted", "l2_weighted"]
    aggs = [{"name": agg_name, "is_agg": agg_name != "none"} for agg_name in aggs_names]
    check_parameter_conf = {"check_conf": [{"type": CheckParameterTypeEnum.AGGREGATION_METHOD.value,
                                            "values": aggs}], "res_conf": None}
    if isinstance(dp_check, ReduceFeatureMixin):
        feature_values = [{"name": feat_name} for feat_name in feat_names]
        check_parameter_conf["check_conf"].append({"type": CheckParameterTypeEnum.FEATURE.value,
                                                   "values": feature_values, "is_agg_shown": False})
    if isinstance(dp_check, ReducePropertyMixin):
        # all those checks are of type property but use different property type (maybe we should refactor in deepchecks)
        if "Image" in check.config["class_name"]:
            property_type = PropertiesInputType.IMAGES
            property_type_name = CheckParameterTypeEnum.IMAGE_PROPERTY.value
        elif "Label" in check.config["class_name"]:
            property_type = PropertiesInputType.LABELS
            property_type_name = CheckParameterTypeEnum.LABEL_PROPERTY.value
        elif "Prediction" in check.config["class_name"]:
            property_type = PropertiesInputType.PREDICTIONS
            property_type_name = CheckParameterTypeEnum.PREDICTION_PROPERTY.value
        check_parameter_conf["check_conf"] \
            .append({"type": property_type_name,
                     "values": _get_properties_by_type(property_type, feat_names), "is_agg_shown": False})
    return check_parameter_conf


async def run_rules_of_monitor(
        monitor_id: int,
        alert_check_options: AlertCheckOptions,
        session: AsyncSession = AsyncSessionDep

):
    """Run a check in the time window for each alert and create event accordingly.

    Parameters
    ----------
    monitor_id : int
        ID of the check.
    alert_check_options : AlertCheckOptions
        The alert check options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    t.Dict
        {<alert_rule_id>: {<alert_id>: {<version_id>: [<failed_values>]}}}.
    """
    # get the relevant objects from the db
    monitor_query = await session.execute(select(Monitor).where(Monitor.id == monitor_id)
                                          .options(joinedload(Monitor.alert_rules), joinedload(Monitor.check)))
    monitor: Monitor = monitor_query.scalars().first()

    if len(monitor.alert_rules) == 0:
        raise ValueError("No alert rules related to the monitor were found")

    end_time = pdl.parse(alert_check_options.end_time)

    all_alerts_dict = {}
    for alert_rule in monitor.alert_rules:
        start_time = end_time - pdl.duration(seconds=monitor.lookback)
        # make sure this alert is in the correct window for the alert rule
        if alert_rule.last_run is not None and \
                (alert_rule.last_run - end_time).total_seconds() % alert_rule.repeat_every != 0:
            continue

        if alert_rule.last_run is None or alert_rule.last_run < end_time:
            await AlertRule.update(session, alert_rule.id, {"last_run": end_time})

        # get relevant model_versions for that time window
        model, model_versions = await get_model_versions_for_time_range(session, monitor.check, start_time, end_time)

        # get the alert for this window (if exists)
        alert_results = await session.execute(select(Alert)
                                              .where(Alert.alert_rule_id == alert_rule.id)
                                              .where(Alert.start_time == start_time)
                                              .where(Alert.end_time == end_time))
        alert: Alert = alert_results.scalars().first()

        if alert is None:
            alert_dict = {}
        else:
            alert_dict = alert.failed_values

        alert_condition_func = make_oparator_func(alert_rule.condition.operator)
        alert_condition_val = alert_rule.condition.value

        # filter model versions that didn't send newer data (if in the grace period)
        # filter model versions that already have data in the event
        relevant_model_versions = [
            version for version in model_versions if
            (not alert_check_options.grace_period or version.end_time >= end_time) and version.id not in alert_dict
        ]

        # run check for the relevant window and data filter
        check_alert_check_options = MonitorOptions(start_time=start_time.isoformat(),
                                                   end_time=end_time.isoformat(),
                                                   data_filter=monitor.data_filters,
                                                   additional_kwargs=monitor.additional_kwargs)
        check_results = await run_check_window(monitor.check, check_alert_check_options, session, model=model,
                                               model_versions=relevant_model_versions)

        # test if any results raise an alert
        for model_version_id, results in check_results.items():
            if results is None:
                alert_dict[str(model_version_id)] = []
            failed_vals = []
            for val_name, value in results.items():
                if alert_condition_func(value, alert_condition_val):
                    failed_vals.append(val_name)
            alert_dict[str(model_version_id)] = failed_vals

        if len(alert_dict) > 0:
            if alert is not None:
                if alert_dict != alert.failed_values:
                    await Alert.update(session, alert.id, {"failed_values": alert_dict})
            else:
                alert = Alert(alert_rule_id=alert_rule.id, start_time=start_time, end_time=end_time,
                              failed_values=alert_dict)
                session.add(alert)
                await session.flush()

            all_alerts_dict[alert_rule.id] = {"failed_values": alert_dict, "alert_id": alert.id}
    return all_alerts_dict


async def run_check_per_window_in_range(
        check_id: int,
        start_time: pdl.DateTime,
        end_time: pdl.DateTime,
        window: pdl.Duration,
        monitor_filter: t.Optional[DataFilterList],
        session: AsyncSession,
        additional_kwargs: t.Optional[MonitorCheckConfSchema],
) -> t.Dict[str, t.Any]:
    """Run a check on a monitor table per time window in the time range.

    The function gets the relevant model versions and the task type of the check.
    Then, it creates a session per model version and per time window.
    The sessions are executed and the results are returned.
    The results are then used to run the check.
    The function returns the results of the check and the time windows that were used.

    Parameters
    ----------
    check_id : int
        The id of the check to run.
    start_time : pdl.DateTime
        The start time of the check.
    end_time : pdl.DateTime
        The end time of the check.
    window : pdl.DateTime
        The time window to run the check on.
    monitor_filter : t.Optional[DataFilterList]
        The data filter to apply on the monitor table.
    session : AsyncSession
        The database session to use.

    Returns
    -------
    dict
        A dictionary containing the output of the check and the time labels.
    """
    # get the relevant objects from the db
    check: Check = await fetch_or_404(session, Check, id=check_id)
    check_conf = check.config
    dp_check = BaseCheck.from_config(check_conf)

    if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
        raise ValueError("incompatible check type")

    model, model_versions = await get_model_versions_for_time_range(session, check, start_time, end_time)

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = model_versions[0].get_top_features()

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]] = []
    for model_version in model_versions:
        if isinstance(dp_check, TrainTestBaseCheck):
            reference_table = model_version.get_reference_table(session)
            reference_query = create_model_version_select_object(model_version, reference_table, top_feat)
            if monitor_filter:
                reference_query = filter_table_selection_by_data_filters(reference_table,
                                                                         reference_query,
                                                                         monitor_filter)
            reference_query = session.execute(random_sample(reference_query, reference_table))
        else:
            reference_query = None

        test_table = model_version.get_monitor_table(session)
        test_queries = []

        select_obj = create_model_version_select_object(model_version, test_table, top_feat)
        new_start_time = start_time
        # create the session per time window
        while new_start_time < end_time:
            filtered_select_obj = filter_monitor_table_by_window_and_data_filters(model_version=model_version,
                                                                                  table_selection=select_obj,
                                                                                  mon_table=test_table,
                                                                                  data_filter=monitor_filter,
                                                                                  start_time=new_start_time,
                                                                                  end_time=new_start_time + window)
            if filtered_select_obj is not None:
                test_queries.append(session.execute(filtered_select_obj))
            else:
                test_queries.append(None)
            new_start_time = new_start_time + window
        model_versions_sessions.append((reference_query, test_queries))

    # Complete queries and then commit the connection, to release back to the pool (since the check might take long time
    # to run, and we don't want to unnecessarily hold the connection)
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
    await session.commit()

    # get result from active sessions and run the check per each model version
    model_reduces = await get_results_for_model_versions_per_window(model_version_dataframes,
                                                                    model_versions,
                                                                    model,
                                                                    dp_check,
                                                                    additional_kwargs)

    # get the time windows that were used
    time_windows = []
    while start_time < end_time:
        time_windows.append(start_time.isoformat())
        start_time = start_time + window

    return {"output": model_reduces, "time_labels": time_windows}


async def run_check_window(
        check: Check,
        monitor_options: MonitorOptions,
        session: AsyncSession,
        model,
        model_versions
):
    """Run a check for each time window by lookback.

    Parameters
    ----------
    check : Check
    monitor_options : MonitorOptions
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.
    model
    model_versions
    """
    # get the relevant objects from the db
    dp_check = check.initialize_check()

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = model_versions[0].get_top_features()

    load_reference = isinstance(dp_check, TrainTestBaseCheck)

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]] = []
    for model_version in model_versions:
        test_session, ref_session = load_data_for_check(model_version, session, top_feat, monitor_options,
                                                        with_reference=load_reference)

        model_versions_sessions.append((ref_session, [test_session]))

    # Complete queries and then commit the connection, to release back to the pool (since the check might take long time
    # to run, and we don't want to unnecessarily hold the connection)
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
    await session.commit()

    # get result from active sessions and run the check per each model version
    model_reduces_per_window = await get_results_for_model_versions_per_window(model_version_dataframes,
                                                                               model_versions,
                                                                               model,
                                                                               dp_check,
                                                                               monitor_options.additional_kwargs)
    # the original function is more general and runs it per window, we have only 1 window here
    model_reduces = {}
    for model_id, reduces_per_window in model_reduces_per_window.items():
        model_reduces[model_id] = None if reduces_per_window is None else reduces_per_window[0]
    return model_reduces


def load_data_for_check(
        model_version: ModelVersion,
        session: AsyncSession,
        features: t.List[str],
        options: MonitorOptions,
        with_reference=True
) -> t.Tuple[t.Coroutine, t.Optional[t.Coroutine]]:
    """Return sessions of the data load for the given model version.

    Parameters
    ----------
    model_version
    session
    features
    options
    with_reference: bool
        Whether to load reference

    Returns
    -------
    Tuple[Coroutine, t.Optional[Coroutine]]
        First routine is test session, Second routine is reference session
    """
    if with_reference:
        reference_table = model_version.get_reference_table(session)
        reference_query = create_model_version_select_object(model_version, reference_table, features)
        if options.filter:
            reference_query = filter_table_selection_by_data_filters(reference_table,
                                                                     reference_query,
                                                                     options.filter)
        reference_query = session.execute(random_sample(reference_query, reference_table))
    else:
        reference_query = None

    test_table = model_version.get_monitor_table(session)
    select_obj = create_model_version_select_object(model_version, test_table, features)
    # create the session
    filtered_select_obj = filter_monitor_table_by_window_and_data_filters(
        model_version=model_version,
        table_selection=select_obj,
        mon_table=test_table,
        start_time=options.start_time_dt(),
        end_time=options.end_time_dt(),
        data_filter=options.filter
    )
    if filtered_select_obj is not None:
        test_query = session.execute(filtered_select_obj)
    else:
        test_query = None

    return test_query, reference_query


async def complete_sessions_for_check(model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Coroutine]]]):
    """Complete all the async queries and transforms them into dataframes."""
    model_version_dataframes = []
    for (reference_query, test_queries) in model_versions_sessions:
        test_data_dataframes: t.List[pd.DataFrame] = []
        for test_query in test_queries:
            if test_query is None:
                test_data_dataframes.append(pd.DataFrame())
            else:
                test_query = await test_query
                test_data_dataframes.append(pd.DataFrame.from_dict(test_query.all()))
        if reference_query is not None:
            reference_query = await reference_query
            reference_table_data_dataframe = pd.DataFrame.from_dict(reference_query.all())
        else:
            reference_table_data_dataframe = None

        model_version_dataframes.append((reference_table_data_dataframe, test_data_dataframes))
    return model_version_dataframes
