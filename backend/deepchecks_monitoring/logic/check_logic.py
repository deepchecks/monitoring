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

import pendulum as pdl
from deepchecks import BaseCheck, CheckResult
from deepchecks.core.reduce_classes import ReduceFeatureMixin
from deepchecks.tabular.metric_utils.scorers import binary_scorers_dict, multiclass_scorers_dict
from deepchecks.utils.dataframes import un_numpy
from pydantic import BaseModel, Field, ValidationError, root_validator
from sqlalchemy import VARCHAR, Column, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.exceptions import BadRequest, NotFound
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.model_logic import (DEFAULT_N_SAMPLES, get_model_versions_for_time_range,
                                                     get_results_for_model_versions_for_reference,
                                                     get_results_for_model_versions_per_window,
                                                     get_top_features_or_from_conf)
from deepchecks_monitoring.monitoring_utils import (CheckParameterTypeEnum, DataFilter, DataFilterList,
                                                    MonitorCheckConf, MonitorCheckConfSchema, OperatorsEnum,
                                                    fetch_or_404, make_oparator_func)
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.check import Check
from deepchecks_monitoring.schema_models.column_type import (REFERENCE_SAMPLE_ID_COL, SAMPLE_ID_COL, SAMPLE_LABEL_COL,
                                                             SAMPLE_PRED_COL, SAMPLE_TS_COL)
from deepchecks_monitoring.schema_models.model import Model, TaskType
from deepchecks_monitoring.schema_models.monitor import Frequency, round_up_datetime
from deepchecks_monitoring.utils.typing import as_pendulum_datetime

if t.TYPE_CHECKING:
    # pylint: disable=unused-import
    import sqlalchemy as sa

MAX_FEATURES_TO_RETURN = 1000


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
        ts_column = Column(SAMPLE_TS_COL)
        return and_(self.start_time_dt() <= ts_column, ts_column < self.end_time_dt())

    @root_validator
    def check_dates_range(cls, values):  # pylint: disable=no-self-argument
        """Check end_time is after start_time by an hour plus."""
        seconds_range = (pdl.parse(values["end_time"]) - pdl.parse(values["start_time"])).in_seconds()
        if seconds_range < 0:
            raise ValidationError("end_time must be after start_time")
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

    frequency: t.Optional[Frequency] = None
    aggregation_window: t.Optional[int] = 1

    @root_validator()
    def set_missing_values(cls, values: dict) -> dict:  # pylint: disable=no-self-argument
        """Set missing frequency based on start and end times."""
        if values.get("frequency") is None:
            start_time = as_pendulum_datetime(pdl.parser.parse(values["start_time"]))
            end_time = as_pendulum_datetime(pdl.parser.parse(values["end_time"]))
            if (n := (end_time - start_time) // pdl.duration(days=1)) <= 3:
                values["frequency"] = Frequency.HOUR
            elif n <= 30:
                values["frequency"] = Frequency.DAY
            elif n <= 90:
                values["frequency"] = Frequency.WEEK
            else:
                values["frequency"] = Frequency.MONTH

        return values

    def calculate_windows(self, tz):
        frequency = self.frequency
        assert frequency is not None

        end_time = round_up_datetime(self.end_time_dt(), frequency, tz)
        start_time = round_up_datetime(self.start_time_dt(), frequency, tz)
        return list((end_time - start_time).range(frequency.to_pendulum_duration_unit()))


class SpecificVersionCheckRun(SingleCheckRunOptions):
    """Schema to run check using a specific version."""

    model_version_id: t.Optional[int] = None


class CheckNotebookSchema(SpecificVersionCheckRun):
    """Schema to get a check script/notebook."""

    as_script: t.Optional[bool] = False


# TODO: looks like it is not used anywhere, delete it
class FilterWindowOptions(MonitorOptions):
    """Window with filter run schema."""

    model_version_ids: t.Optional[t.Union[t.List[int], None]] = None


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


def _times_to_data_filter(start_time, end_time) -> DataFilterList:
    data_filters = [
        DataFilter(column=SAMPLE_TS_COL, operator=OperatorsEnum.GE, value=start_time),
        DataFilter(column=SAMPLE_TS_COL, operator=OperatorsEnum.LT, value=end_time)
    ]
    return DataFilterList(filters=data_filters)


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
        reg_scorers = ["RMSE", "MSE", "MAE", "R2"]
        scorers = [{"name": scorer_name, "is_agg": True} for scorer_name in reg_scorers]
    elif model.task_type == TaskType.BINARY:
        scorers = [{"name": _metric_name_pretify(scorer_name), "is_agg": True} for scorer_name in binary_scorers_dict]

    return {"check_conf": [{"type": CheckParameterTypeEnum.SCORER.value, "values": scorers}],
            "res_conf": {"type": CheckParameterTypeEnum.CLASS.value, "values": classes, "is_agg_shown": False}}


def get_feature_property_info(latest_version: ModelVersion, dp_check: BaseCheck) -> MonitorCheckConf:
    """Get check info for checks that are instance of ReduceFeatureMixin or ReducePropertyMixin."""
    feat_names = [] if latest_version is None else list(latest_version.get_top_features(MAX_FEATURES_TO_RETURN)[0])
    aggs_names = ["mean", "max"]
    # FeatureMixin has additional aggregation options
    if isinstance(dp_check, ReduceFeatureMixin):
        aggs_names += ["weighted", "l3_weighted", "l5_weighted"]
    aggs = [{"name": agg_name, "is_agg": True} for agg_name in aggs_names]
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
        monitor_id: int | None = None,
        cache_funcs: CacheFunctions | None = None,
        organization_id: int | None = None,
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
    check = await fetch_or_404(
        session,
        Check,
        id=check_id,
        options=joinedload(Check.model).load_only(Model.timezone)
    )

    all_windows = monitor_options.calculate_windows(check.model.timezone)[-31:]
    frequency = monitor_options.frequency

    assert frequency is not None
    aggregation_window = frequency.to_pendulum_duration() * monitor_options.aggregation_window

    model, model_versions = await get_model_versions_for_time_range(
        session,
        check.model_id,
        all_windows[0] - aggregation_window,
        all_windows[-1]
    )

    if len(model_versions) == 0:
        raise NotFound("No relevant model versions found")

    top_feat, _ = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)
    model_columns = list(model_versions[0].model_columns.keys())
    columns = top_feat + model_columns

    # First filter out model versions that doesn't fit the filter
    model_versions = [model_version for model_version in model_versions
                      if model_version.is_filter_fit(monitor_options.filter)]
    if len(model_versions) == 0:
        return {
            "output": {},
            "time_labels": [],
        }

    model_versions_data = {}
    for model_version in model_versions:
        query_reference = False
        test_info: t.List[t.Dict] = []
        # create the session per time window
        for window_end in all_windows:
            window_start = window_end - aggregation_window
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
                period = window_end - window_start
                query = create_execution_data_query(model_version, monitor_options, period=period, columns=columns,
                                                    with_labels=check.is_label_required,
                                                    filter_labels_exist=check.is_label_required,
                                                    is_ref=False)
                curr_test_info["query"] = session.execute(query)
                query_reference = True
            else:
                curr_test_info["query"] = None

        if check.is_reference_required and query_reference:
            # Reference query
            query = create_execution_data_query(model_version, monitor_options, columns=columns,
                                                with_labels=check.is_label_required,
                                                filter_labels_exist=check.is_label_required,
                                                is_ref=True)
            reference = session.execute(query)
        else:
            reference = None

        model_versions_data[model_version.id] = {"reference": reference, "windows": test_info}

    # get result from active sessions and run the check per each model version
    check_results = await get_results_for_model_versions_per_window(
        model_versions_data,
        model_versions,
        model,
        check,
        monitor_options.additional_kwargs
    )

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

    return {
        "output": reduce_results,
        "time_labels": [d.isoformat() for d in all_windows]
    }


