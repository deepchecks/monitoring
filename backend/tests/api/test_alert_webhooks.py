import typing as t

import httpx

from tests.common import Payload, TestAPI


def test_standart_webhook_creation(test_api: TestAPI):
    # == Act/Assert
    # NOTE: all needed assertions are done by 'test_api.create_alert_webhook'
    test_api.create_alert_webhook()


def test_standart_webhook_creation_with_not_reacheable_url_address(test_api: TestAPI):
    response = test_api.create_alert_webhook(
        {"http_url": "https://some-url.blabla.com.ua.eu"},
        expected_status=400
    )
    response = t.cast(httpx.Response, response)
    assert response.json()["error_message"] == "Failed to connect to the given URL address"


def test_standart_webhook_deletion(test_api: TestAPI):
    # == Act/Assert
    # NOTE: all needed assertions are done by 'test_api.create_alert_webhook'
    webhook = t.cast(Payload, test_api.create_alert_webhook())
    test_api.delete_alert_webhook(webhook["id"])


def test_pager_duty_webhook_creation(test_api: TestAPI):
    payload = {
        "kind": "PAGER_DUTY",
        "name": "PagerDuty webhook",
        "description": "",
        "http_url": "https://events.eu.pagerduty.com/v2/enqueue",
        "event_routing_key": "qwert",
        "api_access_key": "qwert",
        "notification_levels": []
    }

    webhook = t.cast(Payload, test_api.create_alert_webhook(payload=payload))

    assert isinstance(webhook, dict)
    assert webhook["kind"] == payload["kind"]
    assert webhook["name"] == payload["name"]
    assert webhook["http_url"] == payload["http_url"]
    assert webhook["notification_levels"] == payload["notification_levels"]
    assert webhook["additional_arguments"]["routing_key"] == payload["event_routing_key"]
    assert webhook["http_headers"]["Authorization"] == f"Token token={payload['api_access_key']}"


def test_retrieval_of_all_webhooks(test_api: TestAPI):
    test_api.create_alert_webhook()

    test_api.create_alert_webhook(
        payload={
            "kind": "PAGER_DUTY",
            "name": "PagerDuty webhook",
            "description": "",
            "http_url": "https://events.eu.pagerduty.com/v2/enqueue",
            "event_routing_key": "qwert",
            "api_access_key": "qwert",
            "notification_levels": []
        }
    )

    webhooks = test_api.fetch_all_alert_webhooks()

    assert isinstance(webhooks, list)
    assert len(webhooks) == 2
    assert {it["kind"] for it in webhooks} == {"STANDART", "PAGER_DUTY"}
