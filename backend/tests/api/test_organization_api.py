import typing as t

import httpx
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models import Invitation
from tests.common import generate_user
from tests.conftest import ROWS_PER_MINUTE_LIMIT


@pytest.mark.asyncio
async def test_user_invitation_to_organization(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings,
    smtp_server
):
    user = await generate_user(async_session, settings.auth_jwt_secret)
    payload = {"email": ["someluckyuser@testing.com", "someluckyuser2@testing.com", ]}

    response = unauthorized_client.put(
        "/api/v1/organization/invite",
        headers={"Authorization": f"bearer {user.access_token}"},
        json=payload
    )

    assert response.status_code == 200, (response.content, response.json())
    assert len(smtp_server.handler.mailbox) == 2

    for index, email_message in enumerate(smtp_server.handler.mailbox):
        assert email_message["From"] == f"Deepchecks App <{settings.deepchecks_email}>"
        assert email_message["To"] == payload["email"][index]
        assert email_message["Subject"] == "Deepchecks Invitation"

    invitation_exists = await async_session.scalar(
        sa.select(
            sa.select(Invitation)
            .where(Invitation.email.in_(payload["email"]))
            .where(Invitation.creating_user == user.email)
            .where(Invitation.organization_id == user.organization_id)
            .exists()
        )
    )

    assert invitation_exists


@pytest.mark.asyncio
async def test_user_invitation_that_is_already_associated_with_organization(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings,
):
    user = await generate_user(async_session, settings.auth_jwt_secret)
    member = await generate_user(async_session, settings.auth_jwt_secret)
    payload = {"email": member.email}

    response = unauthorized_client.put(
        "/api/v1/organization/invite",
        headers={"Authorization": f"bearer {user.access_token}"},
        json=payload
    )

    assert response.status_code == 400, (response.content, response.json())
    assert response.json()["error_message"] == f"User {member.email} already associated to an organization"


@pytest.mark.asyncio
async def test_organization_retrieval(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings
):
    user = await generate_user(async_session, settings.auth_jwt_secret)

    response = unauthorized_client.get(
        "/api/v1/organization",
        headers={"Authorization": f"bearer {user.access_token}"},
    )

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert "name" in data
    assert "is_slack_connected" in data
    assert "slack_notification_levels" in data
    assert "email_notification_levels" in data


def test_organization_available_features(
    client: TestClient
):
    response = client.get(
        "/api/v1/organization/available-features",
    )

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert data["custom_checks_enabled"] is False
    assert data["data_retention_months"] == 12
    assert data["max_models"] == 8
    assert data["monthly_predictions_limit"] == 10000000
    assert data["sso_enabled"] is False
    assert data["rows_per_minute"] == ROWS_PER_MINUTE_LIMIT


@pytest.mark.asyncio
async def test_organization_members_retrieval(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings
):
    admin = await generate_user(async_session, settings.auth_jwt_secret, with_org=True, switch_schema=True)

    members = {
        m.id: m
        for m in (
            admin,
            await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
            await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
            await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False),
        )
    }

    for m in members.values():
        m.organization_id = admin.organization_id

    await async_session.commit()

    unauthorized_client.headers["Authorization"] = f"bearer {admin.access_token}"
    retrieved_members = t.cast(t.List[t.Dict[str, t.Any]], fetch_organization_members(unauthorized_client))

    assert len(retrieved_members) == len(members)

    for member in retrieved_members:
        assert member["id"] in members
        assert member["email"] == members[member["id"]].email
        assert member["disabled"] == members[member["id"]].disabled
        assert member["full_name"] == members[member["id"]].full_name
        assert member["is_admin"] == members[member["id"]].is_admin


@pytest.mark.asyncio
async def test_organization_members_retrieval_without_required_permissions(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings
):
    admin = await generate_user(async_session, settings.auth_jwt_secret, with_org=True, switch_schema=True)
    member = await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False)
    member.organization_id = admin.organization_id
    await async_session.commit()

    unauthorized_client.headers["Authorization"] = f"bearer {member.access_token}"
    fetch_organization_members(unauthorized_client, expected_status=403)


@pytest.mark.asyncio
async def test_organization_member_removal(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings
):
    admin = await generate_user(async_session, settings.auth_jwt_secret, with_org=True, switch_schema=True)
    member = await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False)
    member.organization_id = admin.organization_id
    await async_session.commit()

    unauthorized_client.headers["Authorization"] = f"bearer {admin.access_token}"
    retrieved_members = t.cast(t.List[t.Dict[str, t.Any]], fetch_organization_members(unauthorized_client))

    assert len(retrieved_members) == 2
    assert {it["id"] for it in retrieved_members} == {admin.id, member.id}

    remove_organization_member(unauthorized_client, t.cast(int, member.id))
    retrieved_members = t.cast(t.List[t.Dict[str, t.Any]], fetch_organization_members(unauthorized_client))

    assert len(retrieved_members) == 1
    assert retrieved_members[0]["id"] == admin.id


@pytest.mark.asyncio
async def test_organization_member_removal_without_required_permissions(
    unauthorized_client: TestClient,
    async_session: AsyncSession,
    settings
):
    admin = await generate_user(async_session, settings.auth_jwt_secret, with_org=True, switch_schema=True)
    member = await generate_user(async_session, settings.auth_jwt_secret, with_org=False, switch_schema=False)
    member.organization_id = admin.organization_id
    await async_session.commit()

    unauthorized_client.headers["Authorization"] = f"bearer {member.access_token}"
    remove_organization_member(unauthorized_client, t.cast(int, admin.id), expected_status=403)


def remove_organization_member(
    unauthorized_client: TestClient,
    member_id: int,
    expected_status: int = 200,
    bearer: t.Optional[str] = None
) -> t.Optional[httpx.Response]:
    headers = {} if not bearer else {"Authorization": f"bearer {bearer}"}
    response = unauthorized_client.delete(f"/api/v1/organization/members/{member_id}", headers=headers)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status


def fetch_organization_members(
    unauthorized_client: TestClient,
    expected_status: int = 200,
    bearer: t.Optional[str] = None
) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:
    headers = {} if not bearer else {"Authorization": f"bearer {bearer}"}
    response = unauthorized_client.get("/api/v1/organization/members", headers=headers)

    if not 200 <= expected_status <= 299:
        assert response.status_code == expected_status
        return response

    assert response.status_code == expected_status

    data = response.json()
    assert isinstance(data, list)

    for member in data:
        assert isinstance(member, dict)
        assert "id" in member
        assert "email" in member
        assert "full_name" in member
        assert "picture_url" in member
        assert "is_admin" in member
        assert "last_login" in member
        assert "disabled" in member

    return data
