from fastapi import Depends, FastAPI
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from deepchecks_api.models import schemas
from deepchecks_api.models import models

from ..api import get_db, router

@router.post("/models/", response_model=schemas.Model)
async def create_model(model: schemas.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
print('ahhhh')