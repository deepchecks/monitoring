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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.selectable import Select

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Check
from deepchecks_monitoring.models.alert_rule import AlertRule, AlertSeverity, Condition
from deepchecks_monitoring.utils import DataFilterList, IdResponse, exists_or_404, fetch_or_404

from .router import router


class AlertRuleCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert rule."""

    name: str
    lookback: int
    repeat_every: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    description: t.Optional[str]
    data_filters: t.Optional[DataFilterList]


class AlertRuleSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    name: str
    check_id: int
    lookback: int
    repeat_every: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    description: t.Optional[str] = None
    data_filters: DataFilterList = None

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertRuleUpdateSchema(BaseModel):
    """Schema defines the parameters for updating alert rule."""

    name: t.Optional[str]
    lookback: t.Optional[int]
    repeat_every: t.Optional[int]
    alert_severity: t.Optional[AlertSeverity]
    condition: t.Optional[Condition]
    description: t.Optional[str]
    data_filters: t.Optional[DataFilterList]


@router.post("/checks/{check_id}/alert_rules", response_model=IdResponse, tags=[Tags.ALERTS],
             summary="Create new alert rule on a given check.",
             description="For creating a new alert rule, this endpoint requires the following parameters: "
                         "name, lookback, repeat_every, alert_rule, alert_severity, description, data_filter. "
                         "Returns the id of the created alert.")
async def create_alert_rule(
    check_id: int,
    body: AlertRuleCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create new alert rule on a given check."""
    await exists_or_404(session, Check, id=check_id)
    alert = AlertRule(check_id=check_id, **body.dict(exclude_none=True))
    session.add(alert)
    await session.flush()
    return {"id": alert.id}


@router.get("/alert_rules/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
@router.get("/models/{model_id}/alert_rules/count", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
async def count_alert_rules(
    model_id: t.Optional[int] = None,
    session: AsyncSession = AsyncSessionDep
):
    """Count alerts."""
    select_alert: Select = select(AlertRule.alert_severity, func.count(AlertRule.alert_severity))
    if model_id:
        select_alert = select_alert.join(AlertRule.check).where(Check.model_id == model_id)
    q = select_alert.group_by(AlertRule.alert_severity)
    results = await session.execute(q)
    total = results.all()
    return dict(total)


@router.get("/alert_rules/", response_model=t.List[AlertRuleSchema], tags=[Tags.ALERTS])
@router.get("/checks/{check_id}/alert_rules", response_model=t.List[AlertRuleSchema], tags=[Tags.ALERTS])
async def get_alert_rules(
    check_id: int = None,
    session: AsyncSession = AsyncSessionDep
) -> dict:
    """Return all the alert rules.

    Parameters
    ----------
    check_id : int
        ID of a check to filter alert rules by.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[AlertSchema]
        All the alerts for a given check.
    """
    select_alerts: Select = select(AlertRule)
    if check_id is not None:
        await exists_or_404(session, Check, id=check_id)
        select_alerts = select_alerts.where(AlertRule.check_id == check_id)
    results = await session.execute(select_alerts)
    return [AlertRuleSchema.from_orm(res) for res in results.scalars().all()]


@router.get("/alert_rules/{alert_rule_id}", response_model=AlertRuleSchema, tags=[Tags.ALERTS])
async def get_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Get alert by id."""
    alert = await fetch_or_404(session, AlertRule, id=alert_rule_id)
    return AlertRuleSchema.from_orm(alert)


@router.put("/alert_rules/{alert_rule_id}", tags=[Tags.ALERTS],
            summary="Update alert rule by id.",
            description="For updating an alert, this endpoint requires the following parameters: "
                        "name, lookback, repeat_every, alert_rule, alert_severity, description, data_filter. "
                        "Returns 200 if the alert was updated successfully.")
async def update_alert(
    alert_rule_id: int,
    body: AlertRuleUpdateSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Update alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await AlertRule.update(session, alert_rule_id, body.dict(exclude_none=True))
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/alert_rules/{alert_rule_id}", tags=[Tags.ALERTS])
async def delete_alert_rule(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Delete alert by id."""
    await exists_or_404(session, AlertRule, id=alert_rule_id)
    await AlertRule.delete(session, alert_rule_id)
    return Response(status_code=status.HTTP_200_OK)
