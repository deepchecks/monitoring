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

import pendulum as pdl
from deepchecks.core import BaseCheck
from deepchecks.core.reduce_classes import ReduceFeatureMixin, ReduceMetricClassMixin, ReducePropertyMixin
from fastapi import Query
from pydantic import BaseModel, Field, validator
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.check_logic import (MonitorOptions, get_feature_property_info, get_metric_class_info,
                                                     run_check_per_window_in_range, run_check_window)
from deepchecks_monitoring.logic.model_logic import get_model_versions_for_time_range
from deepchecks_monitoring.logic.monitor_alert_logic import get_time_ranges_for_monitor
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.utils import MonitorCheckConf, NameIdResponse, exists_or_404, fetch_or_404, field_length

from .model import ModelSchema
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


@router.post('/models/{model_id}/checks',
             response_model=t.List[NameIdResponse],
             tags=[Tags.CHECKS]
             )
async def add_checks(
        model_id: int,
        checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]],
        session: AsyncSession = AsyncSessionDep
) -> t.List[t.Dict[t.Any, t.Any]]:
    """Add a new check or checks to the model.

    Parameters
    ----------
    model_id : int
        ID of the model.
    checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]]
        Check or checks to add to model.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    t.List[t.Dict[t.Any, t.Any]]
        List containing the names and ids for uploaded checks.
    """
    model = await fetch_or_404(session, Model, id=model_id)
    is_vision_model = 'vision' in ModelSchema.from_orm(model).task_type.value
    if not isinstance(checks, t.Sequence):
        checks = [checks]
    existing_check_names = [x.name for x in await get_checks(model_id, session)]

    check_entities = []
    for check_creation_schema in checks:
        if check_creation_schema.name in existing_check_names:
            raise BadRequest(f'Model already contains a check named {check_creation_schema.name}')
        is_vision_check = str(check_creation_schema.config['module_name']).startswith('deepchecks.vision')
        if is_vision_model != is_vision_check:
            raise BadRequest(f'Check {check_creation_schema.name} is not compatible with the model task type')
        check_object = Check(model_id=model_id, **check_creation_schema.dict(exclude_none=True))
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
        model_id: int,
        check_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Delete check instance by identifier."""
    await exists_or_404(session, Model, id=model_id)
    await exists_or_404(session, Check, id=check_id)
    await Check.delete(session, check_id)


@router.delete('/models/{model_id}/checks', tags=[Tags.CHECKS])
async def delete_checks_by_name(
        model_id: int,
        names: t.List[str] = Query(...),
        session: AsyncSession = AsyncSessionDep
):
    """Delete check instances by name if they exist, otherwise returns 404."""
    await exists_or_404(session, Model, id=model_id)
    for name in names:
        await exists_or_404(session, Check, name=name, model_id=model_id)
    await session.execute(delete(Check).where(and_(
        Check.model_id == model_id,
        Check.name.in_(names))))


@router.get('/models/{model_id}/checks', response_model=t.List[CheckSchema], tags=[Tags.CHECKS])
async def get_checks(
        model_id: int,
        session: AsyncSession = AsyncSessionDep
) -> dict:
    """Return all the checks for a given model.

    Parameters
    ----------
    model_id : int
        ID of the model.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[CheckSchema]
        All the checks for a given model.
    """
    await exists_or_404(session, Model, id=model_id)
    select_checks = select(Check)
    select_checks = select_checks.where(Check.model_id == model_id)
    results = await session.execute(select_checks)
    return [CheckSchema.from_orm(res) for res in results.scalars().all()]


@router.post('/checks/{check_id}/run/lookback', response_model=CheckResultSchema, tags=[Tags.CHECKS])
async def run_standalone_check_per_window_in_range(
        check_id: int,
        monitor_options: MonitorOptions,
        session: AsyncSession = AsyncSessionDep
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

    Returns
    -------
    CheckSchema
        Created check.
    """
    # get the time window size
    start_time: pdl.DateTime = pdl.parse(monitor_options.start_time)
    end_time: pdl.DateTime = pdl.parse(monitor_options.end_time)
    lookback = (end_time - start_time).in_seconds()

    start_time, end_time, frequency = get_time_ranges_for_monitor(
        lookback=lookback, frequency=monitor_options.frequency, end_time=end_time)

    if monitor_options.aggregation_window is None:
        aggregation_window = frequency
    else:
        aggregation_window = pdl.duration(seconds=monitor_options.aggregation_window)

    return await run_check_per_window_in_range(
        check_id,
        start_time,
        end_time,
        frequency,
        aggregation_window,
        monitor_options.filter,
        session,
        monitor_options.additional_kwargs
    )


@router.post('/checks/{check_id}/run/window', tags=[Tags.CHECKS])
async def get_check_window(
        check_id: int,
        monitor_options: MonitorOptions,
        session: AsyncSession = AsyncSessionDep
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

    Returns
    -------
    CheckSchema
        Created check.
    """
    check: Check = await fetch_or_404(session, Check, id=check_id)
    start_time = monitor_options.start_time_dt()
    end_time = monitor_options.end_time_dt()
    model, model_versions = await get_model_versions_for_time_range(session, check, start_time, end_time)
    return await run_check_window(check, monitor_options, session, model, model_versions)


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
