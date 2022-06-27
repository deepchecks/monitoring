import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..api.v1.api import get_db
from ..main import app
from ..models.database import mapper_registry

DB_FILE = "./test.db"

if os.path.exists(DB_FILE):
  os.remove(DB_FILE)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

mapper_registry.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_add_model():
    response = client.post("/api/v1/models/", json={
        "name": "44",
        "task_type": "binary"
    })
    assert response.status_code == 200
    assert response.json() == {
            "id": 1,
            "name": "44",
            "description": None,
            "task_type": "binary",
        }
      