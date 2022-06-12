from enum import Enum
from fastapi import Depends, FastAPI
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.deepchecks_api.models import schemas
from backend.deepchecks_api.models import models
from backend.deepchecks_api.models.database import SessionLocal, engine, mapper_registry

from .api.v1.api import router

app = FastAPI(
    title="Deepchecks Monitoring", openapi_url="/api/v1/openapi.json"
)
mapper_registry.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Set all CORS enabled origins
# if settings.BACKEND_CORS_ORIGINS:
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )

app.include_router(router, prefix="/api/v1")

@app.post("/models/", response_model=schemas.Model)
async def create_item(model: schemas.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item