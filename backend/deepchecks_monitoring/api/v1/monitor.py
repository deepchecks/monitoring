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
from fastapi import Request, Response, status
from pydantic import BaseModel, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.api.v1.alert_rule import AlertRuleSchema
from deepchecks_monitoring.api.v1.check import CheckResultSchema, CheckSchema
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, CacheFunctionsDep
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.check_logic import run_check_per_window_in_range
from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.monitor import Monitor
from deepchecks_monitoring.utils import DataFilterList, IdResponse, MonitorCheckConfSchema, exists_or_404, fetch_or_404

from .router import router


class MonitorCreationSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: str
    lookback: int
    dashboard_id: t.Optional[int]
    description: t.Optional[str]
    data_filters: t.Optional[DataFilterList]
    additional_kwargs: t.Optional[MonitorCheckConfSchema]


class MonitorSchema(BaseModel):
    """Schema for the monitor."""

    id: int
    name: str
    check: CheckSchema
    dashboard_id: t.Optional[int]
    lookback: int
    description: t.Optional[str] = None
    data_filters: t.Optional[DataFilterList] = None
    additional_kwargs: t.Optional[MonitorCheckConfSchema]
    alert_rules: t.List[AlertRuleSchema]

    class Config:
        """Config for Monitor schema."""

        orm_mode = True


class MonitorUpdateSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: t.Optional[str]
    lookback: t.Optional[int]
    description: t.Optional[str]
    data_filters: t.Optional[DataFilterList]
    dashboard_id: t.Optional[int]
    additional_kwargs: t.Optional[MonitorCheckConfSchema]


class MonitorRunSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    end_time: t.Optional[str]

    @validator("end_time", pre=True)
    def end_time_validate(cls, v):  # pylint: disable=no-self-argument
        """Validate end time with pendulum."""
        if v is not None:
            pdl.parse(v)
        return v


@router.post("/checks/{check_id}/monitors", response_model=IdResponse, tags=[Tags.MONITORS],
             summary="Create a new monitor.",
             description="Create a new monitor based on a check. This endpoint requires the "
                         "name, lookback, data_filter and description of the monitor.",)
async def create_monitor(
    check_id: int,
    body: MonitorCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create new monitor on a given check."""
    await exists_or_404(session, Check, id=check_id)
    monitor = Monitor(check_id=check_id, **body.dict(exclude_none=True))
    session.add(monitor)
    await session.flush()
    return {"id": monitor.id}


@router.get("/monitors/{monitor_id}", response_model=MonitorSchema, tags=[Tags.MONITORS])
async def get_monitor(
    monitor_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get monitor by id."""
    options = (joinedload(Monitor.check), joinedload(Monitor.alert_rules))
    query = await Monitor.filter_by(session, options=options, id=monitor_id)
    monitor = query.scalar()
    return MonitorSchema.from_orm(monitor)


@router.put("/monitors/{monitor_id}", tags=[Tags.MONITORS])
async def update_monitor(
    request: Request,
    monitor_id: int,
    body: MonitorUpdateSchema,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep
):
    """Update monitor by id."""
    await exists_or_404(session, Monitor, id=monitor_id)
    await Monitor.update(session, monitor_id, body.dict(exclude_none=True))
    cache_key_base = cache_funcs.get_key_base_by_request(request)
    cache_funcs.clear_monitor(cache_key_base, monitor_id)
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/monitors/{monitor_id}", tags=[Tags.MONITORS])
async def delete_monitor(
    request: Request,
    monitor_id: int,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep
):
    """Delete monitor by id."""
    await exists_or_404(session, Monitor, id=monitor_id)
    await Monitor.delete(session, monitor_id)
    cache_key_base = cache_funcs.get_key_base_by_request(request)
    cache_funcs.clear_monitor(cache_key_base, monitor_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post("/monitors/{monitor_id}/run", response_model=CheckResultSchema, tags=[Tags.MONITORS])
async def run_monitor_lookback(
    request: Request,
    monitor_id: int,
    body: MonitorRunSchema,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep
):
    """Run a monitor for each time window by lookback.

    Parameters
    ----------
    monitor_id : int
        ID of the monitor.
    body
    session : AsyncSession, optional
        SQLAlchemy session.
    cache_funcs

    Returns
    -------
    CheckSchema
        Created check.
    """
    monitor = await fetch_or_404(session, Monitor, id=monitor_id)

    if body.end_time:
        end_time = pdl.parse(body.end_time).set(minute=0, second=0, microsecond=0).add(hours=1)
    else:
        end_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0).add(hours=1)
    # get the time window size
    lookback_duration = pdl.duration(seconds=monitor.lookback)
    if lookback_duration < pdl.duration(days=2):
        window = pdl.duration(hours=1)
    elif lookback_duration < pdl.duration(days=8):
        window = pdl.duration(days=1)
    else:
        window = pdl.duration(weeks=1)

    cache_key_base = cache_funcs.get_key_base_by_request(request)

    return await run_check_per_window_in_range(
        monitor.check_id,
        end_time - lookback_duration,
        end_time,
        window,
        monitor.data_filters,
        session,
        monitor.additional_kwargs,
        monitor_id=monitor_id,
        cache_funcs=cache_funcs,
        cache_key_base=cache_key_base
    )
