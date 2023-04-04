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
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, Check, Monitor
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, AlertSeverity, Condition
from deepchecks_monitoring.schema_models.monitor import Frequency

from .global_api.users import UserSchema
from .router import router


class AlertRuleConfigSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    name: str
    check_name: str
    frequency: Frequency
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    total_alerts: t.Optional[int] = 0
    non_resolved_alerts: t.Optional[int] = 0
    recent_alert: t.Optional[pdl.DateTime]
    user: t.Optional[UserSchema] = None

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
    severity_index = AlertRule.alert_severity_index.label("severity_index")

    q = (
        select(
            AlertRule.id,
            AlertRule.created_by,
            AlertRule.condition,
            Monitor.name,
            AlertRule.alert_severity,
            Monitor.frequency,
            Check.name.label("check_name"),
            non_resolved_alerts_count.c.non_resolved_alerts,
            total_count.c.total_alerts,
            total_count.c.recent_alert,
            severity_index
        )
        .join(AlertRule.monitor)
        .join(Monitor.check)
        .join(Check.model)
        .outerjoin(non_resolved_alerts_count, non_resolved_alerts_count.c.alert_rule_id == AlertRule.id)
        .outerjoin(total_count, total_count.c.alert_rule_id == AlertRule.id)
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

    alert_rules_rows = (await session.execute(q)).all()
    alert_rule_schemas = []
    for row in alert_rules_rows:
        alert_rule_schema = AlertRuleConfigSchema.from_orm(row)
        if row.created_by != 0:
            q = select(User).where(User.id == row.created_by)
            user = (await session.execute(q)).scalars().first()
            if user is not None:
                user_schema = UserSchema.from_orm(user)
                alert_rule_schema.user = user_schema
        alert_rule_schemas.append(alert_rule_schema)
    return alert_rule_schemas


@router.get("/configurations")
async def application_configurations(resource_provider: ResourcesProvider = ResourcesProviderDep):
    """Return the application configurations for the client."""
    return resource_provider.get_client_configuration()
