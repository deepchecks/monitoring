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
from deepchecks_monitoring.schema_models.data_ingestion_alert import DataIngestionAlert
from deepchecks_monitoring.schema_models.data_ingestion_alert_rule import DataIngestionAlertRule
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.schema_models.model_memeber import ModelMember
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.alerts import AlertSeverity

from .router import router


class DataIngestionAlertSchema(BaseModel):
    """Schema for the alert."""

    id: int
    created_at: pdl.DateTime
    alert_rule_id: int
    value: float
    start_time: pdl.DateTime
    end_time: pdl.DateTime
    resolved: bool

    class Config:
        """Config for Alert schema."""

        orm_mode = True


@router.get("/data-ingestion-alerts/count_active",
            response_model=t.Dict[AlertSeverity, int], tags=[Tags.DATA_ALERTS])
async def count_alerts(
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.CurrentUser()),
    resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Count alerts."""
    q = (select(DataIngestionAlertRule.alert_severity, func.count())
         .join(DataIngestionAlert.alert_rule)
         .join(DataIngestionAlertRule.model)
         .where(DataIngestionAlert.resolved == false()))
    if resources_provider.get_features_control(user).model_assignment:
        q = q.join(Model.members).where(ModelMember.user_id == user.id)
    q = q.group_by(DataIngestionAlertRule.alert_severity)
    results = await session.execute(q)
    total = results.all()
    return dict(total)


@router.post("/data-ingestion-alerts/{data_ingestion_alert_id}/resolve",
             dependencies=[Depends(DataIngestionAlert.get_object_from_http_request)],
             tags=[Tags.DATA_ALERTS])
async def resolve_alert(
        data_ingestion_alert_id: int,
        session: AsyncSession = AsyncSessionDep,
):
    """Resolve alert by id."""
    await DataIngestionAlert.update(session, data_ingestion_alert_id, {DataIngestionAlert.resolved: True})
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/data-ingestion-alerts/{data_ingestion_alert_id}/reactivate",
    tags=[Tags.DATA_ALERTS],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(DataIngestionAlert.get_object_from_http_request)],
    description="Reactivate resolved alert."
)
async def reactivate_alert(
    data_ingestion_alert_id: int,
    session: AsyncSession = AsyncSessionDep,
):
    """Reactivate resolved alert."""
    await session.execute(update(DataIngestionAlert)
                          .where(DataIngestionAlert.id == data_ingestion_alert_id)
                          .values(resolved=False))


@router.get("/data-ingestion-alerts/{data_ingestion_alert_id}",
            response_model=DataIngestionAlertSchema, tags=[Tags.DATA_ALERTS])
async def get_alert(
        data_ingestion_alert_id: int,  # pylint: disable=unused-argument
        alert: DataIngestionAlert = Depends(DataIngestionAlert.get_object_from_http_request)
):
    """Get alert by id."""
    return DataIngestionAlertSchema.from_orm(alert)


@router.delete("/data-ingestion-alerts/{data_ingestion_alert_id}", tags=[Tags.DATA_ALERTS])
async def delete_alert(
        data_ingestion_alert_id: int,  # pylint: disable=unused-argument
        session: AsyncSession = AsyncSessionDep,
        alert: DataIngestionAlert = Depends(DataIngestionAlert.get_object_from_http_request)
):
    """Delete alert by id."""
    await session.delete(alert)
    return Response(status_code=status.HTTP_200_OK)
