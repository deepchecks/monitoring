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
from datetime import datetime

import pendulum as pdl
from pydantic import BaseModel, Field
from sqlalchemy import Integer as SQLInteger
from sqlalchemy import delete, func, literal, select, text, union_all
from sqlalchemy.orm import joinedload, selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.monitor_alert_logic import (AlertsCountPerModel, MonitorsCountPerModel,
                                                             get_alerts_per_model)
from deepchecks_monitoring.models import Model
from deepchecks_monitoring.models.column_type import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models.model import TaskType
from deepchecks_monitoring.models.model_version import ColumnMetadata, ModelVersion
from deepchecks_monitoring.utils import ExtendedAsyncSession as AsyncSession
from deepchecks_monitoring.utils import IdResponse, NameIdResponse, TimeUnit, exists_or_404, fetch_or_404, field_length

from .router import router


class ModelSchema(BaseModel):
    """Model Schema."""

    id: int
    name: str = Field(max_length=field_length(Model.name))
    description: t.Optional[str] = Field(default=None, max_length=field_length(Model.description))
    task_type: t.Optional[TaskType]

    class Config:
        """Config for Model schema."""

        orm_mode = True


class ModelCreationSchema(BaseModel):
    """Model schema."""

    name: str = Field(max_length=field_length(Model.name))
    description: t.Optional[str] = Field(default=None, max_length=field_length(Model.description))
    task_type: TaskType

    class Config:
        """Config for Model schema."""

        orm_mode = True


class ModelDailyIngestion(TypedDict):
    """Model ingestion record."""

    count: int
    day: int


class ModelsInfoSchema(ModelSchema):
    """Model ingestion record."""

    alerts_count: t.Optional[int]
    latest_time: t.Optional[int]


@router.post("/models", response_model=IdResponse, tags=[Tags.MODELS], summary="Create a new model if does not exist.",
             description="Create a new model with its name, task type, and description. Returns the ID of the model."
                         " If the model already exists, returns the ID of the existing model.")
async def get_create_model(
        model_schema: ModelCreationSchema,
        session: AsyncSession = AsyncSessionDep
):
    """Create a new model.

    Parameters
    ----------
    model_schema : ModelCreationSchema
        Schema of model to create.
    session : AsyncSession
        SQLAlchemy session.

    """
    model = (await session.execute(select(Model).where(Model.name == model_schema.name))).scalars().first()
    if model is not None:
        if model.task_type != model_schema.task_type:
            raise BadRequest(f"A model with the name '{model.name}' already exists but with the task type "
                             f"'{model_schema.task_type} and not the task type '{model.task_type}'")
        if model_schema.description is not None and model.description != model_schema.description:
            raise BadRequest(f"A model with the name '{model.name}' already exists but with the description "
                             f"'{model_schema.description} and not the description '{model.description}'")
    else:
        model = Model(**model_schema.dict(exclude_none=True))
        session.add(model)
        await session.flush()
    return {"id": model.id}


@router.get("/models/data-ingestion", response_model=t.Dict[int, t.List[ModelDailyIngestion]], tags=[Tags.MODELS])
@router.get("/models/{model_id}/data-ingestion", response_model=t.List[ModelDailyIngestion], tags=[Tags.MODELS])
async def retrieve_models_data_ingestion(
        model_id: t.Optional[int] = None,
        time_filter: int = TimeUnit.HOUR * 24,
        end_time: t.Optional[str] = None,
        session: AsyncSession = AsyncSessionDep
) -> t.Union[
    t.Dict[int, t.List[ModelDailyIngestion]],
    t.List[ModelDailyIngestion]
]:
    """Retrieve models data ingestion status."""
    def is_within_dateframe(col, end_time):
        return col > text(f"(TIMESTAMP '{end_time}' - interval '{time_filter} seconds')")

    def truncate_date(col):
        return func.cast(func.extract("epoch", func.date_trunc("day", col)), SQLInteger)

    def sample_id(columns):
        return getattr(columns, SAMPLE_ID_COL)

    def sample_timestamp(columns):
        return getattr(columns, SAMPLE_TS_COL)

    end_time = pdl.parse(end_time) if end_time else pdl.now()
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

    if not models:
        return {}

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
            truncate_date(sample_timestamp(table.c)).label("day")
        )
        .where(is_within_dateframe(
            sample_timestamp(table.c),
            end_time
        ))
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


@router.get("/models/{model_id}", response_model=ModelSchema, tags=[Tags.MODELS])
async def get_model(
        model_id: int,
        session: AsyncSession = AsyncSessionDep
) -> ModelSchema:
    """Get a model from database based on model id.

    Parameters
    ----------
    model_id : int
        Model to return.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    ModelSchema
        Requested model.
    """
    model = await fetch_or_404(session, Model, id=model_id)
    return ModelSchema.from_orm(model)


