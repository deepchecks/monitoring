# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the check."""
import typing as t

import pandas as pd
import pendulum as pdl
from deepchecks import SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.core import BaseCheck
from deepchecks.core.reduce_classes import (ReduceFeatureMixin, ReduceLabelMixin, ReduceMetricClassMixin,
                                            ReducePropertyMixin)
from deepchecks.tabular.checks import ConfusionMatrixReport, RegressionErrorDistribution
from fastapi import Depends, Query
from fastapi.responses import PlainTextResponse
from plotly.basedatatypes import BaseFigure
from pydantic import BaseModel, Field
from sqlalchemy import Column, delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.config import Settings, Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep, SettingsDep
from deepchecks_monitoring.exceptions import BadRequest, NotFound
from deepchecks_monitoring.logic.check_logic import (CheckNotebookSchema, CheckRunOptions, MonitorOptions,
                                                     SingleCheckRunOptions, complete_sessions_for_check,
                                                     get_feature_property_info, get_metric_class_info,
                                                     load_data_for_check, reduce_check_result, reduce_check_window,
                                                     run_check_per_window_in_range, run_check_window,
                                                     run_suite_per_window_in_range)
from deepchecks_monitoring.logic.model_logic import (get_model_versions_for_time_range,
                                                     get_results_for_model_versions_per_window,
                                                     get_top_features_or_from_conf)
from deepchecks_monitoring.logic.statistics import bins_for_feature
from deepchecks_monitoring.monitoring_utils import (CheckIdentifier, DataFilter, DataFilterList, ExtendedAsyncSession,
                                                    ModelIdentifier, MonitorCheckConf, NameIdResponse, OperatorsEnum,
                                                    exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Check, ColumnType, Model, TaskType
from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.schema_models.monitor import Frequency, round_off_datetime
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.notebook_util import get_check_notebook
from deepchecks_monitoring.utils.typing import as_datetime, as_pendulum_datetime

from .router import router


class CheckConfigSchema(TypedDict):
    """Check instance config schema."""

    module_name: str
    class_name: str
    params: t.Dict[t.Any, t.Any]
    # version: str


class CheckCreationSchema(BaseModel):
    """Check schema."""

    config: CheckConfigSchema
    name: t.Optional[str] = Field(default=None, max_length=field_length(Check.name))

    class Config:
        """Schema config."""

        orm_mode = True


class CheckSchema(BaseModel):
    """Schema for the check."""

    config: CheckConfigSchema
    model_id: int
    id: int
    docs_link: t.Optional[str] = Field(nullable=True)
    name: t.Optional[str] = Field(default=None, max_length=field_length(Check.name))

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class CheckResultSchema(BaseModel):
    """Check run result schema."""

    output: t.Dict
    time_labels: t.List[str]


class CheckGroupBySchema(BaseModel):
    """Schema for result of a check group by run."""

    name: t.Optional[str] = Field(nullable=True)
    value: t.Optional[t.Dict]
    count: int
    filters: DataFilterList


class AutoFrequencyResponse(BaseModel):
    """Response for auto frequency."""

    frequency: Frequency
    start: int
    end: int


@router.post(
    '/models/{model_id}/checks',
    response_model=t.List[NameIdResponse],
    tags=[Tags.CHECKS]
)
async def add_checks(
        checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]],
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: ExtendedAsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
) -> t.List[t.Dict[t.Any, t.Any]]:
    """Add a new check or checks to the model.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        ID or name of the model.
    checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]]
        Check or checks to add to model.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    t.List[t.Dict[t.Any, t.Any]]
        List containing the names and ids for uploaded checks.
    """
    model = t.cast(Model, await session.fetchone_or_404(
        select(Model)
        .where(model_identifier.as_expression)
        .options(joinedload(Model.checks)),
        message=f'Model with next set of arguments does not exist: {repr(model_identifier)}'
    ))

    checks = [checks] if not isinstance(checks, t.Sequence) else checks
    existing_check_names = [t.cast(str, x.name) for x in t.cast(t.List[Check], model.checks)]

    check_entities = []
    for check_creation_schema in checks:
        if check_creation_schema.name in existing_check_names:
            raise BadRequest(f'Model already contains a check named {check_creation_schema.name}')
        is_tabular = str(check_creation_schema.config['module_name']).startswith('deepchecks.tabular')
        if not is_tabular:
            raise BadRequest(f'Check {check_creation_schema.name} is not compatible with the model task type')
        dp_check = BaseCheck.from_config(check_creation_schema.config)
        if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
            raise ValueError('incompatible check type')
        check_object = Check(model_id=model.id, is_label_required=isinstance(dp_check, ReduceLabelMixin),
                             is_reference_required=isinstance(dp_check, TrainTestBaseCheck), created_by=user.id,
                             updated_by=user.id, **check_creation_schema.dict(exclude_none=True))
        check_entities.append(check_object)
        session.add(check_object)

    await session.flush()
    output = []
    for check_object in check_entities:
        await session.refresh(check_object)
        output.append(NameIdResponse.from_orm(check_object).dict())
    return output


