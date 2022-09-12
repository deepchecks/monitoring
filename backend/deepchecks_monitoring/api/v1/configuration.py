# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module with endpoints for the configuration screen."""
import typing as t

import pendulum as pdl
from fastapi import Query
from pydantic.main import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Alert, Check, Monitor
from deepchecks_monitoring.models.alert_rule import AlertRule, AlertSeverity

from .router import router


class AlertRuleConfigSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    name: str
    check_name: str
    repeat_every: int
    alert_severity: t.Optional[AlertSeverity]
    total_alerts: int
    non_resolved_alerts: int
    recent_alert: pdl.DateTime

    class Config:
        """Config for Alert schema."""

        orm_mode = True


@router.get("/config/alert-rules", response_model=t.List[AlertRuleConfigSchema], tags=[Tags.CONFIG])
async def get_all_alert_rules(
    models: t.List[int] = Query(default=[]),
    severity: t.List[AlertSeverity] = Query(default=[]),
    sortby: t.List[t.Literal[
        "severity:asc",
        "severity:desc",
    ]] = Query(default=[]),
    session: AsyncSession = AsyncSessionDep
):
    """Return all alert rules for the configuration screen.

    Parameters
    ----------
    models : list, optional
        The list of models to filter by.
    severity : list, optional
        The list of severities to filter by.
    sortby : list, optional
        The list of columns to sort by.
    session : AsyncSession, optional
        The database connection.

    Returns
    -------
    list
        The list of alert rules.
    """
    non_resolved_alerts_count = (
        select(
            Alert.alert_rule_id.label("alert_rule_id"),
            func.count(Alert.id).label("non_resolved_alerts"),
        )
        .where(Alert.resolved.is_(False))
        .group_by(Alert.alert_rule_id)
    )

    non_resolved_alerts_count = non_resolved_alerts_count.subquery()

    total_count = (
        select(
            Alert.alert_rule_id.label("alert_rule_id"),
            func.count(Alert.id).label("total_alerts"),
            func.max(Alert.end_time).label("recent_alert")
        )
        .group_by(Alert.alert_rule_id)
    )

    total_count = total_count.subquery()

    severity_index = func.array_position(
        func.enum_range(AlertRule.alert_severity),
        AlertRule.alert_severity
    ).label("severity_index")

    q = (
        select(
            AlertRule.id,
            AlertRule.name,
            AlertRule.alert_severity,
            AlertRule.repeat_every,
            Check.name.label("check_name"),
            non_resolved_alerts_count.c.non_resolved_alerts,
            total_count.c.total_alerts,
            total_count.c.recent_alert,
            severity_index
        )
        .join(AlertRule.monitor)
        .join(Monitor.check)
        .join(Check.model)
        .join(non_resolved_alerts_count, non_resolved_alerts_count.c.alert_rule_id == AlertRule.id)
        .join(total_count, total_count.c.alert_rule_id == AlertRule.id)
    )

    if models:
        q = q.where(Check.model_id.in_(models))
    if severity:
        q = q.where(AlertRule.alert_severity.in_(severity))

    # TODO:
    # refactor, need a better way of describing and applying sorting parameters
    # NOTE:
    # highest severities have a bigger index: LOW-1, MID-2, HIGH-3, CRITICAL-4
    if not sortby:
        q = q.order_by(severity_index.desc(), total_count.c.recent_alert.desc())
    else:
        if "severity:asc" in sortby:
            q = q.order_by(severity_index.asc())
        if "severity:desc" in sortby:
            q = q.order_by(severity_index.desc())
        if "alert-window:asc" in sortby:
            q = q.order_by(total_count.c.recent_alert.asc())
        if "alert-window:desc" in sortby:
            q = q.order_by(total_count.c.recent_alert.desc())

    results = (await session.execute(q)).all()
    results = [AlertRuleConfigSchema.from_orm(row) for row in results]
    return results
