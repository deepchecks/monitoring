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

from fastapi import Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.api.v1.data_ingestion_alert import DataIngestionAlertSchema
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.monitoring_utils import IdResponse
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.schema_models.data_ingestion_alert import DataIngestionAlert
from deepchecks_monitoring.schema_models.data_ingestion_alert_rule import AlertRuleType, DataIngestionAlertRule
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.utils import auth
from deepchecks_monitoring.utils.alerts import AlertSeverity, Condition, Frequency

from .router import router


class DataIngestionAlertRuleCreationSchema(BaseModel):
    """Schema defines the parameters for creating new alert rule."""

    name: str
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    is_active: t.Optional[bool]
    alert_type: AlertRuleType
    frequency: Frequency


class DataIngestionAlertRuleSchema(BaseModel):
    """Schema for the alert rule."""

    id: int
    name: str
    model_id: int
    condition: Condition
    alert_severity: t.Optional[AlertSeverity]
    is_active: bool

    class Config:
        """Config for Alert schema."""

        orm_mode = True


class DataIngestionAlertRuleUpdateSchema(BaseModel):
    """Schema defines the parameters for updating alert rule."""

    name: t.Optional[str]
    alert_severity: t.Optional[AlertSeverity]
    condition: t.Optional[Condition]
    is_active: t.Optional[bool]


@router.post(
    "/models/{model_id}/data-ingestion-alert-rules",
    response_model=IdResponse,
    tags=[Tags.DATA_ALERTS],
    dependencies=[Depends(Model.get_object_from_http_request)],
    summary="Create new alert rule on a given model."
)
async def create_alert_rule(
        model_id: int,
        alert_rule: DataIngestionAlertRuleCreationSchema,
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Create new alert rule on a given check."""
    stm = insert(DataIngestionAlertRule).values(
        model_id=model_id,
        created_by=user.id,
        updated_by=user.id,
        **alert_rule.dict(exclude_none=True)
    ).returning(DataIngestionAlertRule.id)

    rule_id = (await session.execute(stm)).scalar_one()
    return {"id": rule_id}


@router.get("/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}",
            response_model=DataIngestionAlertRuleSchema, tags=[Tags.DATA_ALERTS])
async def get_alert_rule(
        data_ingestion_alert_rule_id: int,  # pylint: disable=unused-argument
        alert_rule: DataIngestionAlertRule = Depends(DataIngestionAlertRule.get_object_from_http_request)
):
    """Get data-ingestion alert rule by id."""
    return DataIngestionAlertRuleSchema.from_orm(alert_rule)


@router.put("/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}",
            tags=[Tags.DATA_ALERTS],
            dependencies=[Depends(DataIngestionAlertRule.get_object_from_http_request)],
            summary="Update data-ingestion alert rule by id.")
async def update_alert(
        data_ingestion_alert_rule_id: int,
        body: DataIngestionAlertRuleUpdateSchema,
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Update data-ingestion alert rule by id."""
    updated_body = body.dict(exclude_unset=True).copy()
    updated_body["updated_by"] = user.id
    await DataIngestionAlertRule.update(session, data_ingestion_alert_rule_id, updated_body)
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}", tags=[Tags.DATA_ALERTS])
async def delete_alert_rule(
        data_ingestion_alert_rule_id: int,  # pylint: disable=unused-argument
        session: AsyncSession = AsyncSessionDep,
        alert_rule: DataIngestionAlertRule = Depends(DataIngestionAlertRule.get_object_from_http_request)
):
    """Delete data-ingestion alert rule by id."""
    await session.delete(alert_rule)
    return Response(status_code=status.HTTP_200_OK)


@router.get("/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}/alerts",
            response_model=t.List[DataIngestionAlertSchema], tags=[Tags.DATA_ALERTS])
async def get_alerts_of_alert_rule(
        data_ingestion_alert_rule_id: int,  # pylint: disable=unused-argument
        resolved: t.Optional[bool] = None,
        session: AsyncSession = AsyncSessionDep,
        alert_rule: DataIngestionAlertRule = Depends(DataIngestionAlertRule.get_object_from_http_request),
):
    """Get list of alerts raised by a given data-ingestion alert rule."""
    query = select(DataIngestionAlert).where(DataIngestionAlert.alert_rule_id == alert_rule.id)
    if resolved is not None:
        query = query.where(DataIngestionAlert.resolved.is_(resolved))
    query = await session.execute(query.order_by(DataIngestionAlert.start_time))
    alerts = [DataIngestionAlertSchema.from_orm(a) for a in query.scalars().all()]
    return alerts


@router.post("/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}/resolve-all",
             dependencies=[Depends(DataIngestionAlertRule.get_object_from_http_request)],
             tags=[Tags.DATA_ALERTS])
async def resolve_all_alerts_of_alert_rule(
        data_ingestion_alert_rule_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Resolve all alerts of alert rule."""
    await session.execute(update(DataIngestionAlert)
                          .where(DataIngestionAlert.alert_rule_id == data_ingestion_alert_rule_id)
                          .values(resolved=True))
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/data-ingestion-alert-rules/{data_ingestion_alert_rule_id}/alerts/reactivate-resolved",
    tags=[Tags.DATA_ALERTS],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(DataIngestionAlertRule.get_object_from_http_request)],
    description="Reactivate all resolved alerts"
)
async def reactivate_resolved_alerts(
        data_ingestion_alert_rule_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Reactivate all resolved alerts."""
    await session.execute(update(DataIngestionAlert)
                          .where(DataIngestionAlert.alert_rule_id == data_ingestion_alert_rule_id)
                          .values(resolved=False))
