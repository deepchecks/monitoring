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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.alert import Alert, AlertRule
from deepchecks_monitoring.utils import CountResponse, DataFilter, IdResponse, exists_or_404, fetch_or_404

from .router import router


class AlertCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert."""

    name: str
    lookback: int
    alert_rule: AlertRule
    description: t.Optional[str]
    data_filter: t.Optional[DataFilter]


class AlertSchema(BaseModel):
    """Schema for the alert."""

    id: int
    name: str
    check_id: int
    lookback: int
    alert_rule: AlertRule
    description: t.Optional[str] = None
    data_filter: DataFilter = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertUpdateSchema(BaseModel):
    """Schema defines the parameters for creating new alert."""

    name: t.Optional[str]
    lookback: t.Optional[str]
    alert_rule: t.Optional[AlertRule]
    description: t.Optional[str]
    data_filter: t.Optional[DataFilter]


@router.post("/checks/{check_id}/alerts", response_model=IdResponse)
async def create_alert(
    check_id: int,
    body: AlertCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create new alert on a given check."""
    await exists_or_404(session, Check, id=check_id)
    alert = Alert(check_id=check_id, **body.dict(exclude_none=True))
    session.add(alert)
    await session.flush()
    return {"id": alert.id}


@router.get("/alerts/count", response_model=CountResponse)
@router.get("/models/{model_id}/alerts/count", response_model=CountResponse)
async def count_alerts(
    model_id: t.Optional[int] = None,
    session: AsyncSession = AsyncSessionDep
):
    """Count alerts."""
    select_alert = select(Alert)
    if model_id:
        select_alert = select_alert.join(Alert.check).where(Check.model_id == model_id)
    results = await session.execute(select(func.count()).select_from(select_alert))
    total = results.scalars().one()

    return {"count": total}


@router.get("/alerts/{alert_id}", response_model=AlertSchema)
async def get_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get alert by id."""
    alert = await fetch_or_404(session, Alert, id=alert_id)
    return AlertSchema.from_orm(alert)


@router.put("/alerts/{alert_id}")
async def update_alert(
    alert_id: int,
    body: AlertUpdateSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Update alert by id."""
    await exists_or_404(session, Alert, id=alert_id)
    await Alert.update(session, alert_id, body.dict(exclude_none=True))
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete alert by id."""
    await exists_or_404(session, Alert, id=alert_id)
    await Alert.delete(session, alert_id)
    return Response(status_code=status.HTTP_200_OK)
