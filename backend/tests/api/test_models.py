

def test_add_stuff(client):
    response = client.post("/api/v1/models", json={"name": "44", "task_type": "classification"})
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "44", "description": None, "task_type": "classification"}