@router.delete('/models/{model_id}/checks/{check_id}', tags=[Tags.CHECKS])
async def delete_check_by_id(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        check_identifier: CheckIdentifier = CheckIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep
):
    """Delete check instance by identifier."""
    await exists_or_404(session, Model, **model_identifier.as_kwargs)
    await exists_or_404(session, Check, **check_identifier.as_kwargs)
    await delete(Check).where(check_identifier.as_expression)


@router.delete('/models/{model_id}/checks', tags=[Tags.CHECKS])
async def delete_checks_by_name(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        names: t.List[str] = Query(..., description='Checks names'),
        session: ExtendedAsyncSession = AsyncSessionDep
):
    """Delete check instances by name if they exist, otherwise returns 404."""
    model = (await session.fetchone_or_404(
        select(Model)
        .where(model_identifier.as_expression)
        .options(joinedload(Model.checks))
        .limit(1),
        message=f"'Model' with next set of arguments does not exist: {repr(model_identifier)}"
    ))

    model = t.cast(Model, model)
    existing_checks = {check.name: check.id for check in model.checks}
    checks_to_delete = []

    for name in names:
        if name not in existing_checks:
            raise NotFound(f"'Check' with next set of arguments does not exist: name={name}")
        checks_to_delete.append(existing_checks[name])

    await session.execute(
        delete(Check)
        .where(Check.id.in_(checks_to_delete))
    )


@router.get(
    '/models/{model_id}/checks',
    response_model=t.List[CheckSchema],
    tags=[Tags.CHECKS]
)
async def get_checks(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep
) -> t.List[CheckSchema]:
    """Return all the checks for a given model.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        ID or name of the model.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[CheckSchema]
        All the checks for a given model.
    """
    await exists_or_404(session, Model, **model_identifier.as_kwargs)
    q = select(Check).join(Check.model).where(model_identifier.as_expression)
    results = (await session.scalars(q)).all()
    return [CheckSchema.from_orm(res) for res in results]


