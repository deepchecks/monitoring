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

from fastapi import Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.alert import Alert, AlertRule, AlertSeverity
from deepchecks_monitoring.utils import DataFilter, IdResponse, exists_or_404, fetch_or_404

from ...config import Tags
from .router import router


class AlertCheckOptions(BaseModel):
    """Alert check schema."""

    end_time: str
    grace_period: t.Optional[bool] = True


class AlertCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert."""

    name: str
    lookback: int
    repeat_every: int
    alert_rule: AlertRule
    alert_severity: t.Optional[AlertSeverity]
    description: t.Optional[str]
    data_filter: t.Optional[DataFilter]


class AlertSchema(BaseModel):
    """Schema for the alert."""

    id: int
    name: str
    check_id: int
    lookback: int
    repeat_every: int
    alert_rule: AlertRule
    alert_severity: t.Optional[AlertSeverity]
    description: t.Optional[str] = None
    data_filter: DataFilter = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertUpdateSchema(BaseModel):
    """Schema defines the parameters for updating alert."""

    name: t.Optional[str]
    lookback: t.Optional[int]
    repeat_every: t.Optional[int]
    alert_severity: t.Optional[AlertSeverity]
    alert_rule: t.Optional[AlertRule]
    description: t.Optional[str]
    data_filter: t.Optional[DataFilter]


@router.post("/checks/{check_id}/alerts", response_model=IdResponse, tags=[Tags.ALERTS],
             summary="Create new alert on a given check.",
             description="For creating a new alert, this endpoint requires the following parameters: "
                         "name, lookback, repeat_every, alert_rule, alert_severity, description, data_filter. "
                         "Returns the id of the created alert.")
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


@router.get("/alerts/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
@router.get("/models/{model_id}/alerts/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
async def count_alerts(
    model_id: t.Optional[int] = None,
    session: AsyncSession = AsyncSessionDep
):
    """Count alerts."""
    select_alert: Select = select(Alert.alert_severity, func.count(Alert.alert_severity))
    if model_id:
        select_alert = select_alert.join(Alert.check).where(Check.model_id == model_id)
    q = select_alert.group_by(Alert.alert_severity)
    results = await session.execute(q)
    total = results.all()
    return dict(total)


@router.get("/alerts/", response_model=t.List[AlertSchema], tags=[Tags.ALERTS])
@router.get("/checks/{check_id}/alerts", response_model=t.List[AlertSchema], tags=[Tags.ALERTS])
async def get_alerts(
    check_id: int = None,
    session: AsyncSession = AsyncSessionDep
) -> dict:
    """Return all the alerts for a given check.

    Parameters
    ----------
    check_id : int
        ID of the check.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[AlertSchema]
        All the alerts for a given check.
    """
    select_alerts: Select = select(Alert)
    if check_id is not None:
        await exists_or_404(session, Check, id=check_id)
        select_alerts = select_alerts.where(Alert.check_id == check_id)
    results = await session.execute(select_alerts)
    return [AlertSchema.from_orm(res) for res in results.scalars().all()]


@router.get("/alerts/{alert_id}", response_model=AlertSchema, tags=[Tags.ALERTS])
async def get_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get alert by id."""
    alert = await fetch_or_404(session, Alert, id=alert_id)
    return AlertSchema.from_orm(alert)


@router.put("/alerts/{alert_id}", tags=[Tags.ALERTS],
            summary="Update alert by id.",
            description="For updating an alert, this endpoint requires the following parameters: "
                        "name, lookback, repeat_every, alert_rule, alert_severity, description, data_filter. "
                        "Returns 200 if the alert was updated successfully.")
async def update_alert(
    alert_id: int,
    body: AlertUpdateSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Update alert by id."""
    await exists_or_404(session, Alert, id=alert_id)
    await Alert.update(session, alert_id, body.dict(exclude_none=True))
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/alerts/{alert_id}", tags=[Tags.ALERTS])
async def delete_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete alert by id."""
    await exists_or_404(session, Alert, id=alert_id)
    await Alert.delete(session, alert_id)
    return Response(status_code=status.HTTP_200_OK)
