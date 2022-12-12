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

from deepchecks import SingleDatasetBaseCheck, TrainTestBaseCheck
from deepchecks.core import BaseCheck
from deepchecks.core.reduce_classes import (ReduceFeatureMixin, ReduceLabelMixin, ReduceMetricClassMixin,
                                            ReducePropertyMixin)
from fastapi import Query
from fastapi.responses import PlainTextResponse
from plotly.basedatatypes import BaseFigure
from pydantic import BaseModel, Field, validator
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, HostDep, S3BucketDep
from deepchecks_monitoring.exceptions import BadRequest, NotFound
from deepchecks_monitoring.logic.check_logic import (CheckNotebookSchema, CheckRunOptions, MonitorOptions,
                                                     SingleCheckRunOptions, get_feature_property_info,
                                                     get_metric_class_info, reduce_check_result, reduce_check_window,
                                                     run_check_per_window_in_range, run_check_window)
from deepchecks_monitoring.logic.model_logic import get_model_versions_for_time_range
from deepchecks_monitoring.logic.statistics import bins_for_feature
from deepchecks_monitoring.monitoring_utils import (CheckIdentifier, DataFilter, DataFilterList, ExtendedAsyncSession,
                                                    ModelIdentifier, MonitorCheckConf, NameIdResponse, OperatorsEnum,
                                                    exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.schema_models import Check, ColumnType, Model
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.utils.notebook_util import get_check_notebook

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

    @validator('config')
    def validate_configuration(cls, config):  # pylint: disable=no-self-argument
        """Validate check configuration."""
        try:
            # 'from_config' will raise an ValueError if config is incorrect
            BaseCheck.from_config(config)
            return config
        except TypeError as error:
            # 'from_config' will raise a TypeError if it does not able to
            # import given module/class from the config
            raise ValueError(error.args[0]) from error


class CheckSchema(BaseModel):
    """Schema for the check."""

    config: CheckConfigSchema
    model_id: int
    id: int
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

    name: str
    value: t.Optional[t.Dict]
    display: t.List
    count: int
    filters: DataFilterList


@router.post(
    '/models/{model_id}/checks',
    response_model=t.List[NameIdResponse],
    tags=[Tags.CHECKS]
)
async def add_checks(
        checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]],
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: ExtendedAsyncSession = AsyncSessionDep
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

    is_vision_model = 'vision' in model.task_type.value
    checks = [checks] if not isinstance(checks, t.Sequence) else checks
    existing_check_names = [t.cast(str, x.name) for x in t.cast(t.List[Check], model.checks)]

    check_entities = []
    for check_creation_schema in checks:
        if check_creation_schema.name in existing_check_names:
            raise BadRequest(f'Model already contains a check named {check_creation_schema.name}')
        is_vision_check = str(check_creation_schema.config['module_name']).startswith('deepchecks.vision')
        if is_vision_model != is_vision_check:
            raise BadRequest(f'Check {check_creation_schema.name} is not compatible with the model task type')
        dp_check = BaseCheck.from_config(check_creation_schema.config)
        if not isinstance(dp_check, (SingleDatasetBaseCheck, TrainTestBaseCheck)):
            raise ValueError('incompatible check type')
        check_object = Check(model_id=model.id, is_label_required=isinstance(dp_check, ReduceLabelMixin),
                             **check_creation_schema.dict(exclude_none=True))
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


