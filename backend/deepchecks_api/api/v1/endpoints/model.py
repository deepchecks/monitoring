from fastapi import Depends
from sqlalchemy.orm import Session

from deepchecks_api.models import schemas, models
from deepchecks_api.database import get_db
from deepchecks_api.api.v1 import router


@router.post("/models/", response_model=schemas.Model)
async def create_model(model: schemas.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
