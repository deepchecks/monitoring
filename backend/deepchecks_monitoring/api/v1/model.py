from sqlalchemy.ext.asyncio import AsyncSession
from deepchecks_monitoring.models import model as model_db
from deepchecks_monitoring.schemas import model as model_schema
from deepchecks_monitoring.dependencies import AsyncSessionDep

from .router import router


@router.post("/models", response_model=model_schema.Model)
async def create_model(
    model: model_schema.Model, 
    session: AsyncSession = AsyncSessionDep
):
    data = model.dict(exclude_none=True)
    db_item = model_db.Model(**data)
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item
