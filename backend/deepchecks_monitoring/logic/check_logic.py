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
from collections import defaultdict
from copy import deepcopy
from numbers import Number

import pandas as pd
import pendulum as pdl
from deepchecks import BaseCheck, CheckResult, SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.core.reduce_classes import ReduceFeatureMixin
from deepchecks.tabular import Suite
from deepchecks.tabular.metric_utils.scorers import (binary_scorers_dict, multiclass_scorers_dict,
                                                     regression_scorers_higher_is_better_dict,
                                                     regression_scorers_lower_is_better_dict)
from deepchecks.utils.dataframes import un_numpy
from pydantic import BaseModel, Field, root_validator, validator
from sqlalchemy import Column, Table, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.exceptions import BadRequest, NotFound
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.model_logic import (create_model_version_select_object,
                                                     get_model_versions_for_time_range,
                                                     get_results_for_model_versions_for_reference,
                                                     get_results_for_model_versions_per_window,
                                                     get_top_features_or_from_conf, random_sample)
from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
from deepchecks_monitoring.monitoring_utils import (CheckParameterTypeEnum, DataFilterList, MonitorCheckConf,
                                                    MonitorCheckConfSchema, TimeUnit, fetch_or_404, make_oparator_func)
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.check import Check
from deepchecks_monitoring.schema_models.column_type import SAMPLE_LABEL_COL, SAMPLE_PRED_COL, SAMPLE_TS_COL
from deepchecks_monitoring.schema_models.model import Model, TaskType


class AlertCheckOptions(BaseModel):
    """Alert check schema."""

    end_time: str
    grace_period: t.Optional[bool] = True


class TableFiltersSchema(BaseModel):
    """Basic table filter schema containing functions for filtering."""

    filter: t.Optional[DataFilterList] = None

    def add_filters(self, added_filters: DataFilterList):
        """Return a copy of this options with the added given filters."""
        copied = deepcopy(self)
        if copied.filter is None:
            copied.filter = added_filters
        else:
            copied.filter = DataFilterList(filters=added_filters.filters + copied.filter.filters)
        return copied

    def sql_columns_filter(self):
        """Create sql filter clause on data columns from the defined filter."""
        if self.filter:
            # The True prevents error if filters is empty list
            return and_(True, *[
                make_oparator_func(data_filter.operator)(Column(data_filter.column), data_filter.value)
                for data_filter in self.filter.filters
            ])
        return True

    def sql_all_filters(self):
        """Create sql filter clause on data columns (used for overloading)."""
        return self.sql_columns_filter()


class CheckRunOptions(TableFiltersSchema):
    """Basic schema for running a check."""

    additional_kwargs: t.Optional[MonitorCheckConfSchema] = None


class TimeWindowOption(TableFiltersSchema):
    """Adds to the table schema start and end times."""

    end_time: str
    start_time: str

    def start_time_dt(self) -> pdl.DateTime:
        """Get start time as datetime object."""
        return pdl.parse(self.start_time)

    def end_time_dt(self) -> pdl.DateTime:
        """Get end time as datetime object."""
        return pdl.parse(self.end_time)

    def sql_time_filter(self):
        """Create sql filter clause on the timestamp from the defined start and end times."""
        return _times_to_sql_where(self.start_time_dt(), self.end_time_dt())

    def sql_all_filters(self):
        """Create sql filter clause on both timestamp and data columns."""
        return and_(self.sql_time_filter(), self.sql_columns_filter())

    @root_validator
    def check_dates_range(cls, values):  # pylint: disable=no-self-argument
        """Check end_time is after start_time by an hour plus."""
        seconds_range = (pdl.parse(values["end_time"]) - pdl.parse(values["start_time"])).in_seconds()
        if seconds_range < 0:
            raise ValueError("end_time must be after start_time")
        if seconds_range < TimeUnit.HOUR:
            raise ValueError("end_time must be at least an hour after start_time")
        return values


class SingleCheckRunOptions(CheckRunOptions, TimeWindowOption):
    """Options for running check on a specific window."""


