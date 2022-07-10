"""V1 API of the model."""

from sqlalchemy.ext.asyncio import AsyncSession
from deepchecks_monitoring.models import Model
from deepchecks_monitoring.schemas.model import Model as ModelSchema
from deepchecks_monitoring.dependencies import AsyncSessionDep

from .router import router


@router.post("/models", response_model=ModelSchema)
async def create_model(
    model: ModelSchema,
    session: AsyncSession = AsyncSessionDep
) -> ModelSchema:
    """Create a new model.

    Parameters
    ----------
    model : ModelSchema
        Model to create.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    ModelSchema
        Created model.
    """
    model = Model(**model.dict(exclude_none=True))
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return ModelSchema.from_orm(model)