async def run_check_window(
        check: Check,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession,
        model: Model,
        model_versions: t.List[ModelVersion],
        reference_only: bool = False,
        n_samples: int = DEFAULT_N_SAMPLES,
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

    top_feat, _ = get_top_features_or_from_conf(model_versions[0], monitor_options.additional_kwargs)

    is_train_test_check = check.is_reference_required
    if reference_only and is_train_test_check:
        raise BadRequest("Running a check on reference data only relevant "
                         f"for single dataset checks, received {check.name}")

    # execute an async session per each model version
    model_versions_data = {}
    for model_version in model_versions:
        test_session, ref_session = load_data_for_check(model_version, top_feat, monitor_options,
                                                        with_reference=is_train_test_check or reference_only,
                                                        with_test=not reference_only,
                                                        n_samples=n_samples,
                                                        with_labels=check.is_label_required,
                                                        filter_labels_exist=check.is_label_required)
        info = {
            "windows": [{"query": session.execute(test_session)}] if not reference_only else [{}],
            "reference": session.execute(ref_session) if ref_session is not None else None
        }

        model_versions_data[model_version.id] = info

    # get result from active sessions and run the check per each model version
    if not reference_only:
        model_results_per_window = await get_results_for_model_versions_per_window(
            model_versions_data,
            model_versions,
            model,
            check,
            monitor_options.additional_kwargs,
            with_display
        )
    else:
        model_results_per_window = await get_results_for_model_versions_for_reference(
            model_versions_data,
            model_versions,
            model,
            check,
            monitor_options.additional_kwargs,
        )

    model_results = {}
    for model_version, results_per_window in model_results_per_window.items():
        # the original function is more general and runs it per window, we have only 1 window here
        if results_per_window is not None:
            model_results[model_version] = results_per_window[0]

    return model_results


def create_execution_data_query(
        model_version: ModelVersion,
        options: TableFiltersSchema,
        period: "t.Optional[pdl.Period]" = None,
        columns: "t.Optional[list[str]]" = None,
        n_samples: int = DEFAULT_N_SAMPLES,
        with_labels: bool = False,
        filter_labels_exist: bool = False,
        is_ref: bool = False
) -> "sa.sql.Selectable":
    """Return sessions of the data load for the given model version.

    Parameters
    ----------
    model_version: Table
    options
    period
    columns
    n_samples: int
        The number of samples to collect
    with_labels: bool, default False
        Whether to add labels to the query
    filter_labels_exist: bool, default False
        Whether to filter out samples without labels
    is_ref

    Returns
    -------
    Coroutine
        Routine is the data session.
    """
    if filter_labels_exist and not with_labels:
        raise ValueError("filter_labels_exist is True but with_labels is False")

    if is_ref:
        table = model_version.get_reference_table()
        if columns is None:
            if with_labels is False:
                columns = [col.name for col in table.c if col.name != SAMPLE_LABEL_COL]
            else:
                columns = [col.name for col in table.c]
        elif with_labels:
            columns = columns + [SAMPLE_LABEL_COL]

        data_query = select([table.c[col] for col in sorted(columns)])

        if filter_labels_exist:
            data_query = data_query.where(table.c[SAMPLE_LABEL_COL].isnot(None))

        return data_query.filter(options.sql_columns_filter())\
            .order_by(func.hashtext(func.cast(table.c[REFERENCE_SAMPLE_ID_COL], VARCHAR)))\
            .limit(n_samples)
    else:
        if period is None:
            raise ValueError("period must be provided for monitor table")
        table = model_version.get_monitor_table()

        if columns is None:
            columns = [col.name for col in table.c]

        # Forcefully add the sample id and ts columns
        columns = set(columns + [SAMPLE_TS_COL, SAMPLE_ID_COL])
        # Sort the columns to create a deterministic query for profiling purposes
        columns = sorted(columns)

        data_query = select([table.c[col] for col in columns]).filter(options.sql_columns_filter()) \
            .filter(table.c[SAMPLE_TS_COL] >= period.start, table.c[SAMPLE_TS_COL] < period.end) \
            .order_by(func.hashtext(table.c[SAMPLE_ID_COL]))\
            .limit(n_samples)

        # For monitoring tables, we join the labels table if needed
        if with_labels:
            sample_labels_table = model_version.model.get_sample_labels_table()
            data_query = select([*data_query.c, sample_labels_table.c[SAMPLE_LABEL_COL]]).select_from(data_query).join(
                sample_labels_table,
                onclause=data_query.c[SAMPLE_ID_COL] == sample_labels_table.c[SAMPLE_ID_COL],
                isouter=True
            )
            # Filter only samples with labels
            if filter_labels_exist:
                data_query = data_query.where(sample_labels_table.c[SAMPLE_LABEL_COL].isnot(None))

        return data_query


def load_data_for_check(
        model_version: ModelVersion,
        features: t.List[str],
        options: TimeWindowOption,
        with_reference: bool = True,
        with_test: bool = True,
        n_samples: int = DEFAULT_N_SAMPLES,
        with_labels: bool = False,
        filter_labels_exist: bool = False,
) -> t.Tuple[t.Optional[t.Coroutine], t.Optional[t.Coroutine]]:
    """Return sessions of the data load for the given model version.

    Parameters
    ----------
    model_version
    features
    options
    with_reference: bool
        Whether to load reference
    with_test: bool
        Whether to load test
    n_samples: int
        The number of samples to collect
    with_labels: bool, default False
        Whether to add labels to the query
    filter_labels_exist: bool, default False
        Whether to filter out samples without labels
    Returns
    -------
    Tuple[t.Optional[Coroutine], t.Optional[Coroutine]]
        First routine is test session, Second routine is reference session
    """
    if not model_version.is_filter_fit(options.filter):
        return None, None

    columns = features + list(model_version.model_columns.keys())

    if with_reference:
        reference_query = create_execution_data_query(model_version,
                                                      columns=columns,
                                                      options=options,
                                                      n_samples=n_samples,
                                                      with_labels=with_labels,
                                                      filter_labels_exist=filter_labels_exist,
                                                      is_ref=True)
    else:
        reference_query = None

    if with_test:
        if model_version.is_in_range(options.start_time_dt(), options.end_time_dt()):
            period = options.end_time_dt() - options.start_time_dt()
            test_query = create_execution_data_query(model_version,
                                                     columns=columns,
                                                     period=period,
                                                     options=options,
                                                     n_samples=n_samples,
                                                     with_labels=with_labels,
                                                     filter_labels_exist=filter_labels_exist,
                                                     is_ref=False)
        else:
            test_query = None
    else:
        test_query = None

    return test_query, reference_query


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
