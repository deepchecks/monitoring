from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_api.models import model as model_db
from deepchecks_api.schemas import model as model_schema
from deepchecks_api.database import get_db
from deepchecks_api.api.v1.router import router


@router.post("/models", response_model=model_schema.Model)
async def create_model(model: model_schema.Model, db: AsyncSession = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = model_db.Model(**data)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item
