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