@router.get(
    '/models/{model_id}/auto-frequency',
    tags=[Tags.CHECKS],
    response_model=AutoFrequencyResponse
)
async def get_model_auto_frequency(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep,
):
    """Infer from the data the best frequency to show for analysis screen."""
    model = await fetch_or_404(session, Model, **model_identifier.as_kwargs)
    model_timezone = t.cast(str, model.timezone)

    if model.end_time is None:
        frequency = Frequency.DAY
        end = round_off_datetime(pdl.now(model_timezone), Frequency.DAY)
        return {
            'end': end.int_timestamp,
            'start': as_pendulum_datetime(end - frequency.to_pendulum_duration()).int_timestamp,
            'frequency': frequency.value
        }

    # Query random timestamps of samples in the last 90 days
    model_end_time = pdl.instance(as_datetime(model.end_time)).in_tz(model_timezone)
    end_time = round_off_datetime(model_end_time, Frequency.MONTH)
    start_time = end_time.subtract(years=1)
    # start_time = end_time.subtract(days=90)

    _, model_versions = await get_model_versions_for_time_range(
        session,
        model.id,
        start_time,
        end_time
    )

    total_timestamps = 10_000
    timestamps_per_version = max(100, total_timestamps // max(len(model_versions), 1))
    timestamps = []
    # queries = []

    for model_version in model_versions:
        # To improve performance does not load all the table definition and just define the timestamp and id columns
        # manually
        id_column = Column(SAMPLE_ID_COL)
        ts_column = Column(SAMPLE_TS_COL)
        monitor_table_name = model_version.get_monitor_table_name()

        timestamps.extend(
            (await session.scalars(
                select(ts_column)
                .select_from(text(monitor_table_name))
                .where(ts_column <= end_time, ts_column >= start_time)
                .order_by(func.md5(id_column))
                .limit(timestamps_per_version)
            )).all()
        )

    # Set option in order of importance - the first option to pass 0.8 windows percentage returns, else the one with
    # maximum percentage returns
    options = []

    for frequency, lookback in (
        (Frequency.DAY, pdl.duration(days=31)),
        (Frequency.HOUR, pdl.duration(days=1)),
        (Frequency.WEEK, pdl.duration(weeks=12)),
        (Frequency.MONTH, pdl.duration(years=1))
    ):
        end_time = round_off_datetime(model_end_time, frequency) - pdl.duration(microseconds=1)
        start_time = as_pendulum_datetime(end_time - lookback)

        if model.start_time > start_time:
            start_time = pdl.instance(model.start_time).subtract(microseconds=1)

        period = pdl.period(start_time, end_time)

        if frequency is Frequency.MONTH:
            # this `if` is needed because:
            # >>> period / pdl.duration(years=1)
            # ... raises ZeroDivisionError
            num_windows = period.in_months()
        else:
            num_windows = max(int(period / frequency.to_pendulum_duration()), 1)

        num_windows = 1 if num_windows == 0 else num_windows

        # Convert timestamps to windows and count number of unique windows
        num_windows_exists = len(set((
            round_off_datetime(pdl.instance(it).in_tz(model_timezone), frequency)
            for it in timestamps
            if it >= start_time
        )))

        option = {
            'start': start_time.int_timestamp,
            'end': end_time.int_timestamp,
            'frequency': frequency.value
        }

        if (percent_windows_exists := num_windows_exists / num_windows) >= 0.8:
            return option
        else:
            options.append((percent_windows_exists, option))

    # If no option has at least 80% of the windows, return the option with the highest percentage
    max_option = max(options, key=lambda it: it[0])
    return max_option[1]


@router.post('/checks/run-many', response_model=t.Dict[int, CheckResultSchema], tags=[Tags.CHECKS])
async def run_many_checks_together(
        monitor_options: MonitorOptions,
        check_ids: t.List[int] = Query(alias='check_id'),
        session: AsyncSession = AsyncSessionDep,
):
    """Run a check for each time window by start-end.

    Parameters
    ----------
    check_ids : List[int]
        ID of the check.
    monitor_options : MonitorOptions
        The "monitor" options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    CheckResultSchema
        Check run result.
    """
    return await run_suite_per_window_in_range(
        check_ids,
        session,
        monitor_options,
    )


@router.post('/checks/{check_id}/run/lookback', response_model=CheckResultSchema, tags=[Tags.CHECKS])
async def run_standalone_check_per_window_in_range(
        check_id: int,
        monitor_options: MonitorOptions,
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Run a check for each time window by start-end.

    Parameters
    ----------
    check_id : int
        ID of the check.
    monitor_options : MonitorOptions
        The "monitor" options.
    session : AsyncSession, optional
        SQLAlchemy session.
    resources_provider: ResourcesProvider
        Resources provider.

    Returns
    -------
    CheckResultSchema
        Check run result.
    """
    return await run_check_per_window_in_range(
        check_id,
        session,
        monitor_options,
        parallel=resources_provider.settings.is_cloud,
    )


@router.post('/checks/{check_id}/run/window', tags=[Tags.CHECKS])
async def get_check_window(
        check_id: int,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Run a check for the time window.

    Parameters
    ----------
    check_id : int
        ID of the check.
    monitor_options : MonitorOptions
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.
    resources_provider: ResourcesProvider
        Resources provider.

    Returns
    -------
    dict
        {<version_name: check_res>}.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    start_time = monitor_options.start_time_dt()
    end_time = monitor_options.end_time_dt()
    model, model_versions = await get_model_versions_for_time_range(session, check.model_id, start_time, end_time)
    model_results = await run_check_window(check, monitor_options, session, model, model_versions,
                                           parallel=resources_provider.settings.is_cloud)
    result_per_version = reduce_check_window(model_results, monitor_options)
    return {version.name: val for version, val in result_per_version.items()}


@router.post('/checks/{check_id}/run/reference', tags=[Tags.CHECKS])
async def get_check_reference(
        check_id: int,
        monitor_options: CheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
):
    """Run a check on the reference data.

    Parameters
    ----------
    check_id : int
        ID of the check.
    monitor_options : CheckRunOptions
        The monitor options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    dict
        {<version_name: check_res>}.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)

    model = t.cast(Model, await session.scalar(
        select(Model)
        .where(Model.id == check.model_id, Model.id == ModelVersion.model_id)
        .options(selectinload(Model.versions))
    ))

    if model is None:
        model, model_versions = await fetch_or_404(session, Model, id=check.model_id), []
    else:
        model_versions: t.List[ModelVersion] = model.versions

    model_results = await run_check_window(check, monitor_options, session, model, model_versions,
                                           reference_only=True, n_samples=100_000)
    result_per_version = reduce_check_window(model_results, monitor_options)
    return {version.name: val for version, val in result_per_version.items()}


# TODO: Why POST method and not GET is used here?
@router.post('/checks/{check_id}/get-notebook', tags=[Tags.CHECKS], response_class=PlainTextResponse)
async def get_notebook(
        check_id: int,
        notebook_options: CheckNotebookSchema,
        session: AsyncSession = AsyncSessionDep,
        settings: Settings = SettingsDep,
):
    """Run a check on a specified model version and returns a Jupyter notebook with the code to run the check.

    Parameters
    ----------
    check_id : int
        The id of the check to create a notebook to.
    notebook_options : CheckNotebookSchema
        The options for the check notebook.
    session : AsyncSession, default: AsyncSessionDep
        The database session to use.
    settings : Settings, default: SettingsDep

    Returns
    -------
    PlainTextResponse
        A response containing the Jupyter notebook.
    """
    return await get_check_notebook(check_id, notebook_options, session, settings.deployment_url)


@router.get('/checks/{check_id}/info', response_model=MonitorCheckConf, tags=[Tags.CHECKS])
async def get_check_info(
        check_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Get the check configuration info and the possible values for the parameters.

    Parameters
    ----------
    check_id : int
        ID of the check.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    MonitorCheckConf
        the check configuration info and the possible values for the parameters.
    """
    check = await fetch_or_404(session, Check, id=check_id)
    dp_check = BaseCheck.from_config(check.config)
    latest_version_query = (select(ModelVersion)
                            .where(ModelVersion.model_id == check.model_id)
                            .order_by(ModelVersion.end_time.desc()).limit(1)
                            .options(selectinload(ModelVersion.model)))
    latest_version: ModelVersion = (await session.execute(latest_version_query)).scalars().first()
    if latest_version is None:
        model: Model = (await session.execute(select(Model).where(Model.id == check.model_id))).scalars().first()
    else:
        model: Model = latest_version.model

    if isinstance(dp_check, ReduceMetricClassMixin):
        check_parameter_conf = get_metric_class_info(latest_version, model)
    elif isinstance(dp_check, (ReduceFeatureMixin, ReducePropertyMixin)):
        check_parameter_conf = get_feature_property_info(latest_version, dp_check)
    else:
        check_parameter_conf = {'check_conf': None, 'res_conf': None}
    return check_parameter_conf


@router.post('/checks/{check_id}/group-by/{model_version_id}/{feature}',
             response_model=t.List[CheckGroupBySchema], tags=[Tags.CHECKS])
async def run_check_group_by_feature(
        check_id: int,
        model_version_id: int,
        feature: str,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Run check window with a group by on given feature.

    Parameters
    ----------
    check_id : int
        ID of the check.
    model_version_id : int
    feature : str
        Feature to group by
    monitor_options : SingleCheckRunOptions
       The monitor options.
    session : AsyncSession
        SQLAlchemy session.
    resources_provider: ResourcesProvider
        Resources provider.

    Returns
    -------
    List[CheckGroupBySchema]
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id,
                                                     options=joinedload(ModelVersion.model))
    # Validate feature
    possible_columns = list(model_version.features_columns.keys()) + list(model_version.additional_data_columns.keys())
    if feature not in possible_columns:
        raise BadRequest(f'Feature {feature} was not found in model version schema')

    # Get all data count
    data_table = model_version.get_monitor_table(session)
    count_query = select(func.count()).where(monitor_options.sql_all_filters()).select_from(data_table)
    if check.is_label_required:
        count_query = model_version.model.filter_labels_exist(count_query, data_table)
    count = (await session.execute(count_query)).scalar()
    if count == 0:
        raise NotFound('No data was found for given filters and dates')

    # Start with all data filter
    filters = [{
        'name': 'All Data',
        # This is additional data filter (which is added to the monitor options filters), so for "all data" it is empty
        'filters': DataFilterList(filters=[]),
        'count': count
    }]

    # Heuristically we found the minimal number of samples for drift on numerical features with small enough bias
    magic_numeric_min_samples = 200
    # Get number of bins between 2 and 10, depends on the count
    numeric_bins_count = min(max(2, count // magic_numeric_min_samples), 10)
    feature_type, bins = await bins_for_feature(model_version, data_table, feature, session, monitor_options,
                                                numeric_bins=numeric_bins_count,
                                                filter_labels_exist=check.is_label_required)

    if feature_type == ColumnType.CATEGORICAL:
        for curr_bin in bins:
            filters.append({
                'name': curr_bin['value'],
                'filters': DataFilterList(filters=[
                    DataFilter(column=feature, operator=OperatorsEnum.EQ, value=curr_bin['value'])
                ]),
                'count': curr_bin['count']
            })
    else:
        for curr_bin in bins:
            if curr_bin['min'] is None:
                data_filters = [DataFilter(column=feature, operator=OperatorsEnum.EQ, value=None)]
            else:
                # The bins from bins_for_feature returns the min, max inclusive and non-overlapping. Means we need to
                # user greater equals and lower equals.
                data_filters = [
                    DataFilter(column=feature, operator=OperatorsEnum.GE, value=curr_bin['min']),
                    DataFilter(column=feature, operator=OperatorsEnum.LE, value=curr_bin['max'])
                ]
            filters.append({
                'name': curr_bin['name'],
                'filters': DataFilterList(filters=data_filters),
                'count': curr_bin['count']
            })

    top_feat, _ = get_top_features_or_from_conf(model_version, monitor_options.additional_kwargs)

    # First create all session for the db to start simultaneously
    sessions = []
    for f in filters:
        test_session, ref_session = load_data_for_check(model_version, session, top_feat,
                                                        monitor_options.add_filters(f['filters']),
                                                        with_reference=check.is_reference_required, with_test=True,
                                                        with_labels=check.is_label_required,
                                                        filter_labels_exist=check.is_label_required)
        # The test info is used for caching purposes so need to fill it here
        test_session_info = {'start': None, 'end': None, 'query': test_session}
        sessions.append([(ref_session, [test_session_info])])

    # Now wait for sessions and run the check
    for f, model_versions_sessions in zip(filters, sessions):
        model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
        # Get value from check to run
        model_results_per_window = get_results_for_model_versions_per_window(
            model_version_dataframes, [model_version], model_version.model, check,
            monitor_options.additional_kwargs, with_display=False, parallel=resources_provider.settings.is_cloud)
        # The function we called is more general, but we know here we have single version and window
        result = model_results_per_window[model_version][0]
        if result['result'] is not None:
            check_result = result['result']
            f['value'] = reduce_check_result(check_result, monitor_options.additional_kwargs)
        else:
            f['value'] = None

    return filters


@router.post('/checks/{check_id}/display/{model_version_id}',
             response_model=t.List[t.Dict], tags=[Tags.CHECKS])
async def get_check_display(
        check_id: int,
        model_version_id: int,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    check: Check = await fetch_or_404(session, Check, id=check_id)
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id,
                                                     options=joinedload(ModelVersion.model))

    # Ugly hack to show different display instead of the one of single dataset performance
    if check.config['class_name'] == 'SingleDatasetPerformance':
        if model_version.model.task_type == TaskType.REGRESSION:
            check = Check(config=RegressionErrorDistribution().config(), is_reference_required=False,
                          is_label_required=True)
        else:
            check = Check(config=ConfusionMatrixReport().config(), is_reference_required=True,
                          is_label_required=True)

    top_feat, _ = get_top_features_or_from_conf(model_version, monitor_options.additional_kwargs)

    test_session, ref_session = load_data_for_check(model_version, session, top_feat, monitor_options,
                                                    with_reference=check.is_reference_required, with_test=True,
                                                    with_labels=check.is_label_required,
                                                    filter_labels_exist=check.is_label_required)
    # The test info is used for caching purposes so need to fill it here
    test_session_info = {'start': None, 'end': None, 'query': test_session}
    model_versions_sessions = [(ref_session, [test_session_info])]
    model_version_dataframes = await complete_sessions_for_check(model_versions_sessions)
    # Get value from check to run
    model_results_per_window = get_results_for_model_versions_per_window(
        model_version_dataframes, [model_version], model_version.model, check,
        monitor_options.additional_kwargs, with_display=True, parallel=resources_provider.settings.is_cloud)

    # The function we called is more general, but we know here we have single version and window
    result = model_results_per_window[model_version][0]
    display = []
    if result['result'] is not None:
        check_result = result['result']
        for d in check_result.display:
            if isinstance(d, BaseFigure):
                display.append({'type': 'plotly', 'data': d.to_json()})
            elif isinstance(d, pd.DataFrame):
                display.append({'type': 'table', 'data': d.to_json(orient='table')})
    return display
