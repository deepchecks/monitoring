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

from fastapi import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from starlette import status

from deepchecks_monitoring.api.v1.monitor import MonitorSchema
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.dashboard_logic import create_default_dashboard
from deepchecks_monitoring.models.dashboard import Dashboard
from deepchecks_monitoring.models.monitor import Monitor
from deepchecks_monitoring.utils import exists_or_404

from .router import router


class DashboardSchema(BaseModel):
    """Schema for the dashboard."""

    id: int
    name: t.Optional[str]
    monitors: t.List[MonitorSchema]

    class Config:
        """Config for Dashboard schema."""

        orm_mode = True


class DashboardUpdateSchema(BaseModel):
    """Schema defines the parameters for updating a dashboard."""

    name: str


@router.get('/dashboards/', response_model=DashboardSchema, tags=[Tags.MONITORS])
async def get_dashboard(session: AsyncSession = AsyncSessionDep):
    """Get dashboard by if exists, if not then create it. Add top 5 unassigned monitors to the dashboard if empty."""
    # get the dashboard or create it
    monitor_options = (joinedload(Monitor.check), selectinload(Monitor.alert_rules))
    dashboard_options = joinedload(Dashboard.monitors).options(*monitor_options)
    dashboard = (await session.execute(select(Dashboard).options(dashboard_options))).scalars().first()
    if dashboard is None:
        dashboard, monitors = await create_default_dashboard(monitor_options, session)
    else:
        monitors = dashboard.monitors
    monitors_schem = [MonitorSchema.from_orm(monitor) for monitor in monitors]
    return DashboardSchema(id=dashboard.id, name=dashboard.name, monitors=monitors_schem)


@router.put('/dashboards/{dashboard_id}', tags=[Tags.MONITORS])
async def update_dashboard(
        dashboard_id: int,
        body: DashboardUpdateSchema,
        session: AsyncSession = AsyncSessionDep
):
    """Update dashboard by id."""
    await exists_or_404(session, Dashboard, id=dashboard_id)
    await Dashboard.update(session, dashboard_id, body.dict(exclude_none=True))
    return Response(status_code=status.HTTP_200_OK)


@router.delete('/dashboards/{dashboard_id}', tags=[Tags.MONITORS])
async def delete_dashboard(
        dashboard_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Delete dashboard by id."""
    await exists_or_404(session, Dashboard, id=dashboard_id)
    await Dashboard.delete(session, dashboard_id)
    return Response(status_code=status.HTTP_200_OK)
