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

from fastapi import Response, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
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

    name: str
    repeat_every: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]


class AlertRuleSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    name: str
    monitor_id: int
    repeat_every: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertRuleInfoSchema(AlertRuleSchema):
    """Schema of alert rule info for display."""

    alerts_count: t.Optional[int]


class AlertRuleUpdateSchema(BaseModel):
    """Schema defines the parameters for updating alert rule."""

    name: t.Optional[str]
    repeat_every: t.Optional[int]
    alert_severity: t.Optional[AlertSeverity]
    condition: t.Optional[Condition]


@router.post("/monitors/{monitor_id}/alert-rules", response_model=IdResponse, tags=[Tags.ALERTS],
             summary="Create new alert rule on a given monitor.")
async def create_alert_rule(
    monitor_id: int,
    body: AlertRuleCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create new alert rule on a given check."""
    await exists_or_404(session, Monitor, id=monitor_id)
    alert = AlertRule(monitor_id=monitor_id, **body.dict(exclude_none=True))
    session.add(alert)
    await session.flush()
    return {"id": alert.id}


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


@router.get("/alert-rules/", response_model=t.List[AlertRuleInfoSchema], tags=[Tags.ALERTS])
@router.get("/monitors/{monitor_id}/alert-rules", response_model=t.List[AlertRuleInfoSchema], tags=[Tags.ALERTS])
async def get_alert_rules(
    monitor_id: int = None,
    session: AsyncSession = AsyncSessionDep
):
    """Return all the alert rules.

    Parameters
    ----------
    monitor_id : int
        ID of a monitor to filter alert rules by.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[AlertSchema]
        All the alerts for a given monitor.
    """
    select_alerts = select(AlertRule)
    if monitor_id is not None:
        await exists_or_404(session, Monitor, id=monitor_id)
        select_alerts = select_alerts.where(AlertRule.monitor_id == monitor_id)

    results = await session.execute(select_alerts)
    alert_rules_info = [AlertRuleInfoSchema.from_orm(res) for res in results.scalars().all()]
    ids = [ari.id for ari in alert_rules_info]
    alerts_count = await AlertRule.get_alerts_per_rule(session, ids)
    for ari in alert_rules_info:
        ari.alerts_count = alerts_count.get(ari.id, 0)

    return alert_rules_info


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
