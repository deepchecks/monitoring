from fastapi import APIRouter

from backend.deepchecks_api.models.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()