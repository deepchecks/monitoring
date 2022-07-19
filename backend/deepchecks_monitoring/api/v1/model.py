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

from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Model
from deepchecks_monitoring.schemas.model import ModelSchema

from ...utils import fetch_or_404
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
    # Flushing to get model id
    await session.flush()
    return ModelSchema.from_orm(model)


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
