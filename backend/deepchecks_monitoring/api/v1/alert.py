# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the alerts."""
import typing as t

import pendulum as pdl
from fastapi import Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import false, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, AlertRule, AlertSeverity, Check, Model, ModelMember, Monitor
from deepchecks_monitoring.utils import auth

from .router import router


class AlertCreationSchema(BaseModel):
    """Schema for the alert creation."""

    alert_rule_id: int
    failed_values: t.Dict[str, t.Dict[str, float]]
    start_time: pdl.DateTime
    end_time: pdl.DateTime
    resolved: bool

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class AlertSchema(AlertCreationSchema):
    """Schema for the alert."""

    id: int
    created_at: pdl.DateTime


@router.get("/alerts/count_active", response_model=t.Dict[AlertSeverity, int], tags=[Tags.ALERTS])
async def count_alerts(
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.CurrentUser()),
    resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Count alerts."""
    select_alert = (select(AlertRule.alert_severity, func.count())
                    .join(Alert.alert_rule)
                    .join(AlertRule.monitor)
                    .join(Monitor.check)
                    .join(Check.model)
                    .where(Alert.resolved == false()))
    if resources_provider.get_features_control(user).model_assignment:
        select_alert = select_alert.join(Model.members).where(ModelMember.user_id == user.id)
    select_alert = select_alert.group_by(AlertRule.alert_severity)
    results = await session.execute(select_alert)
    total = results.all()
    return dict(total)


@router.post("/alerts/{alert_id}/resolve", tags=[Tags.ALERTS])
async def resolve_alert(
        alert_id: int,
        session: AsyncSession = AsyncSessionDep,
        alert: Alert = Depends(Alert.get_object_from_http_request)  # pylint: disable=unused-argument
):
    """Resolve alert by id."""
    await Alert.update(session, alert_id, {Alert.resolved: True})
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/alerts/{alert_id}/reactivate",
    tags=[Tags.ALERTS],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(Alert.get_object_from_http_request)],
    description="Reactivate resolved alert."
)
async def reactivate_alert(
    alert_id: int,
    session: AsyncSession = AsyncSessionDep,
):
    """Reactivate resolved alert."""
    await session.execute(update(Alert).where(Alert.id == alert_id).values(resolved=False))


@router.get("/alerts/{alert_id}", response_model=AlertSchema, tags=[Tags.ALERTS])
async def get_alert(
        alert_id: int,  # pylint: disable=unused-argument
        alert: Alert = Depends(Alert.get_object_from_http_request)
):
    """Get alert by id."""
    return AlertSchema.from_orm(alert)


@router.delete("/alerts/{alert_id}", tags=[Tags.ALERTS])
async def delete_alert(
        alert_id: int,  # pylint: disable=unused-argument
        session: AsyncSession = AsyncSessionDep,
        alert: Alert = Depends(Alert.get_object_from_http_request)
):
    """Delete alert by id."""
    await session.delete(alert)
    return Response(status_code=status.HTTP_200_OK)
