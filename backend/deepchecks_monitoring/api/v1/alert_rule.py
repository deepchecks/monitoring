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

from fastapi import Depends, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.monitoring_utils import IdResponse, exists_or_404, fetch_or_404
from deepchecks_monitoring.schema_models import Alert, Check, ModelVersion, Monitor
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, AlertSeverity, Condition
from deepchecks_monitoring.utils import auth

from ...public_models import User
from .alert import AlertSchema
from .router import router


class AlertRuleCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert rule."""

    condition: Condition
    alert_severity: AlertSeverity = AlertSeverity.MEDIUM
    is_active: bool = True


class AlertRuleSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    monitor_id: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    is_active: bool
    start_time: t.Optional[datetime]

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertRuleInfoSchema(AlertRuleSchema):
    """Schema of alert rule info for display."""

    model_id: int
    alerts_count: int = 0
    max_end_time: t.Optional[datetime] = None
    start_time: t.Optional[datetime] = None


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
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Create new alert rule on a given check."""
    await exists_or_404(session, Monitor, id=monitor_id)

    stm = insert(AlertRule).values(
        monitor_id=monitor_id,
        created_by=user.id,
        updated_by=user.id,
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
        resolved: t.Optional[bool] = Query(default=None),
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
    alerts_info = select(
        Alert.alert_rule_id.label("alert_rule_id"),
        func.count(Alert.id).label("alerts_count"),
        func.max(Alert.end_time).label("max_end_time")
    )
    if resolved is not None:
        alerts_info = alerts_info.where(Alert.resolved.is_(resolved))
    alerts_info = alerts_info.group_by(Alert.alert_rule_id)

    if start is not None:
        alerts_info = alerts_info.where(Alert.start_time >= start)
    if end is not None:
        alerts_info = alerts_info.where(Alert.end_time <= end)

    alerts_info = alerts_info.subquery()
    severity_index = AlertRule.alert_severity_index.label("severity_index")

    q = (
        select(
            AlertRule.id,
            AlertRule.condition,
            AlertRule.alert_severity,
            AlertRule.monitor_id,
            AlertRule.is_active,
            AlertRule.start_time,
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
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Update alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    updated_body = body.dict(exclude_unset=True).copy()
    updated_body["updated_by"] = user.id
    # If toggling from inactive to active, then updating the latest_schedule value
    await AlertRule.update(session, alert_rule_id, updated_body)
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
        resolved: t.Optional[bool] = None,
        session: AsyncSession = AsyncSessionDep
):
    """Get list of alerts raised by a given alert rule."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    query = select(Alert).where(Alert.alert_rule_id == alert_rule_id)
    if resolved is not None:
        query = query.where(Alert.resolved.is_(resolved))
    query = await session.execute(query.order_by(Alert.start_time))
    alerts = [AlertSchema.from_orm(a) for a in query.scalars().all()]
    model_versions = (await session.execute(select(ModelVersion.id, ModelVersion.name))).all()
    model_versions_dict = {str(model_version.id): model_version.name for model_version in model_versions}
    for alert in alerts:
        for model_version_id, val in list(alert.failed_values.items()):
            if model_versions_dict.get(model_version_id):
                del alert.failed_values[model_version_id]
                alert.failed_values[model_versions_dict[model_version_id]] = val
    return alerts


@router.post("/alert-rules/{alert_rule_id}/resolve-all", tags=[Tags.ALERTS])
async def resolve_all_alerts_of_alert_rule(
        alert_rule_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Resolve all alerts of alert rule."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await session.execute(update(Alert).where(Alert.alert_rule_id == alert_rule_id).values({Alert.resolved: True}))
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/alert-rules/{alert_rule_id}/alerts/reactivate-resolved",
    tags=[Tags.ALERTS],
    status_code=status.HTTP_200_OK,
    description="Reactivate all resolved alerts"
)
async def reactivate_resolved_alerts(
        alert_rule_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Reactivate all resolved alerts."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await session.execute(update(Alert).where(Alert.alert_rule_id == alert_rule_id).values(resolved=False))
