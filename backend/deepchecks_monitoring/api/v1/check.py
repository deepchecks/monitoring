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
from deepchecks.core.checks import CheckConfig
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.check_logic import FilterWindowOptions, run_check_per_window_in_range, run_check_window
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.utils import DataFilterList, IdResponse, exists_or_404, fetch_or_404

from .router import router


class CheckCreationSchema(BaseModel):
    """Check schema."""

    config: CheckConfig
    name: t.Optional[str] = None

    class Config:
        """Schema config."""

        orm_mode = True


class CheckSchema(BaseModel):
    """Schema for the check."""

    config: CheckConfig
    model_id: int
    id: int
    name: str = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class MonitorOptions(BaseModel):
    """Monitor run schema."""

    end_time: str
    start_time: str
    filter: t.Optional[DataFilterList] = None


class CheckResultSchema(BaseModel):
    """Check run result schema."""

    output: t.Dict
    time_labels: t.List[str]


@router.post('/models/{model_id}/checks', response_model=IdResponse, tags=[Tags.CHECKS])
async def create_check(
    model_id: int,
    check: CheckCreationSchema,
    session: AsyncSession = AsyncSessionDep
) -> dict:
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
    check = Check(model_id=model_id, **check.dict(exclude_none=True))
    session.add(check)
    await session.flush()
    return {'id': check.id}


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
    window_options: FilterWindowOptions,
    session: AsyncSession = AsyncSessionDep
):
    """Run a check for the time window.

    Parameters
    ----------
    check_id : int
        ID of the check.
    window_options : FilterWindowOptions
        The window options.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    CheckSchema
        Created check.
    """
    check = await fetch_or_404(session, Check, id=check_id)
    return await run_check_window(check, window_options, session)
