"""Represent the slack integration DB model."""
import time
import typing as t
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from slack_sdk.webhook import WebhookClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.monitoring_utils import MetadataMixin
from deepchecks_monitoring.schema_models.base import Base

__all__ = ["SlackInstallation", "SlackInstallationState"]


class SlackInstallation(Base, MetadataMixin):
    """Slack installations ORM model."""

    __tablename__ = "slack_installations"
    __table_args__ = (
        sa.UniqueConstraint(
            "app_id", "team_id",
            name="slackapp_per_workspace"
        ),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    client_id = sa.Column(sa.String, nullable=False)
    app_id = sa.Column(sa.String, nullable=False)
    scope = sa.Column(sa.String, nullable=False)
    token_type = sa.Column(sa.String, nullable=False)
    access_token = sa.Column(sa.String, nullable=False)
    bot_user_id = sa.Column(sa.String, nullable=False)
    team_id = sa.Column(sa.String, nullable=False)
    team_name = sa.Column(sa.String, nullable=False)
    authed_user_id = sa.Column(sa.String, nullable=False)
    incoming_webhook_channel_id = sa.Column(sa.String, nullable=False)
    incoming_webhook_channel = sa.Column(sa.String, nullable=False)
    incoming_webhook_url = sa.Column(sa.String, nullable=False)
    incoming_webhook_configuration_url = sa.Column(sa.String, nullable=False)

    def webhook_client(self, **kwargs) -> WebhookClient:
        """Create a webhook client for this installation."""
        return WebhookClient(
            url=t.cast(str, self.incoming_webhook_url),
            user_agent_prefix="Deepchecks/",
            **kwargs
        )


class SlackInstallationState(Base):
    """Slack installations ORM model."""

    __tablename__ = "slack_installation_states"

    DEFAULT_TTL: t.ClassVar[int] = 300

    id = sa.Column(sa.Integer, primary_key=True)
    state = sa.Column(sa.String, unique=True, nullable=False)
    expire_at = sa.Column(sa.DateTime, nullable=False)

    @classmethod
    def generate_state_token(cls) -> str:
        """Generate a random uuid."""
        return str(uuid4())

    @classmethod
    async def issue(cls, session: AsyncSession, ttl: t.Optional[int] = None) -> str:
        """Issue installation state token."""
        ttl = ttl or cls.DEFAULT_TTL
        state = cls.generate_state_token()
        expire_at = datetime.utcfromtimestamp(time.time() + ttl)
        await session.execute(
            sa.insert(cls).values({
                "state": state,
                "expire_at": expire_at
            })
        )
        return state

    @classmethod
    async def is_active(cls, session: AsyncSession, state: str) -> bool:
        """Verify whether installation state is still active."""
        state_record = (await session.scalars(
            sa.select(cls).where(cls.state == state)
        )).first()

        if state_record is None:
            return False

        await session.execute(
            sa.delete(cls).where(cls.state == state)
        )

        return state_record.expire_at > datetime.utcnow()
