import os
import typing as t
from datetime import datetime, timedelta, timezone

import pytest
import sqlalchemy as sa
from aiosmtpd.controller import Controller
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.ee.notifications import AlertNotificator as EEAlertNotificator
from deepchecks_monitoring.ee.resources import ResourcesProvider as EEResourcesProvider
from deepchecks_monitoring.notifications import AlertNotificator
from deepchecks_monitoring.public_models import Organization, User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, AlertSeverity, TaskType
from deepchecks_monitoring.schema_models.slack import SlackInstallation
from tests.common import Payload, TestAPI, generate_user


@pytest.mark.asyncio
async def test_alert_email_notification(
    async_session: AsyncSession,
    test_api: TestAPI,
    user: User,
    resources_provider: ResourcesProvider,
    smtp_server: Controller
):
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    now = datetime.now(timezone.utc)

    alert = (await async_session.execute(sa.insert(Alert).values(
        failed_values={"1": ["accuracy"], "2": ["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule["id"]
    ).returning(Alert))).first()

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert=alert,
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()

    assert were_emails_send
    assert len(smtp_server.handler.mailbox) == 1

    deepchecks_email = t.cast(Settings, resources_provider.settings).deepchecks_email
    email = smtp_server.handler.mailbox[0]
    assert email["To"] == user.email
    assert email["From"] == f"Deepchecks App <{deepchecks_email}>"
    assert email["Subject"].startswith("Alert")


@pytest.mark.asyncio
async def test_that_email_notification_levels_config_is_respected(
    async_session: AsyncSession,
    test_api: TestAPI,
    user: User,
    smtp_server: Controller,
    resources_provider: ResourcesProvider,
):
    now = datetime.now(timezone.utc)

    await async_session.execute(
        sa.update(Organization)
        .where(Organization.id == user.organization_id)
        .values(email_notification_levels=[AlertSeverity.MEDIUM])
    )

    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))

    # Create alert rules with different severities,
    # first with severity that is included within org notification levels config
    # and second with severity that is not included
    alert_rules = [
        t.cast(Payload, test_api.create_alert_rule(
            monitor_id=monitor["id"],
            alert_rule={"alert_severity": "medium"}
        )),
        t.cast(int, test_api.create_alert_rule(
            monitor_id=monitor["id"],
            alert_rule={"alert_severity": "low"}
        ))
    ]

    alerts = [
        (await async_session.execute(sa.insert(Alert).values(
            failed_values={"1": ["accuracy"], "2":["accuracy"]},
            start_time=now,
            end_time=now + timedelta(hours=2),
            alert_rule_id=alert_rules[0]["id"]
        ).returning(Alert))).first(),
        (await async_session.execute(sa.insert(Alert).values(
            failed_values={"1": ["accuracy"], "2":["accuracy"]},
            start_time=now,
            end_time=now + timedelta(hours=2),
            alert_rule_id=alert_rules[1]["id"]
        ).returning(Alert))).first()
    ]

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert=alerts[0],
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()

    assert were_emails_send
    assert len(smtp_server.handler.mailbox) == 1

    deepchecks_email = t.cast(Settings, resources_provider.settings).deepchecks_email
    email = smtp_server.handler.mailbox[0]
    assert email["From"] == f"Deepchecks App <{deepchecks_email}>"
    assert email["To"] == user.email
    assert email["Subject"].startswith("Alert")

    smtp_server.handler.reset()

    # verify that emails will not be send for alert with severity
    # that is not within org notification levels config
    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, user.organization_id),
        alert=alerts[1],
        session=async_session,
        resources_provider=resources_provider
    )

    were_emails_send = await notificator.send_emails()
    assert not were_emails_send
    assert len(smtp_server.handler.mailbox) == 0


@pytest.mark.asyncio
async def test_that_emails_are_send_to_all_members_of_organization(
    async_session: AsyncSession,
    test_api: TestAPI,
    smtp_server: Controller,
    resources_provider: ResourcesProvider
):
    settings = t.cast(Settings, resources_provider.settings)
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

    with test_api.reauthorize(t.cast(str, users[0].access_token)):
        model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
        check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
        monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
        alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))

    alert = (await async_session.execute(sa.insert(Alert).values(
        failed_values={"1": ["accuracy"], "2": ["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule["id"]
    ).returning(Alert))).first()

    notificator = await AlertNotificator.instantiate(
        organization_id=t.cast(int, users[0].organization_id),
        alert=alert,
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
    test_api: TestAPI,
    user: User
):
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    now = datetime.now(timezone.utc)

    alert = Alert(
        failed_values={"1": ["accuracy"], "2": ["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule["id"]
    )

    async_session.add(alert)
    await async_session.flush()
    await async_session.refresh(alert)

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
        created_by=0,
        updated_by=0
    ))

    settings = Settings()  # type: ignore

    async with EEResourcesProvider(settings) as rp:
        notificator = await EEAlertNotificator.instantiate(
            organization_id=t.cast(int, user.organization_id),
            alert=alert,
            session=async_session,
            resources_provider=rp
        )
        were_messages_send = await notificator.send_slack_messages()

    assert were_messages_send
