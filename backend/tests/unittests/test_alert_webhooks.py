# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
# pylint: disable=unused-import
import json
import os
import typing as t
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.schema_models import Alert, AlertRule, AlertSeverity, Check, Model, Monitor, TaskType
from deepchecks_monitoring.schema_models.alert_webhook import AlertWebhook, WebhookHttpMethod, WebhookKind
from tests.common import Payload, TestAPI
from tests.utils import dummy_http_server


@pytest.mark.asyncio
async def test_standard_webhook_execution(
    test_api: TestAPI,
    async_session: AsyncSession,
    application: FastAPI  # app that were used to init "test_api:TestAPI"
):
    # TODO: prepopulate template database instead of creating entities here
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    now = datetime.now(timezone.utc)

    alert_id = await async_session.scalar(sa.insert(Alert).values(
        failed_values={"1":["accuracy"], "2":["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule["id"]
    ).returning(Alert.id))

    webhook = AlertWebhook(
        name="test",
        description="",
        kind=WebhookKind.STANDARD,
        http_url="http://127.0.0.1:9876/say-hello",
        http_method=WebhookHttpMethod.GET,
        http_headers={"X-own-header": "hello world"},
        notification_levels=[
            AlertSeverity.CRITICAL,
            AlertSeverity.HIGH,
            AlertSeverity.MEDIUM,
            AlertSeverity.LOW
        ],
        created_by=1,
        updated_by=1
    )

    async_session.add(webhook)
    await async_session.flush()
    await async_session.refresh(webhook)

    alert = t.cast(Alert, await async_session.scalar(
        sa.select(Alert).where(Alert.id == alert_id).options(
            joinedload(Alert.alert_rule)
            .joinedload(AlertRule.monitor)
            .joinedload(Monitor.check)
            .joinedload(Check.model)
        )
    ))

    alert_rule = t.cast("AlertRule", alert.alert_rule)
    monitor = t.cast("Monitor", alert_rule.monitor)
    check = t.cast("Check", monitor.check)
    model = t.cast("Model", check.model)

    with dummy_http_server("127.0.0.1", 9876) as requests_inbox:
        async with httpx.AsyncClient() as c:
            await webhook.execute(
                client=c,
                alert=alert,
                settings=application.state.settings,
            )

        assert len(requests_inbox) == 1
        assert requests_inbox[0]["REQUEST_METHOD"] == "GET"
        assert requests_inbox[0]["CONTENT_TYPE"] == "application/json"
        assert requests_inbox[0]["HTTP_X_OWN_HEADER"] == "hello world"
        assert requests_inbox[0]["PATH_INFO"] == "/say-hello"

        payload = json.loads(requests_inbox[0]["X-INPUT"])
        assert isinstance(payload, dict)
        assert payload["alert_id"] == alert_id
        assert payload["alert_name"] == f"model: {model.name} monitor: {monitor.name}"
        assert payload["alert_rule"] == alert_rule.stringify()
        assert payload["severity"] == alert_rule.alert_severity.value

        assert webhook.latest_execution_date is not None
        assert isinstance(webhook.latest_execution_status, dict)
        assert webhook.latest_execution_status["status"] == 200

        await async_session.flush()
        await async_session.commit()


@pytest.mark.skipif(
    "PAGER_DUTY_API_TOKEN" not in os.environ,
    reason="Access api token is not defined"
)
@pytest.mark.skipif(
    "PAGER_DUTY_EVENT_ROUTING_KEY" not in os.environ,
    reason="Event routing key is not defined"
)
@pytest.mark.asyncio
async def test_pager_duty_webhook_execution(
    async_session: AsyncSession,
    test_api: TestAPI,
    application: FastAPI  # app that were used to init "test_api:TestAPI"
):
    api_token = os.environ["PAGER_DUTY_API_TOKEN"]
    event_routing_key = os.environ["PAGER_DUTY_EVENT_ROUTING_KEY"]

    # TODO: prepopulate template database instead of creating entities here
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    now = datetime.now(timezone.utc)

    alert_id = await async_session.scalar(sa.insert(Alert).values(
        failed_values={"1":["accuracy"], "2":["accuracy"]},
        start_time=now,
        end_time=now + timedelta(hours=2),
        alert_rule_id=alert_rule["id"]
    ).returning(Alert.id))

    webhook = AlertWebhook(
        name="test",
        description="",
        kind=WebhookKind.PAGER_DUTY,
        http_url="https://events.pagerduty.com/v2/enqueue",
        http_method=WebhookHttpMethod.POST,
        http_headers={"Authorization": f"Token token={api_token}"},
        notification_levels=[
            AlertSeverity.CRITICAL,
            AlertSeverity.HIGH,
            AlertSeverity.MEDIUM,
            AlertSeverity.LOW
        ],
        additional_arguments={
            "routing_key": event_routing_key,
            "group": "deepchecks-dev",
            "class": "deepchecks-dev",
        },
        created_by=0,
        updated_by=0
    )

    async_session.add(webhook)
    await async_session.flush()
    await async_session.refresh(webhook)

    alert = await async_session.scalar(
        sa.select(Alert).where(Alert.id == alert_id).options(
            joinedload(Alert.alert_rule)
            .joinedload(AlertRule.monitor)
            .joinedload(Monitor.check)
            .joinedload(Check.model)
        )
    )

    async with httpx.AsyncClient() as c:
        await webhook.execute(
            client=c,
            alert=alert,
            settings=application.state.settings,
        )

        assert webhook.latest_execution_date is not None
        assert isinstance(webhook.latest_execution_status, dict)
        assert webhook.latest_execution_status["status"] == 202

        await async_session.flush()
        await async_session.commit()
