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
from fastapi import Query
from pydantic import BaseModel, validator
from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from typing_extensions import TypedDict

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.check_logic import MonitorOptions, run_check_per_window_in_range, run_check_window
from deepchecks_monitoring.logic.model_logic import get_model_versions_for_time_range
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.utils import IdResponse, exists_or_404, fetch_or_404

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
    name: t.Optional[str] = None

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
    name: t.Optional[str] = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class CheckResultSchema(BaseModel):
    """Check run result schema."""

    output: t.Dict
    time_labels: t.List[str]


@router.post('/models/{model_id}/checks',
             response_model=t.Union[IdResponse, t.List[IdResponse]],
             tags=[Tags.CHECKS]
             )
async def create_check(
    model_id: int,
    checks: t.Union[CheckCreationSchema, t.List[CheckCreationSchema]],
    session: AsyncSession = AsyncSessionDep
) -> t.Union[t.Dict[t.Any, t.Any], t.List[t.Dict[t.Any, t.Any]]]:
    """Create a new check.

    Parameters
    ----------
    model_id : int
        ID of the model.
    check : CheckCreationSchema
        Check to create.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    int
        The check id.
    """
    await exists_or_404(session, Model, id=model_id)

    if isinstance(checks, CheckCreationSchema):
        check = Check(model_id=model_id, **checks.dict(exclude_none=True))
        session.add(check)
        try:
            await session.flush()
        except IntegrityError as error:
            raise BadRequest('Model check name duplication') from error
        return IdResponse.from_orm(check).dict()

    check_entities = []
    output = []

    for check in checks:
        check = Check(model_id=model_id, **check.dict(exclude_none=True))
        check_entities.append(check)
        session.add(check)

    try:
        await session.flush()
    except IntegrityError as error:
        raise BadRequest('Model check name duplication') from error

    for check in check_entities:
        await session.refresh(check)
        output.append(IdResponse.from_orm(check).dict())

    return output


@router.delete('/models/{model_id}/checks/{check_id}', tags=[Tags.CHECKS])
async def delete_check(
    model_id: int,
    check_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete check instance by identifier."""
    await exists_or_404(session, Model, id=model_id)
    await exists_or_404(session, Check, id=check_id)
    await Check.delete(session, check_id)


@router.delete('/models/{model_id}/checks', tags=[Tags.CHECKS])
async def delete_check_by_name(
    model_id: int,
    names: t.List[str] = Query(...),
    session: AsyncSession = AsyncSessionDep
):
    """Delete check instances by name."""
    await exists_or_404(session, Model, id=model_id)
    await session.execute(delete(Check).where(and_(
        Check.model_id == model_id,
        Check.name.in_(names)
    )))


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
    lookback_duration: pdl.Period = end_time - start_time
    if lookback_duration < pdl.duration(days=2):
        window = pdl.duration(hours=1)
    elif lookback_duration < pdl.duration(days=8):
        window = pdl.duration(days=1)
    else:
        window = pdl.duration(weeks=1)

    return await run_check_per_window_in_range(
        check_id,
        start_time,
        end_time,
        window,
        monitor_options.filter,
        session
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
