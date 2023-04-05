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
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.api.v1.alert_rule import AlertRuleSchema
from deepchecks_monitoring.api.v1.check import CheckResultSchema, CheckSchema
from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.config import Settings, Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, CacheFunctionsDep, ResourcesProviderDep, SettingsDep
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.check_logic import CheckNotebookSchema, MonitorOptions, run_check_per_window_in_range
from deepchecks_monitoring.monitoring_utils import (DataFilterList, ExtendedAsyncSession, IdResponse,
                                                    MonitorCheckConfSchema, exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, AlertRule, Check
from deepchecks_monitoring.schema_models.monitor import NUM_WINDOWS_TO_START, Frequency, Monitor, round_off_datetime
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.auth import CurrentActiveUser
from deepchecks_monitoring.utils.notebook_util import get_check_notebook
from deepchecks_monitoring.utils.typing import as_datetime

from .router import router


class MonitorCreationSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: str = Field(max_length=field_length(Monitor.name))
    lookback: int = Field(ge=0)
    aggregation_window: int = Field(ge=0)
    frequency: Frequency
    dashboard_id: t.Optional[int] = Field(nullable=True)
    description: t.Optional[str] = Field(max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = Field(nullable=True)
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = Field(nullable=True)


class MonitorSchema(BaseModel):
    """Schema for the monitor."""

    id: int
    name: str = Field(max_length=field_length(Monitor.name))
    check: CheckSchema
    dashboard_id: t.Optional[int] = Field(nullable=True)
    lookback: int
    aggregation_window: int
    description: t.Optional[str] = Field(default=None, max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = None
    additional_kwargs: t.Optional[MonitorCheckConfSchema]
    alert_rules: t.List[AlertRuleSchema]
    frequency: Frequency

    class Config:
        """Config for Monitor schema."""

        orm_mode = True


class MonitorUpdateSchema(BaseModel):
    """Schema defines the parameters for creating new monitor."""

    name: t.Optional[str] = Field(max_length=field_length(Monitor.name))
    lookback: t.Optional[int]
    description: t.Optional[str] = Field(max_length=field_length(Monitor.description))
    data_filters: t.Optional[DataFilterList] = Field(nullable=True)
    dashboard_id: t.Optional[int] = Field(nullable=True)
    additional_kwargs: t.Optional[MonitorCheckConfSchema] = Field(nullable=True)
    frequency: t.Optional[Frequency]
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
                         "name, lookback, data_filter and description of the monitor.", )
async def create_monitor(
        check_id: int,
        body: MonitorCreationSchema,
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Create new monitor on a given check."""
    await exists_or_404(session, Check, id=check_id)
    updated_body = body.dict(exclude_unset=True).copy()
    updated_body["updated_by"] = user.id
    updated_body["created_by"] = user.id
    monitor = Monitor(check_id=check_id, **updated_body)
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
    monitor = await fetch_or_404(session, Monitor, id=monitor_id, options=options)
    model = monitor.check.model

    # Remove from body all the fields which hasn't changed
    update_dict = {
        k: v
        for k, v in body.dict(exclude_unset=True).items()
        if v != getattr(monitor, k)
    }

    # If nothing changed returns
    if not update_dict:
        return Response(status_code=status.HTTP_200_OK)

    fields_require_alerts_recalc = ["frequency", "aggregation_window", "additional_kwargs", "data_filters"]

    # If still no data, the monitor would not have run yet anyway so no need to update schedule/remove tasks.
    if model.has_data() and any(key in update_dict for key in fields_require_alerts_recalc):
        frequency = update_dict.get("frequency", monitor.frequency)
        model_end_time = pdl.instance(as_datetime(model.end_time))
        model_start_time = pdl.instance(as_datetime(model.start_time))
        latest_schedule = pdl.instance(as_datetime(monitor.latest_schedule))

        # Either continue from the latest schedule if it's early enough or take it back number of windows to start
        update_dict["latest_schedule"] = round_off_datetime(
            value=max(
                model_start_time,
                min(
                    model_end_time - (frequency.to_pendulum_duration() * NUM_WINDOWS_TO_START),
                    latest_schedule
                )
            ).in_tz(model.timezone),
            frequency=frequency
        )

        # Delete monitor tasks
        await Task.delete_monitor_tasks(monitor.id, update_dict["latest_schedule"], session)

        # Resolving all alerts which are connected to this monitor
        await session.execute(
            sa.update(Alert)
            .where(Alert.alert_rule_id.in_(
                sa.select(AlertRule.id)
                .where(AlertRule.monitor_id == monitor_id)
                .subquery()
            ))
            .values({Alert.resolved: True}),
            execution_options={"synchronize_session": False}
        )

        # Reset the alert rules start time - it will be updated when the monitor will run again
        await session.execute(
            sa.update(AlertRule)
            .where(AlertRule.monitor_id == monitor_id)
            .values({AlertRule.start_time: None})
        )

        # Delete cache
        cache_funcs.clear_monitor_cache(user.organization_id, monitor_id)
    update_dict["updated_by"] = user.id
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
        settings: Settings = SettingsDep,
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
    settings : Settings, default: SettingsDep

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
    return await get_check_notebook(monitor.check_id, check_notebook_options, session, settings.deployment_url)


@router.post("/monitors/{monitor_id}/run", response_model=CheckResultSchema, tags=[Tags.MONITORS])
async def run_monitor_lookback(
        monitor_id: int,
        body: MonitorRunSchema,
        session: AsyncSession = AsyncSessionDep,
        cache_funcs: CacheFunctions = CacheFunctionsDep,
        user: User = Depends(CurrentActiveUser()),
        resources_provider: ResourcesProvider = ResourcesProviderDep,
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
    resources_provider: ResourcesProvider
        Resources provider.

    Returns
    -------
    CheckResultSchema
        Check run result.
    """
    monitor = await fetch_or_404(session, Monitor, id=monitor_id)
    end_time = pdl.parse(body.end_time) if body.end_time else pdl.now()
    start_time = end_time.subtract(seconds=monitor.lookback)

    options = MonitorOptions(
        start_time=start_time.to_iso8601_string(),
        end_time=end_time.to_iso8601_string(),
        frequency=monitor.frequency,
        aggregation_window=monitor.aggregation_window,
        additional_kwargs=monitor.additional_kwargs,
        filter=monitor.data_filters
    )
    return await run_check_per_window_in_range(
        monitor.check_id,
        session,
        options,
        monitor_id=monitor_id,
        cache_funcs=cache_funcs,
        organization_id=user.organization_id,
        parallel=resources_provider.settings.is_cloud,
    )
