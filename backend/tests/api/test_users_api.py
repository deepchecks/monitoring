import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.public_models import Organization
from tests.common import generate_user


@pytest.mark.asyncio
async def test_user_details_retrieval(unauthorized_client: TestClient, async_session: AsyncSession, settings):
    user = await generate_user(async_session, settings.auth_jwt_secret)

    response = unauthorized_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"bearer {user.access_token}"},
        follow_redirects=True
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, dict)
    assert "id" in data and isinstance(data["id"], int)
    assert "email" in data and isinstance(data["email"], str)
    assert "created_at" in data and isinstance(data["created_at"], str)
    assert "full_name" in data and isinstance(data["full_name"], (str, type(None)))
    assert "picture_url" in data and isinstance(data["picture_url"], (str, type(None)))
    assert "organization" in data and isinstance(data["organization"], dict)
    assert "id" in data["organization"] and isinstance(data["organization"]["id"], int)
    assert "name" in data["organization"] and isinstance(data["organization"]["name"], str)


@pytest.mark.asyncio
async def test_user_auth_completion(unauthorized_client: TestClient, async_session: AsyncSession, settings):
    user = await generate_user(async_session, settings.auth_jwt_secret, with_org=False)
    payload = {"user_full_name": "Test User", "new_organization_name": "My organization"}

    response = unauthorized_client.post(
        "/api/v1/users/complete-details",
        headers={"Authorization": f"bearer {user.access_token}"},
        json=payload,
        follow_redirects=False
    )

    assert response.status_code == 302
    assert response.next_request is not None
    assert response.next_request.method == "GET"
    assert response.next_request.url == "http://test.com/"

    await async_session.refresh(user)
    assert user.organization_id is not None
    assert user.full_name == payload["user_full_name"]

    schema = await async_session.scalar(
        sa.select(Organization.schema_name)
        .where(Organization.id == user.organization_id)
    )

    schema_exists = await async_session.scalar(
        sa.text(
            "select true "
            "from information_schema.schemata "
            "where schema_name = :schema_name"
        ).bindparams(sa.bindparam("schema_name", type_=sa.String, value=schema))
    )

    assert schema_exists

    # TODO: assert that tables exist
