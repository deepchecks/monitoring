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

import pendulum as pdl
import sqlalchemy as sa
from fastapi import Query
from sqlalchemy.orm import selectinload

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession as AsyncSession
from deepchecks_monitoring.schema_models import Model
from deepchecks_monitoring.schema_models.column_type import SAMPLE_LABEL_COL
from deepchecks_monitoring.schema_models.model_version import ModelVersion

from .router import router


class Step(int, enum.Enum):
    """Sort order of ingestion errors output."""

    REGISTERED = 0
    MODEL = 1
    VERSION = 2
    DATA = 3
    LABELS = 4


@router.get(
    "/api/v1/onboarding",
    response_model=Step,
    tags=[Tags.CONFIG],
    summary="Create a new model if does not exist.",
    description="Create a new model with its name, task type, and description."
)
async def get_onboarding_state(
        model_name: t.Optional[str] = Query(default=None),
        session: AsyncSession = AsyncSessionDep,
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
    if model_name is not None:
        model: Model = (await session.execute(
            sa.select(Model).where(Model.name == model_name)
        )).scalars().first()
    else:
        model: Model = (await session.execute(
            sa.select(Model).where(Model.name == model_name).sort(Model.created_at.desc()).limit(1)
        )).scalars().first()
    if model is None:
        return Step.REGISTERED
    latest_version_query = (sa.select(ModelVersion)
                            .where(ModelVersion.model_id == model.id)
                            .order_by(ModelVersion.end_time.desc()).limit(1)
                            .options(selectinload(ModelVersion.model)))
    latest_version: ModelVersion = (await session.execute(latest_version_query)).scalars().first()
    if not latest_version:
        return Step.MODEL
    if latest_version.start_time == pdl.datetime(3000, 1, 1):
        return Step.VERSION
    labels_table = model.get_sample_labels_table(session)
    has_labels = (await session.execute(
        sa.select(labels_table.c[SAMPLE_LABEL_COL]).where(labels_table.c[SAMPLE_LABEL_COL].isnot(None)).limit(1)
    )).scalars().first() is not None
    if has_labels:
        return Step.LABELS
    return Step.DATA
