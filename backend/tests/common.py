import random
import typing as t

import faker
import httpx
from deepchecks.tabular.checks import TrainTestPerformance
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.public_models import AlertSeverity, Organization, User, UserOAuthDTO
from deepchecks_monitoring.utils.database import attach_schema_switcher_listener

__all__ = ["generate_user"]


async def generate_user(
    session: AsyncSession,
    auth_jwt_secret: str = "qwert",
    with_org: bool = True,
    switch_schema: bool = False,
    eula: bool = True,
    organization_id=None
) -> User:
    f = faker.Faker()

    u = await User.from_oauth_info(
        info=UserOAuthDTO(email=f.email(), name=f.name()),
        session=session,
        auth_jwt_secret=auth_jwt_secret,
        eula=eula
    )

    session.add(u)
    org = None

    if with_org:
        if organization_id:
            u.organization_id = organization_id
            await session.commit()
            await session.refresh(u)
        else:
            org = await Organization.create_for_user(owner=u, name=f.name(),)
            await org.schema_builder.create(AsyncEngine(session.get_bind()))
            org.email_notification_levels = list(AlertSeverity)
            org.slack_notification_levels = list(AlertSeverity)
            session.add(org)
            await session.commit()
            await session.refresh(u)
            await session.refresh(org)
    else:
        await session.commit()
        await session.refresh(u)

    if switch_schema and org:
        await attach_schema_switcher_listener(
            session=session,
            schema_search_path=[t.cast(str, org.schema_name), "public"]
        )

    return u

# TODO: use deepchecks client for this

def create_model(
    client: TestClient,
    expected_status: int = 200,
    payload: t.Optional[t.Dict[t.Any, t.Any]] = None
) -> t.Union[httpx.Response, int]:
    if not payload:
        f = faker.Faker()
        payload = {
            "name": f.name(),
            "task_type": "binary",
            "description": f.text()
        }

    response = client.post("/api/v1/models", json=payload)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status, (response.reason, response.status_code)

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int), data

    return data["id"]


def create_check(
    client: TestClient,
    model_id: int,
    expected_status: int = 200,
    payload: t.Optional[t.Dict[t.Any, t.Any]] = None
) -> t.Union[httpx.Response, int]:
    if not payload:
        f = faker.Faker()
        payload = {
            "name": f.name(),
            "config": TrainTestPerformance().config()
        }

    response = client.post(f"/api/v1/models/{model_id}/checks", json=payload)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status, (response.content, response.status_code)

    data = response.json()
    assert isinstance(data, list)
    assert isinstance(data[0], dict)
    assert "id" in data[0]
    return data[0]["id"]


def create_monitor(
    client: TestClient,
    check_id: int,
    expected_status: int = 200,
    payload: t.Optional[t.Dict[t.Any, t.Any]] = None
) -> t.Union[httpx.Response, int]:
    if not payload:
        f = faker.Faker()
        payload = {
            "name": f.name(),
            "lookback": 1200,
            "description": f.text(),
            "dashboard_id": None,
            "data_filters": None,
            "additional_kwargs": None,
            "aggregation_window": 100,
            "frequency": 300,
        }

    response = client.post(f"/api/v1/checks/{check_id}/monitors", json=payload)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status, (response.content, response.status_code)

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data
    return data["id"]


def create_alert_rule(
    client: TestClient,
    monitor_id: int,
    expected_status: int = 200,
    payload: t.Optional[t.Dict[t.Any, t.Any]] = None
) -> t.Union[httpx.Response, int]:
    f = faker.Faker()

    default_payload = {
        "condition": {"value": 5.0, "operator": "equals"},
        "alert_severity": random.choice(["low", "mid", "high", "critical"]),
        "name": f.name()
    }
    payload = (
        default_payload
        if not payload else
        {**default_payload, **payload}
    )

    response = client.post(f"/api/v1/monitors/{monitor_id}/alert-rules", json=payload)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status, (response.content, response.status_code)

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data
    return data["id"]


def create_alert_webhook(
    client: TestClient,
    expected_status: int = 201,
    payload: t.Optional[t.Dict[t.Any, t.Any]] = None
) -> t.Union[httpx.Response, int]:
    f = faker.Faker()

    default_payload = {
        "kind": "STANDART",
        "name": f.name(),
        "description": f.text(),
        "http_url": "https://httpbin.org",
        "http_method": "GET",
        "http_headers": {},
        "notification_levels": [random.choice(list(AlertSeverity)).value],
    }
    payload = (
        default_payload
        if not payload else
        {**default_payload, **payload}
    )

    response = client.post("/api/v1/alert-webhooks", json=payload)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status, (response.content, response.status_code)

    data = response.json()
    assert isinstance(data, dict)
    assert "id" in data
    return data["id"]


def delete_alert_webhook(
    webhook_id: int,
    client: TestClient,
    expected_status: int = 200,
) -> httpx.Response:
    response = client.delete(f"/api/v1/alert-webhooks/{webhook_id}")
    assert response.status_code == expected_status

    if not 200 <= expected_status <= 299:
        return response

    retrieve_alert_webhook(client=client, webhook_id=webhook_id, expected_status=404)
    return response


def retrieve_alert_webhook(
    webhook_id: int,
    client: TestClient,
    expected_status: int = 200,
) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:

    response = client.get(f"/api/v1/alert-webhooks/{webhook_id}")

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status
    data = response.json()
    assert_alert_webhook(data)

    return data


def retrieve_all_alert_webhooks(
    client: TestClient,
    expected_status: int = 200,
) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:

    response = client.get("/api/v1/alert-webhooks")

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status
    data = response.json()
    assert isinstance(data, list)

    for it in data:
        assert_alert_webhook(it)

    return data


def assert_alert_webhook(data: t.Dict[str, t.Any]):
    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int)
    assert "name" in data and isinstance(data["name"], str)
    assert "description" in data and isinstance(data["description"], str)
    assert "kind" in data and data["kind"] in {"STANDART", "PAGER_DUTY"}
    assert "http_url" in data and isinstance(data["http_url"], str)
    assert "http_method" in data and data["http_method"] in {"GET", "POST"}
    assert "notification_levels" in data and isinstance(data["notification_levels"], list)
    assert "additional_arguments" in data and isinstance(data["additional_arguments"], dict)
