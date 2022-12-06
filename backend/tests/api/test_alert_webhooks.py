import typing as t

import httpx
import pytest
from fastapi.testclient import TestClient

from tests.common import create_alert_webhook, delete_alert_webhook, retrieve_alert_webhook, retrieve_all_alert_webhooks


@pytest.mark.asyncio
async def test_standart_webhook_creation(client: TestClient):
    webhook_id = t.cast(int, create_alert_webhook(client=client))  # payload of will be generated automaticly
    assert retrieve_alert_webhook(webhook_id=webhook_id, client=client)


@pytest.mark.asyncio
async def test_standart_webhook_creation_with_not_reacheable_url_address(client: TestClient):
    response = t.cast(httpx.Response, create_alert_webhook(
        client=client,
        payload={"http_url": "https://some-url.blabla.com.ua.eu"},
        expected_status=400
    ))

    assert response.json() == {"detail": "Failed to connect to the given URL address"}


@pytest.mark.asyncio
async def test_standart_webhook_deletion(client: TestClient):
    webhook_id = t.cast(int, create_alert_webhook(client=client))  # payload of will be generated automaticly
    retrieve_alert_webhook(webhook_id=webhook_id, client=client)
    delete_alert_webhook(client=client, webhook_id=webhook_id)
    retrieve_alert_webhook(webhook_id=webhook_id, client=client, expected_status=404)


@pytest.mark.asyncio
async def test_pager_duty_webhook_creation(client: TestClient):
    payload = {
        "kind": "PAGER_DUTY",
        "name": "PagerDuty webhook",
        "description": "",
        "http_url": "https://events.eu.pagerduty.com/v2/enqueue",
        "event_routing_key": "qwert",
        "api_access_key": "qwert",
        "notification_levels": []
    }

    webhook_id = t.cast(int, create_alert_webhook(
        client=client,
        payload=payload
    ))
    webhook = retrieve_alert_webhook(
        webhook_id=webhook_id,
        client=client
    )

    assert isinstance(webhook, dict)
    assert webhook["kind"] == payload["kind"]
    assert webhook["name"] == payload["name"]
    assert webhook["http_url"] == payload["http_url"]
    assert webhook["notification_levels"] == payload["notification_levels"]
    assert webhook["additional_arguments"]["routing_key"] == payload["event_routing_key"]
    assert webhook["http_headers"]["Authorization"] == f"Token token={payload['api_access_key']}"


@pytest.mark.asyncio
async def test_retrieval_of_all_webhooks(client: TestClient):
    standart_webhook_id = t.cast(int, create_alert_webhook(client=client))  # payload of will be generated automaticly
    retrieve_alert_webhook(webhook_id=standart_webhook_id, client=client)

    pagerduty_webhook_id = t.cast(int, create_alert_webhook(
        client=client,
        payload={
            "kind": "PAGER_DUTY",
            "name": "PagerDuty webhook",
            "description": "",
            "http_url": "https://events.eu.pagerduty.com/v2/enqueue",
            "event_routing_key": "qwert",
            "api_access_key": "qwert",
            "notification_levels": []
        }
    ))
    retrieve_alert_webhook(
        webhook_id=pagerduty_webhook_id,
        client=client
    )

    webhooks = retrieve_all_alert_webhooks(client=client)

    assert isinstance(webhooks, list)
    assert len(webhooks) == 2
    assert {it["kind"] for it in webhooks} == {"STANDART", "PAGER_DUTY"}
