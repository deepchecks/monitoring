# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
# pylint: disable=unused-argument
"""V1 API of the model."""
import enum
import typing as t


from pydantic import BaseModel
from fastapi import Depends
import sqlalchemy as sa

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import BadRequest, PaymentRequired
from deepchecks_monitoring.features_control import FeaturesControl
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession as AsyncSession
from deepchecks_monitoring.monitoring_utils import IdResponse
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model, ModelNote
from deepchecks_monitoring.utils import auth

from .router import router


class ModelNoteCreationSchema(BaseModel):
    """Note schema."""

    title: str
    text: t.Optional[str] = None

    class Config:
        """Config."""

        orm_mode = True

class Step(int, enum.Enum):
    """Sort order of ingestion errors output."""

    REGISTERED = 0
    MODEL = 1
    VERSION = 2
    DATA = 3
    LABELS = 4

@router.get(
    "/models",
    response_model=IdResponse,
    tags=[Tags.MODELS],
    summary="Create a new model if does not exist.",
    description="Create a new model with its name, task type, and description. Returns the ID of the model. "
                "If the model already exists, returns the ID of the existing model."
)
async def get_create_model(
        model_schema: ModelCreationSchema,
        user: User = Depends(auth.CurrentUser()),
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
):
    """Create a new model.

    Parameters
    ----------
    model_schema : ModelCreationSchema
        Schema of model to create.
    user
    session : AsyncSession
        SQLAlchemy session.
    resources_provider: ResourcesProvider
        Resources provider.

    """

    return {}
