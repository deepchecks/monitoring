from fastapi import Depends
from sqlalchemy.orm import Session

from deepchecks_api.models import models
from deepchecks_api.schemas import model as model_schema
from deepchecks_api.database import get_db
from deepchecks_api.api.v1 import router


@router.post("/models/", response_model=model_schema.Model)
async def create_model(model: model_schema.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
