from typing import Dict

from pydantic import BaseModel

from deepchecks_api.v1.api import get_db, router

from deepchecks_api.models.model_version import ColumnRole


class VersionInfo(BaseModel):
    name: str = None
    features_importance: Dict[str, float] = None
    column_roles: Dict[str, ColumnRole]

@router.post("/models/", response_model=schemas.Model)
async def create_model(model: schemas.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