@router.get("/models/{model_id}/versions", response_model=t.List[NameIdResponse], tags=[Tags.MODELS])
async def get_versions_per_model(
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
    NameIdResponse
        Created model.
    """
    model_versions = (await session.execute(
        select(ModelVersion.id, ModelVersion.name).where(ModelVersion.model_id == model_id))
                      ).all()
    if model_versions is None:
        return []
    return [NameIdResponse.from_orm(model_version) for model_version in model_versions]


@router.get("/models", response_model=t.List[ModelsInfoSchema], tags=[Tags.MODELS])
async def get_models(session: AsyncSession = AsyncSessionDep):
    """Create a new model.

    Parameters
    ----------
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    List[ModelsInfoSchema]
        List of models.
    """
    query = await session.execute(select(Model).options(selectinload(Model.versions).load_only(ModelVersion.end_time)))
    alerts_counts = await get_alerts_per_model(session)
    models = []
    for db_model in query.scalars().all():
        model = ModelsInfoSchema.from_orm(db_model)
        model.alerts_count = alerts_counts.get(model.id, 0)
        model.latest_time = int(db_model.versions[0].end_time.timestamp()) if db_model.versions else None
        models.append(model)
    return models


class ModelVersionManagmentSchema(BaseModel):
    """ModelVersion schema for the "Model managment" screen."""

    id: int
    model_id: int
    name: str
    start_time: datetime
    end_time: datetime

    class Config:
        """Schema config."""

        orm_mode = True


class ModelManagmentSchema(BaseModel):
    """Model schema for the "Model managment" screen."""

    id: int
    name: str
    alerts_count: int
    monitors_count: int
    latest_time: t.Optional[int] = None
    description: t.Optional[str] = None
    task_type: t.Optional[TaskType] = None
    versions: t.List[ModelVersionManagmentSchema]

    class Config:
        """Schema config."""

        orm_mode = True


@router.get(
    "/available-models",
    response_model=t.List[ModelManagmentSchema],
    tags=[Tags.MODELS, "models-managment"],
    description="Retrieve list of available models."
)
async def retrieve_available_models(session: AsyncSession = AsyncSessionDep) -> t.List[ModelManagmentSchema]:
    """Retrieve list of models for the "Models management" screen."""
    alerts_count = AlertsCountPerModel.cte()
    monitors_count = MonitorsCountPerModel.cte()

    records = (await session.execute(
        select(
            Model,
            alerts_count.c.count.label("n_of_alerts"),
            monitors_count.c.count.label("n_of_monitors"),
        )
        .select_from(Model)
        .outerjoin(alerts_count, alerts_count.c.model_id == Model.id)
        .outerjoin(monitors_count, monitors_count.c.model_id == Model.id)
        .options(
            joinedload(Model.versions).load_only(
                ModelVersion.id,
                ModelVersion.name,
                ModelVersion.model_id,
                ModelVersion.start_time,
                ModelVersion.end_time,
            )
        )
    )).unique().all()

    return [
        ModelManagmentSchema(
            id=record.Model.id,
            name=record.Model.name,
            task_type=record.Model.task_type,
            description=record.Model.description,
            alerts_count=record.n_of_alerts or 0,
            monitors_count=record.n_of_monitors or 0,
            latest_time=(
                # versions relationship is ordered by desc(end_time) during load
                record.Model.versions[0].end_time.timestamp()
                if record.Model.versions
                else None
            ),
            versions=[
                ModelVersionManagmentSchema.from_orm(version)
                for version in record.Model.versions
            ]
        )
        for record in records
    ]


@router.delete(
    "/models/{model_id}",
    tags=[Tags.MODELS, "models-managment"],
    description="Delete model"
)
async def delete_model(model_id: int, session: AsyncSession = AsyncSessionDep):
    """Delete model instance."""
    await exists_or_404(session, Model, id=model_id)
    await session.execute(delete(Model).where(Model.id == model_id))


@router.get("/models/{model_id}/columns", response_model=t.Dict[str, ColumnMetadata], tags=[Tags.MODELS])
async def get_model_columns(
        model_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Get statistics of columns for model.

    Parameters
    ----------
    model_id : int
        Model get columns for.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    Dict[str, ColumnMetadata]
        Column name and metadata (type and value if available).
    """
    options = selectinload(Model.versions)
    model = await fetch_or_404(session, Model, id=model_id, options=options)
    # If model is new and there are no versions, return empty dict
    if len(model.versions) == 0:
        return {}

    latest_version = model.versions[0]

    column_dict: t.Dict[str, ColumnMetadata] = {}

    return_columns = list(latest_version.features_columns.items()) + list(latest_version.non_features_columns.items())
    for (col_name, col_type) in return_columns:
        column_dict[col_name] = ColumnMetadata(type=col_type, stats=latest_version.statistics.get(col_name, {}))
    return column_dict