class TableDataSchema(TableFiltersSchema):
    """Class for selecting a specific amount of rows on a table data."""

    rows_count: int = Field(default=100, le=100_000)


class WindowDataSchema(TableDataSchema, TimeWindowOption):
    """Schema for getting rows in a specific window."""


class MonitorOptions(SingleCheckRunOptions):
    """Add to single window monitor options frequency and aggregation window to make it multi window."""

    frequency: t.Optional[int] = None
    aggregation_window: t.Optional[int] = None

    @validator("frequency")
    def check_frequency_min(cls, v):  # pylint: disable=no-self-argument
        """Check frequency is at least an hour."""
        if v and v < TimeUnit.HOUR:
            raise ValueError(f"frequency must be at least {TimeUnit.HOUR}")
        return v

    @validator("aggregation_window")
    def check_aggregation_window(cls, v):  # pylint: disable=no-self-argument
        """Check aggergation_windwow is at least an hour."""
        if v and v < TimeUnit.HOUR:
            raise ValueError(f"aggregation_window must be at least {TimeUnit.HOUR}")
        return v

    @root_validator()
    def set_missing_frequency(cls, values: dict) -> dict:  # pylint: disable=no-self-argument
        """Set missing frequency based on start and end times."""
        if values.get("frequency") is None:
            start_time = pdl.parse(values["start_time"])
            end_time = pdl.parse(values["end_time"])
            values["frequency"] = (end_time - start_time).in_seconds() // 12

        return values

    def calculate_windows(self):
        lookback = self.end_time_dt().int_timestamp - self.start_time_dt().int_timestamp
        last_window_end = floor_window_for_time(self.end_time_dt(), self.frequency)
        num_windows_in_range = max(lookback // self.frequency, 1)
        first_window_end = last_window_end.subtract(seconds=(num_windows_in_range - 1) * self.frequency)
        # the last window might be partial so we need to create it manually
        if last_window_end <= self.end_time_dt():
            last_window_end = last_window_end.add(seconds=self.frequency)
        return list((last_window_end - first_window_end).range("seconds", self.frequency))


class SpecificVersionCheckRun(SingleCheckRunOptions):
    """Schema to run check using a specific version."""

    model_version_id: t.Optional[int] = None


class CheckNotebookSchema(SpecificVersionCheckRun):
    """Schema to get a check script/notebook."""

    as_script: t.Optional[bool] = False


class FilterWindowOptions(MonitorOptions):
    """Window with filter run schema."""

    model_version_ids: t.Optional[t.Union[t.List[int], None]] = None


def set_kwarg_filter(check_conf, model_config: MonitorCheckConfSchema):
    """Filter the check_conf dictionary to only include the parameters that are relevant to the check type.

    Parameters
    ----------
    check_conf : dict
        The dictionary containing the check configuration.
    model_config : MonitorCheckConfSchema
        The model configuration.

    """
    for kwarg_type, kwarg_val in model_config.check_conf.items():
        kwarg_type = CheckParameterTypeEnum(kwarg_type)
        kwarg_name = kwarg_type.to_kwarg_name()
        if kwarg_type == CheckParameterTypeEnum.AGGREGATION_METHOD:
            kwarg_val = kwarg_val[0]
        if kwarg_type != CheckParameterTypeEnum.PROPERTY:
            check_conf["params"][kwarg_name] = kwarg_val


def init_check_by_kwargs(check: t.Union[Check, BaseCheck], additional_kwargs: MonitorCheckConfSchema) -> BaseCheck:
    """Initialize a check with additional kwargs.

    Parameters
    ----------
    check : Union[Check, BaseCheck]
        The check to initialize.
    additional_kwargs : MonitorCheckConfSchema
        Additional kwargs to pass to the check.

    Returns
    -------
    dp_check : BaseCheck
        The initialized check.
    """
    if isinstance(check, Check):
        check = check.initialize_check()
    if additional_kwargs is not None:
        check_conf = check.config()
        set_kwarg_filter(check_conf, additional_kwargs)
        # Manually set deepchecks to not do sampling on the data inside the checks
        check_conf["params"]["n_samples"] = None
        return BaseCheck.from_config(check_conf)
    return check


def _metric_name_pretify(metric_name: str) -> str:
    return str.title(metric_name.replace("_", " "))


def _metric_api_listify(metric_names: t.List[str], ignore_binary: bool = True):
    """Convert metric names to be check/info api compatible."""
    metric_list = []
    for metric_name in metric_names:
        # the metric_name split is a workaround for metrics as the default metric dict contains binary scorers
        if not ignore_binary or len(metric_name.split("_")) != 1:
            metric_list.append({"name": _metric_name_pretify(metric_name),
                                "is_agg": "per_class" not in metric_name})
    return metric_list


def _times_to_sql_where(start_time, end_time):
    ts_column = Column(SAMPLE_TS_COL)
    return and_(start_time <= ts_column, ts_column < end_time)


def _get_observed_classes(model_version: ModelVersion) -> t.List[t.Union[int, str]]:
    label_classes = model_version.statistics.get(SAMPLE_LABEL_COL, {}).get("values", [])
    pred_classes = model_version.statistics.get(SAMPLE_PRED_COL, {}).get("values", [])
    all_classes = sorted(set(label_classes + pred_classes))
    if not model_version.label_map:
        return all_classes
    return [model_version.label_map.get(str(clazz), str(clazz)) for clazz in all_classes]


def get_metric_class_info(latest_version: ModelVersion, model: Model) -> MonitorCheckConf:
    """Get check info for checks that are instance of ReduceMetricClassMixin."""
    classes = None if latest_version is None else _get_observed_classes(latest_version)
    if classes is not None:
        classes = [{"name": class_name} for class_name in classes]
    # get the scorers by task type
    if model.task_type == TaskType.MULTICLASS:
        scorers = _metric_api_listify(multiclass_scorers_dict, ignore_binary=False)
    elif model.task_type == TaskType.REGRESSION:
        reg_scorers = sorted(list(regression_scorers_higher_is_better_dict.keys()) +
                             list(regression_scorers_lower_is_better_dict.keys()))
        scorers = [{"name": _metric_name_pretify(scorer_name), "is_agg": True} for scorer_name in reg_scorers]
    elif model.task_type == TaskType.BINARY:
        scorers = [{"name": _metric_name_pretify(scorer_name), "is_agg": True} for scorer_name in binary_scorers_dict]

    return {"check_conf": [{"type": CheckParameterTypeEnum.SCORER.value, "values": scorers}],
            "res_conf": {"type": CheckParameterTypeEnum.CLASS.value, "values": classes, "is_agg_shown": False}}


def get_feature_property_info(latest_version: ModelVersion, dp_check: BaseCheck) -> MonitorCheckConf:
    """Get check info for checks that are instance of ReduceFeatureMixin or ReducePropertyMixin."""
    feat_names = [] if latest_version is None else list(latest_version.get_top_features(1000)[0])
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
    return check_parameter_conf


async def run_check_per_window_in_range(
        check_id: int,
        session: AsyncSession,
        monitor_options: MonitorOptions,
        monitor_id: int = None,
        cache_funcs: CacheFunctions = None,
        organization_id: int = None
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
    session : AsyncSession
        The database session to use.
    monitor_options: MonitorOptions
    monitor_id
    cache_funcs
    organization_id

    Returns
    -------
    dict
        A dictionary containing the output of the check and the time labels.
    """
    # get the relevant objects from the db
    check: Check = await fetch_or_404(session, Check, id=check_id)
    dp_check = init_check_by_kwargs(check, monitor_options.additional_kwargs)

    if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
        raise ValueError("incompatible check type")

    all_windows = monitor_options.calculate_windows()[-30:]
    aggregation_window = monitor_options.aggregation_window or monitor_options.frequency

    model, model_versions = await get_model_versions_for_time_range(
        session, check.model_id, all_windows[0].subtract(seconds=aggregation_window), all_windows[-1])

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)
    model_columns = list(model_versions[0].model_columns.keys())

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Dict]]] = []
    for model_version in model_versions:
        # If filter does not fit the model version, skip it
        if not model_version.is_filter_fit(monitor_options.filter):
            continue

        test_table = model_version.get_monitor_table(session)
        select_obj = create_model_version_select_object(test_table, top_feat + model_columns, check.is_label_required)
        test_info: t.List[t.Dict] = []
        # create the session per time window
        for window_end in all_windows:
            window_start = window_end.subtract(seconds=aggregation_window)
            curr_test_info = {"start": window_start, "end": window_end}
            test_info.append(curr_test_info)
            if monitor_id and cache_funcs:
                cache_result = cache_funcs.get_monitor_cache(
                    organization_id, model_version.id, monitor_id, window_start, window_end)
                # If found the result in cache, skip querying
                if cache_result.found:
                    curr_test_info["result"] = cache_result.value
                    continue
            if model_version.is_in_range(window_start, window_end):
                filtered_select_obj = select_obj.filter(_times_to_sql_where(window_start, window_end))
                filtered_select_obj = filtered_select_obj.filter(monitor_options.sql_columns_filter())
                filtered_select_obj = random_sample(filtered_select_obj, test_table, n_samples=10_000)
                curr_test_info["query"] = session.execute(filtered_select_obj)
            else:
                curr_test_info["data"] = pd.DataFrame()
        # Query reference if the check use it, and there are results not from cache
        if isinstance(dp_check, TrainTestBaseCheck) and any(("query" in x for x in test_info)):
            reference_table = model_version.get_reference_table(session)
            reference_query = create_model_version_select_object(reference_table, top_feat + model_columns,
                                                                 check.is_label_required)
            reference_query = reference_query.filter(monitor_options.sql_columns_filter())
            reference_query = session.execute(random_sample(reference_query, reference_table))
        else:
            reference_query = None

        model_versions_sessions.append((reference_query, test_info))

    # Complete queries and then commit the connection, to release back to the pool (since the check might take long time
    # to run, and we don't want to unnecessarily hold the connection)
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
    await session.commit()

    # get result from active sessions and run the check per each model version
    check_results = get_results_for_model_versions_per_window(model_version_dataframes,
                                                              model_versions,
                                                              model,
                                                              dp_check,
                                                              monitor_options.additional_kwargs)

    # Reduce the check results
    reduce_results = defaultdict(list)
    for model_version, results in check_results.items():
        for result_dict in results:
            result_value = result_dict["result"]
            # If already from cache no need to reduce the result. If not, reduce and save to cache
            if result_dict["from_cache"] is False:
                if result_value is not None:
                    result_value = reduce_check_result(result_value, monitor_options.additional_kwargs)
                # If cache available and there is monitor id, save result to cache
                if cache_funcs and monitor_id:
                    cache_funcs.set_monitor_cache(organization_id, model_version.id, monitor_id, result_dict["start"],
                                                  result_dict["end"], result_value)
            reduce_results[model_version.name].append(result_value)

    # The windows are until the end time exclusive, we want the UI to show the end time as inclusive, therefore
    # reducing the end time by 1 microsecond
    return {"output": reduce_results, "time_labels": [d.subtract(microseconds=1).isoformat() for d in all_windows]}


async def run_suite_per_window_in_range(
        check_ids: t.List[int],
        session: AsyncSession,
        monitor_options: MonitorOptions,
) -> t.Union[t.Dict[int, t.Dict], t.Dict]:
    """Run a suite on a monitor table per time window in the time range.

    The function gets the relevant model versions and the task type of the check.
    Then, it creates a session per model version and per time window.
    The sessions are executed and the results are returned.
    The results are then used to run the suite.
    The function returns the results of each check and the time windows that were used.

    Parameters
    ----------
    check_ids: t.Union[int, t.List[int]]
        The id of the check to run.
    session : AsyncSession
        The database session to use.
    monitor_options: MonitorOptions

    Returns
    -------
    dict
        A dictionary containing the output of the check and the time labels.
    """
    if len(check_ids) == 0:
        return {}

    # get the relevant objects from the db
    checks: t.List[Check] = (await session.scalars(select(Check).where(Check.id.in_(set(check_ids))))).all()
    if len(checks) == 0:
        raise NotFound(f"Could not find checks with ids {check_ids}")
    if len(set(check.model_id for check in checks)) > 1:
        raise ValueError(f"Checks {check_ids} belong to different models")
    model_id = checks[0].model_id

    dp_checks = {}
    uses_reference_data = False
    for check in checks:
        dp_check = init_check_by_kwargs(check, monitor_options.additional_kwargs)
        if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
            raise ValueError(f"incompatible check type {type(dp_check)}")
        uses_reference_data |= isinstance(dp_check, TrainTestBaseCheck)
        # Saves a mapping between the deepchecks' check object and check id
        dp_checks[dp_check] = check.id
    suite = Suite("", *dp_checks.keys())

    all_windows = monitor_options.calculate_windows()[-30:]
    aggregation_window = monitor_options.aggregation_window or monitor_options.frequency

    model, model_versions = await get_model_versions_for_time_range(
        session, model_id, all_windows[0].subtract(seconds=aggregation_window), all_windows[-1])

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)
    model_columns = list(model_versions[0].model_columns.keys())

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Dict]]] = []
    for model_version in model_versions:
        # If filter does not fit the model version, skip it
        if not model_version.is_filter_fit(monitor_options.filter):
            continue

        test_table = model_version.get_monitor_table(session)
        select_obj = create_model_version_select_object(test_table, top_feat + model_columns, False)
        select_obj = select_obj.filter(monitor_options.sql_columns_filter())
        test_info: t.List[t.Dict] = []
        # create the session per time window
        for window_end in all_windows:
            window_start = window_end.subtract(seconds=aggregation_window)
            curr_test_info = {"start": window_start, "end": window_end}
            test_info.append(curr_test_info)
            if model_version.is_in_range(window_start, window_end):
                filtered_select_obj = select_obj.filter(_times_to_sql_where(window_start, window_end))
                filtered_select_obj = random_sample(filtered_select_obj, test_table, n_samples=10_000)
                curr_test_info["query"] = session.execute(filtered_select_obj)
            else:
                curr_test_info["data"] = pd.DataFrame()
        # Query reference if the check use it
        if uses_reference_data:
            reference_table = model_version.get_reference_table(session)
            reference_query = create_model_version_select_object(reference_table, top_feat + model_columns, False)
            reference_query = reference_query.filter(monitor_options.sql_columns_filter())
            reference_query = session.execute(random_sample(reference_query, reference_table))
        else:
            reference_query = None

        model_versions_sessions.append((reference_query, test_info))

    # Complete queries and then commit the connection, to release back to the pool (since the check might take long time
    # to run, and we don't want to unnecessarily hold the connection)
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
    await session.commit()

    # run the checks
    # get result from active sessions and run the check per each model version
    windows_results = get_results_for_model_versions_per_window(model_version_dataframes,
                                                                model_versions,
                                                                model,
                                                                suite,
                                                                monitor_options.additional_kwargs)

    all_checks_results = {}
    for check in checks:
        all_checks_results[check.id] = {"output": defaultdict(list),
                                        "time_labels": [d.isoformat() for d in all_windows]}

    for model_version, model_version_results in windows_results.items():
        for window_result in model_version_results:
            suite_result = window_result["result"]
            # If there was no production data for the window we will have no result
            if suite_result is not None:
                for check_result in suite_result.results:
                    if isinstance(check_result, CheckResult):
                        result_value = reduce_check_result(check_result, monitor_options.additional_kwargs)
                    else:
                        result_value = None
                    check_id = dp_checks[check_result.check]
                    all_checks_results[check_id]["output"][model_version.name].append(result_value)
            else:
                for check in checks:
                    all_checks_results[check.id]["output"][model_version.name].append(None)

    return all_checks_results


async def run_check_window(
        check: Check,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession,
        model: Model,
        model_versions: t.List[ModelVersion],
        reference_only: bool = False,
        n_samples: int = 10_000,
        with_display: bool = False,
) -> t.Dict[ModelVersion, t.Optional[t.Dict]]:
    """Run a check for each time window by lookback or for reference only.

    Parameters
    ----------
    check : Check
        The check to run.
    monitor_options : SingleCheckRunOptions
        The monitor options to use.
    session : AsyncSession
        The database session to use.
    model : Model
        The model to run the check on.
    model_versions : List[ModelVersion]
        The model versions to run the check on.
    reference_only : bool, optional
        Whether to run the check on reference data only.
    n_samples : int, optional
        The number of samples to use.
    with_display : bool, optional
        Whether to run the check with display or not.

    Returns
    -------
    model_reduces : Dict[str, Any]
        The results of the check.
    """
    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    # get the relevant objects from the db
    dp_check = init_check_by_kwargs(check, monitor_options.additional_kwargs)

    top_feat, _ = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)

    is_train_test_check = isinstance(dp_check, TrainTestBaseCheck)
    if reference_only and is_train_test_check:
        raise BadRequest("Running a check on reference data only relevant "
                         f"for single dataset checks, received {type(dp_check)}")

    # execute an async session per each model version
    model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Dict]]] = []
    for model_version in model_versions:
        test_session, ref_session = load_data_for_check(model_version, session, top_feat, monitor_options,
                                                        with_reference=is_train_test_check or reference_only,
                                                        with_test=not reference_only,
                                                        n_samples=n_samples,
                                                        filter_labels_exist=check.is_label_required)
        if test_session is None:
            info = {}
        else:
            info = {"start": monitor_options.start_time_dt(),
                    "end": monitor_options.end_time_dt(),
                    "query": test_session}

        model_versions_sessions.append((ref_session, [info]))

    # Complete queries
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)

    # get result from active sessions and run the check per each model version
    if not reference_only:
        model_results_per_window = get_results_for_model_versions_per_window(
            model_version_dataframes,
            model_versions,
            model,
            dp_check,
            monitor_options.additional_kwargs,
            with_display
        )
    else:
        model_results_per_window = get_results_for_model_versions_for_reference(
            model_version_dataframes,
            model_versions,
            model,
            dp_check,
            monitor_options.additional_kwargs,
        )

    model_results = {}
    for model_version, results_per_window in model_results_per_window.items():
        # the original function is more general and runs it per window, we have only 1 window here
        model_results[model_version] = results_per_window[0]

    return model_results


def create_execution_data_query(
        data_table: Table,
        session: AsyncSession,
        options: TableFiltersSchema,
        columns: t.List[str] = None,
        n_samples: int = 10_000,
        all_columns: bool = False,
        filter_labels_exist: bool = False,
) -> t.Tuple[t.Optional[t.Coroutine], t.Optional[t.Coroutine]]:
    """Return sessions of the data load for the given model version.

    Parameters
    ----------
    data_table: Table
    session
    columns
    options
    n_samples: int, default: 10,000
        The number of samples to collect
    all_columns: bool, default False
        Whether to load all the columns instead of just the top features
    filter_labels_exist: bool, default False
        Whether to filter the data to only include rows with labels

    Returns
    -------
    Coroutine
        Routine is the data session.
    """
    if all_columns:
        data_query = select(data_table)
    else:
        data_query = create_model_version_select_object(data_table, columns, filter_labels_exist)
    data_query = data_query.filter(options.sql_all_filters()
                                   if SAMPLE_TS_COL in data_table.c else options.sql_columns_filter())
    return session.execute(random_sample(data_query, data_table, n_samples=n_samples))


def load_data_for_check(
        model_version: ModelVersion,
        session: AsyncSession,
        features: t.List[str],
        options: TimeWindowOption,
        with_reference: bool = True,
        with_test: bool = True,
        n_samples: int = 10_000,
        all_columns: bool = False,
        filter_labels_exist: bool = False,
) -> t.Tuple[t.Optional[t.Coroutine], t.Optional[t.Coroutine]]:
    """Return sessions of the data load for the given model version.

    Parameters
    ----------
    model_version
    session
    features
    options
    with_reference: bool
        Whether to load reference
    with_test: bool
        Whether to load test
    n_samples: int, default: 10,000
        The number of samples to collect
    all_columns: bool, default False
        Whether to load all the columns instead of just the top features
    filter_labels_exist: bool, default False
        Whether to filter out samples that don't have labels

    Returns
    -------
    Tuple[t.Optional[Coroutine], t.Optional[Coroutine]]
        First routine is test session, Second routine is reference session
    """
    if not model_version.is_filter_fit(options.filter):
        return None, None

    columns = features + list(model_version.model_columns.keys())

    if with_reference:
        reference_table = model_version.get_reference_table(session)
        reference_query = create_execution_data_query(reference_table,
                                                      session=session,
                                                      columns=columns,
                                                      options=options,
                                                      n_samples=n_samples,
                                                      all_columns=all_columns,
                                                      filter_labels_exist=filter_labels_exist)
    else:
        reference_query = None

    if with_test:
        if model_version.is_in_range(options.start_time_dt(), options.end_time_dt()):
            test_table = model_version.get_monitor_table(session)
            test_query = create_execution_data_query(test_table,
                                                     session=session,
                                                     columns=columns,
                                                     options=options,
                                                     n_samples=n_samples,
                                                     all_columns=all_columns,
                                                     filter_labels_exist=filter_labels_exist)
        else:
            test_query = None
    else:
        test_query = None

    return test_query, reference_query


async def complete_sessions_for_check(model_versions_sessions: t.List[t.Tuple[t.Coroutine, t.List[t.Dict]]]):
    """Complete all the async queries and transforms them into dataframes."""
    model_version_dataframes = []
    for (reference_query, test_infos) in model_versions_sessions:
        for curr_test_info in test_infos:
            if "query" in curr_test_info:
                # the test info query may be none if there was no data after the filtering
                if curr_test_info["query"] is not None:
                    test_query = await curr_test_info["query"]
                    curr_test_info["data"] = pd.DataFrame(test_query.all(),
                                                          columns=[str(key) for key in test_query.keys()])
                    del curr_test_info["query"]
                else:
                    curr_test_info["data"] = pd.DataFrame()
        if reference_query is not None:
            reference_query = (await reference_query)
            reference_table_data_dataframe = pd.DataFrame(reference_query.all(),
                                                          columns=[str(key) for key in reference_query.keys()])
        else:
            # We mark reference as "None" if it's not needed (a single dataset check)
            reference_table_data_dataframe = None

        model_version_dataframes.append((reference_table_data_dataframe, test_infos))
    return model_version_dataframes


def reduce_check_result(result: CheckResult, additional_kwargs) -> t.Optional[t.Dict[str, Number]]:
    """Reduce check result and apply filtering on the check results (after reduce)."""
    if result is None:
        return
    final_result = {}

    def set_key_value(key, value):
        # if the key is tuple we need to transform it to string
        key = " ".join(key) if isinstance(key, tuple) else key
        final_result[key] = un_numpy(value)

    # filter the keys if needed
    if additional_kwargs and additional_kwargs.res_conf:
        keys_to_keep = set(additional_kwargs.res_conf)
    else:
        keys_to_keep = None

    reduced_result = result.reduce_output()
    for key, value in reduced_result.items():
        if keys_to_keep:
            # If we have key as tuple we check for filter on the last value in the tuple, else regular
            if (isinstance(key, tuple) and key[-1] in keys_to_keep) or key in keys_to_keep:
                set_key_value(key, value)
        else:
            set_key_value(key, value)

    return final_result


def reduce_check_window(model_results, monitor_options):
    """Reduce all the model versions results got from a check run on single window."""
    return {
        model_version: reduce_check_result(it["result"], monitor_options.additional_kwargs)
        if it is not None else None
        for model_version, it in model_results.items()
    }
