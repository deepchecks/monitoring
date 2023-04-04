"""Alert Webhooks API."""
import typing as t

import httpx
import sqlalchemy as sa
from fastapi import Body, Depends, Path, status
from pydantic import AnyHttpUrl, BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession, exists_or_404
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.schema_models import AlertSeverity
from deepchecks_monitoring.schema_models.alert_webhook import (AlertWebhook, PagerDutyWebhookProperties,
                                                               StandartWebhookProperties, WebhookHttpMethod,
                                                               WebhookKind)
from deepchecks_monitoring.utils import auth

from .router import router


class AlertWebhookSchema(BaseModel):
    """Alert webhook schema."""

    id: int
    name: str
    description: t.Optional[str]
    kind: WebhookKind
    http_url: AnyHttpUrl
    http_method: WebhookHttpMethod
    http_headers: t.Dict[str, t.Any]
    notification_levels: t.List[AlertSeverity]
    additional_arguments: t.Dict[str, t.Any]

    class Config:
        """Schema config."""

        orm_mode = True


@router.get(
    "/alert-webhooks",
    tags=["alert-webhooks"],
    description="Retrieve all available alert webhooks",
    response_model=t.List[AlertWebhookSchema]
)
async def list_webhooks(
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
) -> t.List[AlertWebhookSchema]:
    """Retrieve all available organization alert webhooks."""
    webhooks = await session.scalars(sa.select(AlertWebhook))
    return [AlertWebhookSchema.from_orm(it) for it in webhooks]


@router.get(
    "/alert-webhooks/{webhook_id}",
    tags=["alert-webhooks"],
    description="Retrieve alert webhook",
    response_model=AlertWebhookSchema
)
async def retrive_webhook(
        webhook_id: int = Path(...),
        session: ExtendedAsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
) -> AlertWebhookSchema:
    """Retrieve specified alert webhook instance."""
    return AlertWebhookSchema.from_orm(await session.fetchone_or_404(
        sa.select(AlertWebhook).where(AlertWebhook.id == webhook_id),
        message=f"'Webhook' with next set of arguments does not exist: id={webhook_id}"
    ))


@router.post(
    "/alert-webhooks",
    tags=["alert-webhooks"],
    description="Create alert webhook",
    status_code=status.HTTP_201_CREATED
)
async def create_webhook(
        webhook: t.Union[StandartWebhookProperties, PagerDutyWebhookProperties] = Body(discriminator="kind"),
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
) -> t.Dict[str, int]:
    """Create alert webhook.."""
    if isinstance(webhook, StandartWebhookProperties):
        http_method = webhook.http_method
    elif isinstance(webhook, PagerDutyWebhookProperties):
        http_method = "POST"
    else:
        raise ValueError(f"Unexpected type of webhook - {type(webhook)}")

    try:
        httpx.request(method=http_method, url=webhook.http_url)
    except (httpx.TransportError, httpx.ProxyError, httpx.UnsupportedProtocol) as e:
        raise BadRequest("Failed to connect to the given URL address") from e

    webhook_id = await session.scalar(
        sa.insert(AlertWebhook)
        .values(created_by=user.id, updated_by=user.id, **webhook.as_values())
        .returning(AlertWebhook.id)
    )
    return {"id": webhook_id}


@router.delete(
    "/alert-webhooks/{webhook_id}",
    tags=["alert-webhooks"],
    description="Delete alert webhook",
)
async def delete_webhook(
        webhook_id: int = Path(...),
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser())  # pylint: disable=unused-argument
):
    """Delete specified alert webhook."""
    await exists_or_404(
        session,
        AlertWebhook,
        id=webhook_id,
    )
    await session.execute(
        sa.delete(AlertWebhook)
        .where(AlertWebhook.id == webhook_id)
    )
