import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.common import generate_user


@pytest.mark.asyncio
async def test_end_user_license_aggrement_access_restriction(
    async_session: AsyncSession,
    unauthorized_client: TestClient
):
    # == Prepare
    client = unauthorized_client

    user = await generate_user(
        session=async_session,
        eula=False,
        auth_jwt_secret=client.app.state.settings.auth_jwt_secret
    )

    client.headers["Authorization"] = f"Bearer {user.access_token}"

    # == Act
    response = client.get("/api/v1/users/me")

    # == Assert
    assert response.status_code == 451

    payload = response.json()
    assert "kind" in payload and payload["kind"] == "unaccepted-eula"

    # == Act/Assert
    # accept eula

    response = client.get("/api/v1/users/accept-eula")
    assert response.status_code == 200

    response = client.get("/api/v1/users/me")
    assert response.status_code == 200


