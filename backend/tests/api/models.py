import pytest
from httpx import AsyncClient


@pytest.mark.parametrize(
    "payload, response",
    (
        (
            {"name": "44", "task_type": "binary"},
            {"id": 1, "name": "44", "description": None, "task_type": "binary"}
         )
    ),
)
async def test_add_stuff(client: AsyncClient, payload: dict, response: dict):
    response = await client.post("/api/v1/models/", json=payload)
    assert response.status_code == 200
    assert response.json() == {
            "id": 1,
            "name": "44",
            "description": None,
            "task_type": "binary",
    }