@router.post('/checks/{check_id}/run/lookback', response_model=CheckResultSchema, tags=[Tags.CHECKS])
async def run_standalone_check_per_window_in_range(
        check_id: int,
        monitor_options: MonitorOptions,
        session: AsyncSession = AsyncSessionDep,
        s3_bucket: str = S3BucketDep,
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
    s3_bucket: str
        The bucket that is used for s3 images

    Returns
    -------
    CheckSchema
        Created check.
    """
    return await run_check_per_window_in_range(
        check_id,
        session,
        monitor_options,
        s3_bucket
    )


@router.post('/checks/{check_id}/run/window', tags=[Tags.CHECKS])
async def get_check_window(
        check_id: int,
        monitor_options: SingleCheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
        s3_bucket: str = S3BucketDep,
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
    s3_bucket: str
        The bucket that is used for s3 images

    Returns
    -------
    CheckSchema
        Created check.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    start_time = monitor_options.start_time_dt()
    end_time = monitor_options.end_time_dt()
    model, model_versions = await get_model_versions_for_time_range(session, check, start_time, end_time)
    model_results = await run_check_window(check, monitor_options, session, model, model_versions, s3_bucket)
    result_per_version = reduce_check_window(model_results, monitor_options)
    return {version.name: val for version, val in result_per_version.items()}


@router.post('/checks/{check_id}/run/reference', tags=[Tags.CHECKS])
async def get_check_reference(
        check_id: int,
        monitor_options: CheckRunOptions,
        session: AsyncSession = AsyncSessionDep,
        s3_bucket: str = S3BucketDep,
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
    s3_bucket: str
        The bucket that is used for s3 images

    Returns
    -------
    CheckSchema
        Created check.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    model_results = await session.execute(select(Model).where(Model.id == check.model_id,
                                                              Model.id == ModelVersion.model_id)
                                          .options(selectinload(Model.versions)))
    model: Model = model_results.scalars().first()
    if model is None:
        model, model_versions = await fetch_or_404(session, Model, id=check.model_id), []
    else:
        model_versions: t.List[ModelVersion] = model.versions

    model_results = await run_check_window(check, monitor_options, session, model, model_versions, s3_bucket,
                                           reference_only=True, n_samples=100_000)
    result_per_version = reduce_check_window(model_results, monitor_options)
    return {version.name: val for version, val in result_per_version.items()}


@router.post('/checks/{check_id}/get-notebook', tags=[Tags.CHECKS], response_class=PlainTextResponse)
async def get_notebook(
        check_id: int,
        notebook_options: CheckNotebookSchema,
        session: AsyncSession = AsyncSessionDep,
        host: str = HostDep,
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
    host : str, default: HostDep
        The host of the DeepChecks server.

    Returns
    -------
    PlainTextResponse
        A response containing the Jupyter notebook.
    """
    return await get_check_notebook(check_id, notebook_options, session, host)


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
        check_parameter_conf = get_feature_property_info(latest_version, check, dp_check)
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
        s3_bucket: str = S3BucketDep,
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
    s3_bucket: str
        The bucket that is used for s3 images

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
        return BadRequest(f'Feature {feature} was not found in model version schema')

    # Get all data count
    count = (await session.execute(select(func.count()).where(monitor_options.sql_all_filters())
                                   .select_from(model_version.get_monitor_table(session)))).scalar()
    if count == 0:
        return NotFound('No data was found for given filters and dates')

    # Start with all data filter
    filters = [{
        'name': 'All Data',
        'filters': DataFilterList(filters=[]),
        'count': count
    }]

    # Get bins
    feature_type, bins = await bins_for_feature(model_version, feature, session, monitor_options)

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
            # The bins from bins_for_feature returns the min, max inclusive and non-overlapping
            filters.append({
                'name': curr_bin['name'],
                'filters': DataFilterList(filters=[
                    DataFilter(column=feature, operator=OperatorsEnum.GE, value=curr_bin['min']),
                    DataFilter(column=feature, operator=OperatorsEnum.LE, value=curr_bin['max'])
                ]),
                'count': curr_bin['count']
            })

    for f in filters:
        options = monitor_options.add_filters(f['filters'])
        window_result = await run_check_window(check, options, session, model_version.model, [model_version], s3_bucket,
                                               with_display=True)
        for model_version, result in window_result.items():
            if result is not None and result['result'] is not None:
                check_result = result['result']
                f['value'] = reduce_check_result(check_result, options.additional_kwargs)
                f['display'] = [d.to_json() for d in check_result.display if isinstance(d, BaseFigure)]
            else:
                f['value'] = None
                f['display'] = []

    return filters
