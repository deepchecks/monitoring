# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the model."""
import typing as t

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Model
from deepchecks_monitoring.models.model import TaskType
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


class ModelSchema(BaseModel):
    """Model Schema."""

    id: int
    name: str
    description: t.Optional[str]
    task_type: t.Optional[TaskType]

    class Config:
        """Config for Model schema."""

        orm_mode = True


class ModelCreationSchema(BaseModel):
    """Model schema."""

    name: str
    task_type: TaskType
    description: t.Optional[str] = None

    class Config:
        """Config for Model schema."""

        orm_mode = True


@router.post("/models")
async def create_model(
    model: ModelCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create a new model.

    Parameters
    ----------
    model : ModelCreationSchema
        Model to create.
    session : AsyncSession
        SQLAlchemy session.

    Returns
    -------
    ModelSchema
        Created model.
    """
    model = Model(**model.dict(exclude_none=True))
    session.add(model)
    await session.flush()
    return {"id": model.id}


@router.get("/models/{model_id}", response_model=ModelSchema)
async def get_model(
    model_id: int,
    session: AsyncSession = AsyncSessionDep
) -> ModelSchema:
    """Create a new model.

    Parameters
    ----------
    model_id : int
        Model to return.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    ModelSchema
        Created model.
    """
    model = fetch_or_404(session, Model, id=model_id)
    return ModelSchema.from_orm(model)
