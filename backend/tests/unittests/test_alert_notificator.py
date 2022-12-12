import os
import typing as t
from datetime import datetime, timedelta, timezone

import pytest
import sqlalchemy as sa
from aiosmtpd.controller import Controller
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.bgtasks.actors import AlertNotificator
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.public_models import Organization, User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, AlertSeverity, TaskType
from deepchecks_monitoring.schema_models.slack import SlackInstallation
from tests.common import create_alert_rule, create_check, create_monitor, generate_user
from tests.conftest import add_model


@pytest.mark.asyncio
async def test_alert_email_notification(
    async_session: AsyncSession,
    client: TestClient,
    user: User,
    resources_provider: ResourcesProvider,
    settings: Settings,
    smtp_server: Controller
):
    model_id = t.cast(int, add_model(client, task_type=TaskType.BINARY))
    check_id = t.cast(int, create_check(client, model_id))
    monitor_id = t.cast(int, create_monitor(client, check_id))
    alert_rule_id = t.cast(int, create_alert_rule(client, monitor_id))
    now = datetime.now(timezone.utc)

    alert_id = await async_session.scalar(sa.insert(Alert).values(
        failed_values={"1":["accuracy"], "2":["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule_id
    ).returning(Alert.id))

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert_id=alert_id,
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()

    assert were_emails_send
    assert len(smtp_server.handler.mailbox) == 1

    email = smtp_server.handler.mailbox[0]
    assert email["From"] == f"Deepchecks App <{settings.deepchecks_email}>"
    assert email["To"] == user.email
    assert email["Subject"].startswith("Alert")


@pytest.mark.asyncio
async def test_that_email_notification_levels_config_is_respected(
    async_session: AsyncSession,
    client: TestClient,
    user: User,
    smtp_server: Controller,
    resources_provider: ResourcesProvider,
    settings: Settings
):
    now = datetime.now(timezone.utc)

    await async_session.execute(
        sa.update(Organization)
        .where(Organization.id == user.organization_id)
        .values(email_notification_levels = [AlertSeverity.MID])
    )

    model_id = t.cast(int, add_model(client, task_type=TaskType.BINARY))
    check_id = t.cast(int, create_check(client, model_id))
    monitor_id = t.cast(int, create_monitor(client, check_id))

    # Create alert rules with different severities,
    # first with severity that is included within org notification levels config
    # and second with severity that is not included
    alert_rules = [
        t.cast(int, create_alert_rule(
            client,
            monitor_id,
            payload={"alert_severity": "mid"}
        )),
        t.cast(int, create_alert_rule(
            client,
            monitor_id,
            payload={"alert_severity": "low"}
        ))
    ]

    alerts = [
        await async_session.scalar(sa.insert(Alert).values(
            failed_values={"1":["accuracy"], "2":["accuracy"]},
            start_time=now,
            end_time=now + timedelta(hours=2),
            alert_rule_id=alert_rules[0]
        ).returning(Alert.id)),
        await async_session.scalar(sa.insert(Alert).values(
            failed_values={"1":["accuracy"], "2":["accuracy"]},
            start_time=now,
            end_time=now + timedelta(hours=2),
            alert_rule_id=alert_rules[1]
        ).returning(Alert.id))
    ]

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert_id=alerts[0],
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()

    assert were_emails_send
    assert len(smtp_server.handler.mailbox) == 1

    email = smtp_server.handler.mailbox[0]
    assert email["From"] == f"Deepchecks App <{settings.deepchecks_email}>"
    assert email["To"] == user.email
    assert email["Subject"].startswith("Alert")

    smtp_server.handler.reset()

    # verify that emails will not be send for alert with severity
    # that is not within org notification levels config
    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert_id=alerts[1],
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()
    assert not were_emails_send
    assert len(smtp_server.handler.mailbox) == 0


@pytest.mark.asyncio
async def test_that_emails_are_send_to_all_members_of_organization(
    async_session: AsyncSession,
    unauthorized_client: TestClient,
    settings: Settings,
    smtp_server: Controller,
    resources_provider: ResourcesProvider
):
    now = datetime.now(timezone.utc)

    users = [
        await generate_user(async_session, settings.auth_jwt_secret, switch_schema=True),
        await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
        await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
        await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
    ]

    users[1].organization_id = users[0].organization_id
    users[2].organization_id = users[0].organization_id
    users[3].organization_id = users[0].organization_id

    async_session.add_all(users)
    await async_session.flush()

    unauthorized_client.headers["Authorization"] = f"bearer {users[0].access_token}"

    model_id = t.cast(int, add_model(unauthorized_client, task_type=TaskType.BINARY))
    check_id = t.cast(int, create_check(unauthorized_client, model_id))
    monitor_id = t.cast(int, create_monitor(unauthorized_client, check_id))
    alert_rule_id = t.cast(int, create_alert_rule(unauthorized_client, monitor_id))

    alert_id = await async_session.scalar(sa.insert(Alert).values(
        failed_values={"1":["accuracy"], "2":["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule_id
    ).returning(Alert.id))

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, users[0].organization_id),
        alert_id=alert_id,
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()
    assert were_emails_send
    assert len(smtp_server.handler.mailbox) == len(users)

    emails = set()
    member_emails = {it.email for it in users}

    for email in smtp_server.handler.mailbox:
        assert email["From"] == f"Deepchecks App <{settings.deepchecks_email}>"
        assert email["Subject"].startswith("Alert")
        emails.add(email["To"])

    assert emails == member_emails


@pytest.mark.skipif("SLACK_INCOMING_WEBHOOK_URL" not in os.environ, reason="Webhook url is not defined")
@pytest.mark.asyncio
async def test_alert_slack_notification(
    async_session: AsyncSession,
    client: TestClient,
    user: User
):
    model_id = t.cast(int, add_model(client, task_type=TaskType.BINARY))
    check_id = t.cast(int, create_check(client, model_id))
    monitor_id = t.cast(int, create_monitor(client, check_id))
    alert_rule_id = t.cast(int, create_alert_rule(client, monitor_id))
    now = datetime.now(timezone.utc)

    alert_id = await async_session.scalar(sa.insert(Alert).values(
        failed_values={"1": ["accuracy"], "2": ["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule_id
    ).returning(Alert.id))

    await async_session.execute(sa.insert(SlackInstallation).values(
        app_id="qwert",
        client_id="qwert",
        scope="chat:write,incoming-webhook",
        token_type="bot",
        access_token="qwert",
        bot_user_id="qwert",
        team_id="qwert",
        team_name="qwert",
        authed_user_id="qwert",
        incoming_webhook_channel_id="qwert",
        incoming_webhook_channel="qwert",
        # only this attr is needed to send a message
        incoming_webhook_url=os.environ["SLACK_INCOMING_WEBHOOK_URL"],
        incoming_webhook_configuration_url="qwert",
    ))

    settings = Settings()  # type: ignore

    async with ResourcesProvider(settings) as rp:
        notificator = await AlertNotificator.instantiate(
            organization_id=t.cast(int, user.organization_id),
            alert_id=alert_id,
            session=async_session,
            resources_provider=rp
        )
        were_messages_send = await notificator.send_slack_messages()

    assert were_messages_send
