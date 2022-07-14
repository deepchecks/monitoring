# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""V1 API of the check."""

from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.models import Check, Model
from deepchecks_monitoring.schemas.check import CheckSchema
from deepchecks_monitoring.utils import exists_or_404

from .router import router


@router.post('/models/{model_id}/check')
async def create_check(
    model_id: int,
    check: CheckSchema,
    session: AsyncSession = AsyncSessionDep

):
    """Create a new check.

    Parameters
    ----------
    model_id : int
        ID of the model.
    check : CheckSchema
        Check to create.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    int
        The check id.
    """
    # Check if relevant model exists
    await exists_or_404(session, Model, id=model_id)

    check = Check(model_id=model_id, **check.dict(exclude_none=True))
    session.add(check)
    # Flushing to get check id
    await session.flush()
    return JSONResponse(content={'id': check.id})
