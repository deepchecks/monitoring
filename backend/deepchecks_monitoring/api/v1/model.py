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
from collections import defaultdict

from pydantic import BaseModel
from sqlalchemy import Integer as SQLInteger
from sqlalchemy import func, literal, select, text, union_all
from sqlalchemy.orm import selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models import Model
from deepchecks_monitoring.models.model import TaskType
from deepchecks_monitoring.utils import ExtendedAsyncSession as AsyncSession
from deepchecks_monitoring.utils import TimeUnit, fetch_or_404

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


class ModelDailyIngestion(TypedDict):
    """Model ingestion record."""

    count: int
    day: int


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


@router.get("/models/data-ingestion", response_model=t.Dict[int, t.List[ModelDailyIngestion]])
@router.get("/models/{model_id}/data-ingestion", response_model=t.List[ModelDailyIngestion])
async def retrieve_models_data_ingestion(
    model_id: t.Optional[int] = None,
    time_filter: int = TimeUnit.HOUR * 24,
    session: AsyncSession = AsyncSessionDep
) -> t.Union[
    t.Dict[int, t.List[ModelDailyIngestion]],
    t.List[ModelDailyIngestion]
]:
    """Retrieve models data ingestion status."""
    is_within_dateframe = lambda col: col > text(f"(current_timestamp - interval '{time_filter} seconds')")
    truncate_date = lambda col: func.cast(func.extract("epoch", func.date_trunc("day", col)), SQLInteger)
    sample_id = lambda columns: getattr(columns, SAMPLE_ID_COL)
    sample_timestamp = lambda columns: getattr(columns, SAMPLE_TS_COL)

    if model_id is not None:
        models = [
            t.cast(Model, await session.fetchone_or_404(
                select(Model)
                .where(Model.id == model_id)
                .options(selectinload(Model.versions)),
                message=f"Model with next set of arguments does not exist: id={model_id}"
            ))
        ]
    else:
        result = await session.execute(select(Model).options(selectinload(Model.versions)))
        models = t.cast(t.List[Model], result.scalars().all())

    # TODO: move query creation logic into Model type definition
    tables = (
        (model.id, version.get_monitor_table(session))
        for model in models
        for version in model.versions
    )

    union = union_all(*(
        select(
            literal(model_id).label("model_id"),
            sample_id(table.c).label("sample_id"),
            truncate_date(sample_timestamp(table.c)).label("day"))
        .where(is_within_dateframe(sample_timestamp(table.c)))
        .distinct()
        for model_id, table in tables
    ))

    rows = (await session.execute(
        select(
            union.c.model_id,
            union.c.day,
            func.count(union.c.sample_id).label("count"))
        .group_by(union.c.model_id, union.c.day),
    )).fetchall()

    result = defaultdict(list)

    for row in rows:
        result[row.model_id].append(ModelDailyIngestion(
            count=row.count,
            day=row.day
        ))

    return result[model_id] if model_id is not None else result


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
    model = await fetch_or_404(session, Model, id=model_id)
    return ModelSchema.from_orm(model)
