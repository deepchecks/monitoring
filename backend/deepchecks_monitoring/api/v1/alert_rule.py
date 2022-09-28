# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the alert rules."""
import typing as t
from datetime import datetime

import pendulum as pdl
from fastapi import Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Alert, Check, Monitor
from deepchecks_monitoring.models.alert_rule import AlertRule, AlertSeverity, Condition
from deepchecks_monitoring.utils import IdResponse, exists_or_404, fetch_or_404

from .alert import AlertSchema
from .router import router


class AlertRuleCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert rule."""

    condition: Condition
    alert_severity: AlertSeverity = AlertSeverity.MID
    is_active: bool = True


class AlertRuleSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    monitor_id: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    is_active: bool

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertRuleInfoSchema(AlertRuleSchema):
    """Schema of alert rule info for display."""

    model_id: int
    alerts_count: int = 0
    max_end_time: pdl.DateTime


class AlertRuleUpdateSchema(BaseModel):
    """Schema defines the parameters for updating alert rule."""

    alert_severity: t.Optional[AlertSeverity]
    condition: t.Optional[Condition]
    is_active: t.Optional[bool]


@router.post(
    "/monitors/{monitor_id}/alert-rules",
    response_model=IdResponse,
    tags=[Tags.ALERTS],
    summary="Create new alert rule on a given monitor."
)
async def create_alert_rule(
    monitor_id: int,
    alert_rule: AlertRuleCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create new alert rule on a given check."""
    await exists_or_404(session, Monitor, id=monitor_id)

    stm = insert(AlertRule).values(
        monitor_id=monitor_id,
        **alert_rule.dict(exclude_none=True)
    ).returning(AlertRule.id)

    rule_id = (await session.execute(stm)).scalar_one()
    return {"id": rule_id}


@router.get("/alert-rules/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
@router.get("/models/{model_id}/alert-rules/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
async def count_alert_rules(
    model_id: t.Optional[int] = None,
    session: AsyncSession = AsyncSessionDep
):
    """Count alerts."""
    select_alert = select(AlertRule.alert_severity, func.count(AlertRule.alert_severity))
    if model_id:
        select_alert = select_alert.join(AlertRule.monitor).join(Monitor.check).where(Check.model_id == model_id)
    q = select_alert.group_by(AlertRule.alert_severity)
    results = await session.execute(q)
    total = results.all()
    return dict(total)


@router.get("/alert-rules", response_model=t.List[AlertRuleInfoSchema], tags=[Tags.ALERTS])
@router.get("/monitors/{monitor_id}/alert-rules", response_model=t.List[AlertRuleInfoSchema], tags=[Tags.ALERTS])
async def get_alert_rules(
    monitor_id: t.Optional[int] = None,
    start: t.Optional[datetime] = Query(default=None),
    end: t.Optional[datetime] = Query(default=None),
    models: t.List[int] = Query(default=[]),
    severity: t.List[AlertSeverity] = Query(default=[]),
    is_active: t.Optional[bool] = Query(default=None),
    sortby: t.List[t.Literal[
        "severity:asc",
        "severity:desc",
        "alert-window:asc",
        "alert-window:desc"
    ]] = Query(default=[]),
    session: AsyncSession = AsyncSessionDep
):
    """Return all the alert rules.

    Parameters
    ----------
    start
    end
    models
    severity
    sortby
    monitor_id : int
        ID of a monitor to filter alert rules by.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[AlertSchema]
        All the alerts for a given monitor.
    """
    alerts_info = (
        select(
            Alert.alert_rule_id.label("alert_rule_id"),
            func.count(Alert.id).label("alerts_count"),
            func.max(Alert.end_time).label("max_end_time")
        )
        .where(Alert.resolved.is_(False))
        .group_by(Alert.alert_rule_id)
    )

    if start is not None:
        alerts_info = alerts_info.where(Alert.start_time >= start)
    if end is not None:
        alerts_info = alerts_info.where(Alert.end_time <= end)

    alerts_info = alerts_info.subquery()

    severity_index = func.array_position(
        func.enum_range(AlertRule.alert_severity),
        AlertRule.alert_severity
    ).label("severity_index")

    q = (
        select(
            AlertRule.id,
            AlertRule.condition,
            AlertRule.alert_severity,
            AlertRule.monitor_id,
            AlertRule.is_active,
            Check.model_id,
            alerts_info.c.alerts_count,
            alerts_info.c.max_end_time,
            severity_index
        )
        .join(AlertRule.monitor)
        .join(Monitor.check)
        .join(Check.model)
        .join(alerts_info, alerts_info.c.alert_rule_id == AlertRule.id)
    )

    if monitor_id is not None:
        await exists_or_404(session, Monitor, id=monitor_id)
        q = q.where(AlertRule.monitor_id == monitor_id)

    if models:
        q = q.where(Check.model_id.in_(models))
    if severity:
        q = q.where(AlertRule.alert_severity.in_(severity))
    if is_active is not None:
        q = q.where(AlertRule.is_active.is_(is_active))

    # TODO:
    # refactor, need a better way of describing and applying sorting parameters
    # NOTE:
    # highest severities have a bigger index: LOW-1, MID-2, HIGH-3, CRITICAL-4
    if not sortby:
        q = q.order_by(severity_index.desc(), alerts_info.c.max_end_time.desc())
    else:
        if "severity:asc" in sortby:
            q = q.order_by(severity_index.asc())
        if "severity:desc" in sortby:
            q = q.order_by(severity_index.desc())
        if "alert-window:asc" in sortby:
            q = q.order_by(alerts_info.c.max_end_time.asc())
        if "alert-window:desc" in sortby:
            q = q.order_by(alerts_info.c.max_end_time.desc())

    results = (await session.execute(q)).all()
    results = [AlertRuleInfoSchema.from_orm(row) for row in results]
    return results


@router.get("/alert-rules/{alert_rule_id}", response_model=AlertRuleSchema, tags=[Tags.ALERTS])
async def get_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get alert by id."""
    alert = await fetch_or_404(session, AlertRule, id=alert_rule_id)
    return AlertRuleSchema.from_orm(alert)


@router.put("/alert-rules/{alert_rule_id}", tags=[Tags.ALERTS],
            summary="Update alert rule by id.")
async def update_alert(
    alert_rule_id: int,
    body: AlertRuleUpdateSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Update alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    # If toggling from inactive to active, then updating the latest_schedule value
    await AlertRule.update(session, alert_rule_id, body.dict(exclude_none=True))
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/alert-rules/{alert_rule_id}", tags=[Tags.ALERTS])
async def delete_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await AlertRule.delete(session, alert_rule_id)
    return Response(status_code=status.HTTP_200_OK)


@router.get("/alert-rules/{alert_rule_id}/alerts", response_model=t.List[AlertSchema], tags=[Tags.ALERTS])
async def get_alerts_of_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    query = await session.execute(select(Alert).where(Alert.alert_rule_id == alert_rule_id).order_by(Alert.start_time))
    return [AlertSchema.from_orm(a) for a in query.scalars().all()]


@router.post("/alert-rules/{alert_rule_id}/resolve-all", tags=[Tags.ALERTS])
async def resolve_all_alerts_of_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Resolve all alerts of alert rule."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await session.execute(update(Alert).where(Alert.alert_rule_id == alert_rule_id).values({Alert.resolved: True}))
    return Response(status_code=status.HTTP_200_OK)
