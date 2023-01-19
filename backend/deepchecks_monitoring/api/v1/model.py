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
import io
import typing as t
from collections import defaultdict
from datetime import datetime

import pandas as pd
import pendulum as pdl
from fastapi import BackgroundTasks, Body, Depends, Path, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy import Integer as SQLInteger
from sqlalchemy import case, delete, func, literal, select, text, union_all, update
from sqlalchemy.cimmutabledict import immutabledict
from sqlalchemy.orm import joinedload, load_only, selectinload
from typing_extensions import TypedDict

from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, CacheFunctionsDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.monitor_alert_logic import (AlertsCountPerModel, CriticalAlertsCountPerModel,
                                                             MonitorsCountPerModel, floor_window_for_time,
                                                             get_alerts_per_model)
from deepchecks_monitoring.monitoring_utils import ExtendedAsyncSession as AsyncSession
from deepchecks_monitoring.monitoring_utils import (IdResponse, ModelIdentifier, NameIdResponse, TimeUnit,
                                                    exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model
from deepchecks_monitoring.schema_models.alert import Alert
from deepchecks_monitoring.schema_models.alert_rule import AlertRule, AlertSeverity
from deepchecks_monitoring.schema_models.check import Check
from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.schema_models.ingestion_errors import IngestionError
from deepchecks_monitoring.schema_models.model import TaskType
from deepchecks_monitoring.schema_models.model_version import ColumnMetadata, ModelVersion
from deepchecks_monitoring.schema_models.monitor import Monitor
from deepchecks_monitoring.utils import auth

from .router import router


class ModelSchema(BaseModel):
    """Model Schema."""

    id: int
    name: str = Field(max_length=field_length(Model.name))
    description: t.Optional[str] = Field(default=None, max_length=field_length(Model.description))
    task_type: t.Optional[TaskType]
    alerts_delay_labels_ratio: float
    alerts_delay_seconds: int

    class Config:
        """Config for Model schema."""

        orm_mode = True


class ModelCreationSchema(BaseModel):
    """Model schema."""

    name: str = Field(max_length=field_length(Model.name))
    description: t.Optional[str] = Field(default=None, max_length=field_length(Model.description))
    task_type: TaskType
    alerts_delay_labels_ratio: float
    alerts_delay_seconds: int

    class Config:
        """Config for Model schema."""

        orm_mode = True


class ModelDailyIngestion(TypedDict):
    """Model ingestion record."""

    count: int
    timestamp: int


class ModelsInfoSchema(ModelSchema):
    """Model ingestion record."""

    alerts_count: t.Optional[int]
    latest_time: t.Optional[int]


@router.post(
    "/models",
    response_model=IdResponse,
    tags=[Tags.MODELS],
    summary="Create a new model if does not exist.",
    description="Create a new model with its name, task type, and description. Returns the ID of the model. "
                "If the model already exists, returns the ID of the existing model."
)
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
    return {"id": model.id, "name": model.name}


@router.get(
    "/models/data-ingestion",
    response_model=t.Dict[int, t.List[ModelDailyIngestion]],
    tags=[Tags.MODELS],
    description="Retrieve all models data ingestion statistics."
)
async def retrieve_all_models_data_ingestion(
        time_filter: int = TimeUnit.HOUR * 24,
        end_time: t.Optional[str] = None,
        session: AsyncSession = AsyncSessionDep
) -> t.Dict[int, t.List[ModelDailyIngestion]]:
    """Retrieve all models data ingestion statistics."""
    return await _retrieve_models_data_ingestion(
        time_filter=time_filter,
        end_time=end_time,
        session=session,
    )


@router.get(
    "/models/{model_id}/data-ingestion",
    response_model=t.Dict[int, t.List[ModelDailyIngestion]],
    tags=[Tags.MODELS],
    description="Retrieve model data ingestion statistics."
)
async def retrieve_models_data_ingestion(
        model_identifier: t.Optional[ModelIdentifier] = ModelIdentifier.resolver(),
        time_filter: int = TimeUnit.HOUR * 24,
        end_time: t.Optional[str] = None,
        session: AsyncSession = AsyncSessionDep
) -> t.Dict[int, t.List[ModelDailyIngestion]]:
    """Retrieve model data ingestion status."""
    return await _retrieve_models_data_ingestion(
        model_identifier=model_identifier,
        time_filter=time_filter,
        end_time=end_time,
        session=session,
    )


async def _retrieve_models_data_ingestion(
        *,
        model_identifier: t.Optional[ModelIdentifier] = None,
        time_filter: int = TimeUnit.HOUR * 24,
        end_time: t.Optional[str] = None,
        session: AsyncSession = AsyncSessionDep
) -> t.Dict[int, t.List[ModelDailyIngestion]]:
    """Retrieve models data ingestion status."""

    def is_within_dateframe(col, end_time):
        return col > text(f"(TIMESTAMP '{end_time}' - interval '{time_filter} seconds')")

    def truncate_date(col, agg_time_unit: str = "day"):
        return func.cast(func.extract("epoch", func.date_trunc(agg_time_unit, col)), SQLInteger)

    def sample_id(columns):
        return getattr(columns, SAMPLE_ID_COL)

    def sample_timestamp(columns):
        return getattr(columns, SAMPLE_TS_COL)

    model_identifier_name = "id"
    end_time = pdl.parse(end_time) if end_time else pdl.now()
    models_query = select(Model).options(selectinload(Model.versions))

    if model_identifier is not None:
        model_identifier_name = model_identifier.column_name
        models = [
            t.cast(Model, await session.fetchone_or_404(
                models_query.where(model_identifier.as_expression),
                message=f"Model with next set of arguments does not exist: {repr(model_identifier)}"
            ))
        ]
    else:
        result = await session.execute(models_query)
        models = t.cast(t.List[Model], result.scalars().all())

    # TODO: move query creation logic into Model type definition
    tables = [
        (getattr(model, model_identifier_name), version.get_monitor_table(session))
        for model in models
        for version in model.versions
    ]

    if not tables:
        return {}

    if time_filter == TimeUnit.HOUR:
        agg_time_unit = "minute"
    elif time_filter == TimeUnit.DAY:
        agg_time_unit = "hour"
    else:
        agg_time_unit = "day"

    union = union_all(*(
        select(
            literal(model_id).label("model_id"),
            sample_id(table.c).label("sample_id"),
            truncate_date(sample_timestamp(table.c), agg_time_unit).label("timestamp")
        ).where(is_within_dateframe(
            sample_timestamp(table.c),
            end_time
        )).distinct()
        for model_id, table in tables
    ))

    rows = (await session.execute(
        select(
            union.c.model_id,
            union.c.timestamp,
            func.count(union.c.sample_id).label("count"))
        .group_by(union.c.model_id, union.c.timestamp)
        .order_by(union.c.model_id, union.c.timestamp, "count"),
    )).fetchall()

    result = defaultdict(list)

    for row in rows:
        result[row.model_id].append(ModelDailyIngestion(
            count=row.count,
            timestamp=row.timestamp
        ))

    return result


@router.get("/models/{model_id}", response_model=ModelSchema, tags=[Tags.MODELS])
async def get_model(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep
) -> ModelSchema:
    """Get a model from database based on model id.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        Model to return.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    ModelSchema
        Requested model.
    """
    model = await fetch_or_404(session, Model, **model_identifier.as_kwargs)
    return ModelSchema.from_orm(model)


@router.get(
    "/models/{model_id}/versions",
    response_model=t.List[NameIdResponse],
    tags=[Tags.MODELS]
)
async def get_versions_per_model(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep
):
    """Create a new model.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        Model to return.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    NameIdResponse
        Created model.
    """
    model = await session.fetchone_or_404(
        select(Model)
        .where(model_identifier.as_expression)
        .options(joinedload(Model.versions)),
        message=f"'Model' with next set of arguments does not exist: {repr(model_identifier)}"
    )
    return [
        NameIdResponse.from_orm(model_version)
        for model_version in model.versions
    ]


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
async def delete_model(
        background_tasks: BackgroundTasks,
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep,
        resources_provider: ResourcesProvider = ResourcesProviderDep,
        user: User = Depends(auth.AdminUser()),
):
    """Delete model instance."""
    model = await session.fetchone_or_404(
        select(Model)
        .where(model_identifier.as_expression)
        .options(joinedload(Model.versions)),
        message=f"Model with next set of arguments does not exist: {repr(model_identifier)}"
    )

    tables = []
    organization_schema = user.organization.schema_name

    for version in model.versions:
        tables.append(f'"{organization_schema}"."{version.get_monitor_table_name()}"')
        tables.append(f'"{organization_schema}"."{version.get_reference_table_name()}"')

    background_tasks.add_task(
        drop_tables,
        resources_provider=resources_provider,
        tables=tables
    )

    await session.execute(delete(Model).where(model_identifier.as_expression))

    # NOTE:
    # tests will hung without statement below,
    # it looks like that it happens because in test env
    # background task is called in sync manner before
    # finalizing database session context manager (generator)
    # and that leads to the deadlock
    await session.commit()


async def drop_tables(
    resources_provider: ResourcesProvider,
    tables: t.List[str]
):
    """Drop specified tables."""
    if not tables:
        return
    async with resources_provider.async_database_engine.begin() as connection:
        for name in tables:
            await connection.execute(text(f"DROP TABLE IF EXISTS {name}"))


@router.get("/models/{model_id}/columns", response_model=t.Dict[str, ColumnMetadata], tags=[Tags.MODELS])
async def get_model_columns(
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep,
):
    """Get statistics of columns for model.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        Identifier of a model column of which to return.
    session : AsyncSession, optional
        SQLAlchemy session.

    Returns
    -------
    Dict[str, ColumnMetadata]
        Column name and metadata (type and value if available).
    """
    model = await fetch_or_404(
        session,
        Model,
        **model_identifier.as_kwargs,
        options=selectinload(Model.versions)
    )

    # If model is new and there are no versions, return empty dict
    if len(model.versions) == 0:
        return {}

    latest_version: ModelVersion = model.versions[0]
    column_dict: t.Dict[str, ColumnMetadata] = {}

    feat_imp_dict = latest_version.feature_importance or {}
    return_columns = list(sorted(latest_version.features_columns.items(),
                                 key=lambda item: feat_imp_dict.get(item[0], 0), reverse=True)) + \
        list(latest_version.additional_data_columns.items())
    for (col_name, col_type) in return_columns:
        column_dict[col_name] = ColumnMetadata(type=col_type, stats=latest_version.statistics.get(col_name, {}))
    return column_dict


class ConnectedModelSchema(BaseModel):
    """Model schema for the "Connected Models" screen."""

    id: int
    name: str
    description: t.Optional[str] = None
    task_type: t.Optional[TaskType] = None
    n_of_alerts: int
    n_of_pending_rows: int
    n_of_updating_versions: int
    latest_update: t.Optional[datetime] = None

    @validator("n_of_alerts", pre=True)
    @classmethod
    def validate_n_of_alerts(cls, value):
        """Validate number of alerts."""
        return value or 0

    @validator("n_of_pending_rows", pre=True)
    @classmethod
    def validate_n_of_pending_rows(cls, value):
        """Validate number of pending rows."""
        return value or 0

    @validator("n_of_updating_versions", pre=True)
    @classmethod
    def validate_n_of_updating_versions(cls, value):
        """Validate number of updating versions."""
        return value or 0

    class Config:
        """Schema config."""

        orm_mode = True


@router.get(
    "/connected-models",
    response_model=t.List[ConnectedModelSchema],
    tags=[Tags.MODELS, "connected-models"],
    description="Retrieve list of connected models."
)
async def retrieve_connected_models(session: AsyncSession = AsyncSessionDep,
                                    cache_funcs=CacheFunctionsDep,
                                    user: User = Depends(auth.CurrentActiveUser())) -> t.List[ConnectedModelSchema]:
    """Retrieve list of models for the "Models management" screen."""
    # Get model versions info
    model_version_cols = [ModelVersion.topic_end_offset, ModelVersion.ingestion_offset, ModelVersion.last_update_time,
                          ModelVersion.model_id, ModelVersion.last_update_time]
    versions: t.List[ModelVersion] = \
        (await session.scalars(select(ModelVersion).options(load_only(*model_version_cols)))).all()

    lags = defaultdict(lambda: 0)
    num_updating = defaultdict(lambda: 0)
    last_update_time = {}
    for version in versions:
        lag = (version.topic_end_offset or 0) - (version.ingestion_offset or 0)
        if version.last_update_time:
            last_update_time[version.model_id] = version.last_update_time if version.model_id not in last_update_time \
                else max(last_update_time[version.model_id], version.last_update_time)
        # If lag is negative, adding the model version to process list. This prevents edge cases when redis might get
        # reset, so we lose the process set. in this way we make sure it will get updated.
        if lag < 0:
            cache_funcs.add_to_process_set(user.organization.id, version.id)
        # If lag is smaller than 0 (the ingestion is faster than the update of topic offset) then we don't want to count
        # it, to prevent weird cases.
        elif lag > 0:
            lags[version.model_id] += lag
            num_updating[version.model_id] += 1

    alerts_count = CriticalAlertsCountPerModel.cte()

    records = (await session.execute(
        select(
            Model.id,
            Model.name,
            Model.task_type,
            Model.description,
            alerts_count.c.count.label("n_of_alerts"),
        )
        .select_from(Model)
        .outerjoin(alerts_count, alerts_count.c.model_id == Model.id)
    )).all()

    results = []
    for record in records:
        record = dict(record)
        record["n_of_pending_rows"] = lags[record["id"]]
        record["n_of_updating_versions"] = num_updating[record["id"]]
        record["latest_update"] = last_update_time.get(record["id"])
        results.append(ConnectedModelSchema(**record))

    return results


class ConnectedModelVersionSchema(BaseModel):
    """ModelVersion schema for the "Connected Models" screen."""

    id: int
    name: str
    last_update_time: t.Optional[datetime]
    n_of_pending_rows: int
    n_of_alerts: int

    @validator("n_of_alerts", pre=True)
    @classmethod
    def validate_n_of_alerts(cls, value):
        """Validate number of alerts."""
        return value or 0

    @validator("n_of_pending_rows", pre=True)
    @classmethod
    def validate_n_of_pending_rows(cls, value):
        """Validate number of pending rows."""
        return value or 0

    class Config:
        """Schema config."""

        orm_mode = True


@router.get(
    "/connected-models/{model_id}/versions",
    tags=[Tags.MODELS, "connected-models"],
    response_model=t.List[ConnectedModelVersionSchema],
    description="Retrieve list of versions of a connected model."
)
async def retrive_connected_model_versions(
    model_id: int = Path(...),
    session: AsyncSession = AsyncSessionDep
) -> t.List[ConnectedModelVersionSchema]:
    """Retrieve list of versions of a connected model."""
    await exists_or_404(session=session, model=Model, id=model_id)

    alerts_count = (
        select(
            func.jsonb_object_keys(Alert.failed_values).label("model_version_name"),
            func.count(Alert.id).label("n_of_alerts")
        )
        .select_from(Alert)
        .join(Alert.alert_rule)
        .join(AlertRule.monitor)
        .join(Monitor.check)
        .where(Check.model_id == model_id)
        .where(Alert.resolved.is_(False))
        .where(AlertRule.alert_severity == AlertSeverity.CRITICAL)
        .group_by(text("1"))
        .cte()
    )

    n_of_pending_rows = ModelVersion.topic_end_offset - ModelVersion.ingestion_offset

    # 'topic_end_offset' and 'ingestion_offset' both can be null
    # in this case expression 'n_of_pending_rows' will return null,
    # add 'case' expression to prevent this
    n_of_pending_rows = case((n_of_pending_rows >= 0, n_of_pending_rows), else_=0)

    records = (await session.execute(
        select(
            ModelVersion.id,
            ModelVersion.name,
            ModelVersion.last_update_time,
            n_of_pending_rows.label("n_of_pending_rows"),
            alerts_count.c.n_of_alerts
        )
        .outerjoin(alerts_count, alerts_count.c.model_version_name == ModelVersion.name)
        .where(ModelVersion.model_id == model_id)
    )).all()

    return [
        ConnectedModelVersionSchema.from_orm(it)
        for it in records
    ]


class IngestionErrorsSortKey(str, enum.Enum):
    """Sort key of ingestion errors output."""

    TIMESTAMP = "timestamp"
    ERROR = "error"


class SortOrder(str, enum.Enum):
    """Sort order of ingestion errors output."""

    ASC = "asc"
    DESC = "desc"


class IngestionErrorSchema(BaseModel):
    """IngestionError output schema."""

    id: int
    sample_id: t.Optional[str] = None
    error: t.Optional[str] = None
    created_at: datetime
    sample: str

    class Config:
        """Config."""

        orm_mode = True


@router.get(
    "/connected-models/{model_id}/versions/{version_id}/ingestion-errors",
    tags=[Tags.MODELS, "connected-models"],
    description="Retrieve connected model version ingestion errors.",
    response_model=t.List[IngestionErrorSchema]
)
async def retrieve_connected_model_version_ingestion_errors(
    model_id: int = Path(...),
    version_id: int = Path(...),
    sort_key: IngestionErrorsSortKey = Query(default=IngestionErrorsSortKey.TIMESTAMP),
    sort_order: SortOrder = Query(default=SortOrder.DESC),
    download: bool = Query(default=False),
    limit: int = Query(default=50, le=10_000, ge=1),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = AsyncSessionDep
):
    """Retrieve connected model version ingestion errors."""
    await exists_or_404(
        session=session,
        model=ModelVersion,
        id=version_id,
        model_id=model_id
    )

    order_by_expression: t.Dict[t.Tuple[IngestionErrorsSortKey, SortOrder], t.Any] = {
        (IngestionErrorsSortKey.TIMESTAMP, SortOrder.ASC): IngestionError.created_at.asc(),
        (IngestionErrorsSortKey.TIMESTAMP, SortOrder.DESC): IngestionError.created_at.desc(),
        (IngestionErrorsSortKey.ERROR, SortOrder.ASC): IngestionError.error.asc(),
        (IngestionErrorsSortKey.ERROR, SortOrder.DESC): IngestionError.error.desc(),
    }

    q = (
        select(
            IngestionError.id,
            IngestionError.sample_id,
            IngestionError.created_at,
            IngestionError.error,
            IngestionError.sample,
        )
        .where(IngestionError.model_version_id == version_id)
        .order_by(order_by_expression[(sort_key, sort_order)])
        .limit(limit)
        .offset(offset)
    )

    if download is True:
        # TODO:
        # - add comments
        # - reconsider
        # - consider using more compact formats like avro/parquet
        async def response_stream():
            nonlocal session, q
            n_of_rows = 1000
            chunk_size = 10000000  # 10Mb
            result = await session.stream(q)
            async for records in result.partitions(n_of_rows):
                buffer = io.BytesIO()
                pd.DataFrame.from_records(records).to_csv(buffer, encoding="utf-8")
                buffer.seek(0)
                while True:
                    batch = buffer.read(chunk_size)
                    if not batch:
                        break
                    yield batch

        return StreamingResponse(content=response_stream(), media_type="text/csv")

    max_rows_per_request = 300

    if limit > max_rows_per_request:
        raise BadRequest(
            f"Retrieval of more than {max_rows_per_request} rows by one request is not allowed. "
            f"Use 'download=true' query parameter to download more than {max_rows_per_request} rows "
            "of ingestion errors in csv format."
        )

    records = (await session.execute(q)).all()
    return [IngestionErrorSchema.from_orm(it) for it in records]


@router.get(
    "/scorers",
    tags=[Tags.MODELS, "connected-models"],
    description="Retrieve list of all available scorers."
)
async def retrieve_scorers(session: AsyncSession = AsyncSessionDep):
    """Retrieve list of all available scorers."""
    # TODO
    return []


@router.get(
    "/connected-models/{model_id}/scorers",
    tags=[Tags.MODELS, "connected-models"],
    description="Retrieve list of model scorers."
)
async def retrieve_model_scorers(
    model_id: int = Path(...),
    session: AsyncSession = AsyncSessionDep
):
    """Retrieve list of model scorers."""
    # TODO
    return []


@router.post(
    "/connected-models/{model_id}/scorers",
    tags=[Tags.MODELS, "connected-models"],
    description="Add a scorer to a model."
)
async def add_scorer(
    model_id: int = Path(...),
    body: t.Dict[str, t.Any] = Body(...),
    session: AsyncSession = AsyncSessionDep
):
    """Add a scorer to a model."""
    # TODO
    return


class ModelScheduleTimeSchema(BaseModel):
    """Model Schedule Time Schema."""
    timestamp: str

    @validator("timestamp")
    def timestamp_validate(cls, value):  # pylint: disable=no-self-argument
        """Get start time as datetime object."""
        pdl.parse(value)
        return value


@router.post(
    "/models/{model_id}/monitors-set-schedule-time",
    tags=[Tags.MODELS, Tags.MONITORS],
    summary="Set new scheduling time for all monitors of the model."
)
async def set_schedule_time(
    body: ModelScheduleTimeSchema,
    model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
    session: AsyncSession = AsyncSessionDep,
):
    """Set schedule time."""
    options = (selectinload(Model.checks).load_only(Check.id).selectinload(Check.monitors))
    model = await fetch_or_404(session, Model, **model_identifier.as_kwargs, options=options)

    monitors = [monitor for check in model.checks for monitor in check.monitors]
    monitor_ids = [monitor.id for monitor in monitors]
    timestamp = pdl.parse(body.timestamp)

    for monitor in monitors:
        # Update schedule time
        monitor.latest_schedule = floor_window_for_time(timestamp, monitor.frequency)

    # Delete monitors tasks
    await Task.delete_monitor_tasks(monitor_ids, timestamp, session)

    # Resolving all alerts which are connected to this monitors
    await session.execute(update(Alert).where(AlertRule.monitor_id.in_(monitor_ids))
                          .values({Alert.resolved: True}),
                          execution_options=immutabledict({"synchronize_session": False}))
