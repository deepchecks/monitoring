import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.anyio


async def test_add_stuff(client: AsyncClient):
    response = await client.post("/api/v1/models", json={"name": "44", "task_type": "binary"})
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "44", "description": None, "task_type": "binary"}

