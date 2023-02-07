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
import sqlalchemy as sa
from fastapi import Depends, Response, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy.cimmutabledict import immutabledict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.api.v1.alert_rule import AlertRuleSchema
from deepchecks_monitoring.api.v1.check import CheckResultSchema, CheckSchema
from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, CacheFunctionsDep, HostDep
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.check_logic import CheckNotebookSchema, MonitorOptions, run_check_per_window_in_range
from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
from deepchecks_monitoring.monitoring_utils import (DataFilterList, ExtendedAsyncSession, IdResponse,
                                                    MonitorCheckConfSchema, exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import Alert, AlertRule, Check
from deepchecks_monitoring.schema_models.monitor import NUM_WINDOWS_TO_START, Monitor
from deepchecks_monitoring.utils.auth import CurrentActiveUser
from deepchecks_monitoring.utils.notebook_util import get_check_notebook

from .router import router


class MonitorCreationSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: str = Field(max_length=field_length(Monitor.name))
    lookback: int = Field(ge=0)
    aggregation_window: int = Field(ge=0)
    frequency: int = Field(ge=0)
    dashboard_id: t.Optional[int]
    description: t.Optional[str] = Field(max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = Field(nullable=True)
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = Field(nullable=True)


class MonitorSchema(BaseModel):
    """Schema for the monitor."""

    id: int
    name: str = Field(max_length=field_length(Monitor.name))
    check: CheckSchema
    dashboard_id: t.Optional[int]
    lookback: int
    aggregation_window: int
    description: t.Optional[str] = Field(default=None, max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = None
    additional_kwargs: t.Optional[MonitorCheckConfSchema]
    alert_rules: t.List[AlertRuleSchema]
    frequency: int

    class Config:
        """Config for Monitor schema."""

        orm_mode = True


class MonitorUpdateSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: t.Optional[str] = Field(max_length=field_length(Monitor.name))
    lookback: t.Optional[int]
    description: t.Optional[str] = Field(max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = Field(nullable=True)
    dashboard_id: t.Optional[int]
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = Field(nullable=True)
    frequency: t.Optional[int]
    aggregation_window: t.Optional[int]


class MonitorRunSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    end_time: t.Optional[str]

    @validator("end_time", pre=True)
    def end_time_validate(cls, v):  # pylint: disable=no-self-argument
        """Validate end time with pendulum."""
        if v is not None:
            pdl.parse(v)
        return v


class MonitorNotebookSchema(BaseModel):
    """Schema to get a monitor script/notebook."""

    end_time: str
    start_time: str
    model_version_id: t.Optional[int] = None
    as_script: t.Optional[bool] = False


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
    session: ExtendedAsyncSession = AsyncSessionDep
):
    """Get monitor by id."""
    moonitor = await session.fetchone_or_404(
        sa.select(Monitor)
        .where(Monitor.id == monitor_id)
        .options(joinedload(Monitor.check), joinedload(Monitor.alert_rules)),
        message=f"'Monitor' with next set of arguments does not exist: id={monitor_id}"
    )
    return MonitorSchema.from_orm(moonitor)


@router.put("/monitors/{monitor_id}", tags=[Tags.MONITORS])
async def update_monitor(
    monitor_id: int,
    body: MonitorUpdateSchema,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep,
    user: User = Depends(CurrentActiveUser())
):
    """Update monitor by id."""
    options = joinedload(Monitor.check).load_only(Check.id).joinedload(Check.model)
    monitor: Monitor = await fetch_or_404(session, Monitor, id=monitor_id, options=options)
    model = monitor.check.model
    # Remove from body all the fields which hasn't changed
    update_dict = {k: v for k, v in body.dict(exclude_unset=True).items() if v != getattr(monitor, k)}

    # If nothing changed returns
    if not update_dict:
        return Response(status_code=status.HTTP_200_OK)

    fields_require_alerts_recalc = ["frequency", "aggregation_window", "additional_kwargs", "data_filters"]

    # If still no data, the monitor would not have run yet anyway so no need to update schedule/remove tasks.
    if model.has_data() and any(key in update_dict for key in fields_require_alerts_recalc):
        frequency = update_dict.get("frequency", monitor.frequency)
        # Either continue from the latest schedule if it's early enough or take it back number of windows to start
        new_schedule_time = min(pdl.instance(model.end_time).subtract(seconds=frequency * NUM_WINDOWS_TO_START),
                                pdl.instance(monitor.latest_schedule))
        new_schedule_time = floor_window_for_time(new_schedule_time, frequency)
        update_dict["latest_schedule"] = new_schedule_time
        # Delete monitor tasks
        await Task.delete_monitor_tasks(monitor.id, update_dict["latest_schedule"], session)
        # Resolving all alerts which are connected to this monitor
        alert_rules_select = sa.select(AlertRule.id).where(AlertRule.monitor_id == monitor_id)
        await session.execute(sa.update(Alert).where(Alert.alert_rule_id.in_(alert_rules_select))
                              .values({Alert.resolved: True}),
                              execution_options=immutabledict({"synchronize_session": False}))
        # Reset the alert rules start time - it will be updated when the monitor will run again
        await session.execute(sa.update(AlertRule).where(AlertRule.monitor_id == monitor_id)
                              .values({AlertRule.start_time: None}))
        # Delete cache
        cache_funcs.clear_monitor_cache(user.organization_id, monitor_id)

    await Monitor.update(session, monitor_id, update_dict)
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/monitors/{monitor_id}", tags=[Tags.MONITORS])
async def delete_monitor(
    monitor_id: int,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep,
    user: User = Depends(CurrentActiveUser())
):
    """Delete monitor by id."""
    await exists_or_404(session, Monitor, id=monitor_id)
    await Monitor.delete(session, monitor_id)
    cache_funcs.clear_monitor_cache(user.organization_id, monitor_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post("/monitors/{monitor_id}/get-notebook", tags=[Tags.MONITORS], response_class=PlainTextResponse)
async def get_notebook(
        monitor_id: int,
        notebook_options: MonitorNotebookSchema,
        session: AsyncSession = AsyncSessionDep,
        host: str = HostDep,
):
    """Run a check on a specified model version and returns a Jupyter notebook with the code to run the check.

    Parameters
    ----------
    monitor_id : int
        The id of the monitor to create a notebook to.
    notebook_options : MonitorNotebookSchema
        The options for the notebook.
    session : AsyncSession, default: AsyncSessionDep
        The database session to use.
    host : str, default: HostDep
        The host of the DeepChecks server.

    Returns
    -------
    PlainTextResponse
        A response containing the Jupyter notebook.
    """
    monitor: Monitor = await fetch_or_404(session, Monitor, id=monitor_id)
    check_notebook_options = CheckNotebookSchema(filter=monitor.data_filters,
                                                 end_time=notebook_options.end_time,
                                                 start_time=notebook_options.start_time,
                                                 additional_kwargs=monitor.additional_kwargs,
                                                 model_version_id=notebook_options.model_version_id,
                                                 as_script=notebook_options.as_script)
    return await get_check_notebook(monitor.check_id, check_notebook_options, session, host)


@router.post("/monitors/{monitor_id}/run", response_model=CheckResultSchema, tags=[Tags.MONITORS])
async def run_monitor_lookback(
    monitor_id: int,
    body: MonitorRunSchema,
    session: AsyncSession = AsyncSessionDep,
    cache_funcs: CacheFunctions = CacheFunctionsDep,
    user: User = Depends(CurrentActiveUser())
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
    user

    Returns
    -------
    CheckResultSchema
        Check run result.
    """
    monitor: Monitor = await fetch_or_404(session, Monitor, id=monitor_id)
    end_time = pdl.parse(body.end_time) if body.end_time else pdl.now()
    start_time = end_time.subtract(seconds=monitor.lookback)

    options = MonitorOptions(start_time=start_time.to_iso8601_string(),
                             end_time=end_time.to_iso8601_string(),
                             frequency=monitor.frequency,
                             aggregation_window=monitor.aggregation_window,
                             additional_kwargs=monitor.additional_kwargs,
                             filter=monitor.data_filters)

    return await run_check_per_window_in_range(
        monitor.check_id,
        session,
        options,
        monitor_id=monitor_id,
        cache_funcs=cache_funcs,
        organization_id=user.organization_id
    )
