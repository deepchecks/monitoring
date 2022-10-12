# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""V1 API of the model version."""
import typing as t
from io import StringIO

import fastapi
import pendulum as pdl
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from pydantic import BaseModel, Field
from sqlalchemy import Index, MetaData, Table, and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.schema import CreateTable
from sqlalchemy.sql.ddl import CreateIndex
from starlette.responses import HTMLResponse

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import (AsyncSessionDep, CacheInvalidatorDep, DataIngestionDep, KafkaAdminDep,
                                                SettingsDep)
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.cache_invalidation import CacheInvalidator
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.logic.suite_logic import run_suite_for_model_version
from deepchecks_monitoring.models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_TS_COL, ColumnType,
                                                      column_types_to_table_columns, get_model_columns_by_type)
from deepchecks_monitoring.models.model import Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.utils import IdResponse, fetch_or_404, field_length

from .check import MonitorOptions
from .router import router


class ModelVersionCreationSchema(BaseModel):
    """Schema defines the parameters for creating new model version."""

    name: str = Field(max_length=field_length(ModelVersion.name))
    features: t.Dict[str, ColumnType]
    non_features: t.Dict[str, ColumnType]
    feature_importance: t.Optional[t.Dict[str, float]] = None

    class Config:
        """Config for ModelVersion schema."""

        orm_mode = True


@router.post('/models/{model_id}/version', response_model=IdResponse, tags=[Tags.MODELS])
async def get_or_create_version(
        request: fastapi.Request,
        model_id: int,
        info: ModelVersionCreationSchema,
        session: AsyncSession = AsyncSessionDep,
        kafka_admin: KafkaAdminClient = KafkaAdminDep,
        settings=SettingsDep,
        data_ingest: DataIngestionBackend = DataIngestionDep,
        cache_invalidator: CacheInvalidator = CacheInvalidatorDep
):
    """Create a new model version.

    Parameters
    ----------
    request
    model_id : int
        ID of the model.
    info : VersionInfo
        Information about the model version.
    session : AsyncSession, optional
        SQLAlchemy session.
    kafka_admin
    settings
    data_ingest
    cache_invalidator
    """
    # TODO: all this logic must be implemented (encapsulated) within Model type
    model: Model = await fetch_or_404(session, Model, id=model_id)
    model_version: ModelVersion = (await session.execute(
        select(ModelVersion).where(ModelVersion.name == info.name, ModelVersion.model_id == model_id))
                                   ).scalars().first()
    if model_version is not None:
        if model_version.features_columns != {key: val.value for key, val in info.features.items()}:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different features')
        if info.non_features is not None and \
                model_version.non_features_columns != {key: val.value for key, val in info.non_features.items()}:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different non features')
        if info.feature_importance is not None and \
                model_version.feature_importance != info.feature_importance:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different feature importance')
        return {'id': model_version.id}
    # Validate features importance have all the features
    if info.feature_importance:
        mutual_exclusive_keys = set(info.features.keys()).symmetric_difference(info.feature_importance.keys())
        if mutual_exclusive_keys:
            raise BadRequest('feature_importance must contain exactly same features as specified in "features". '
                             f'Missing features: {mutual_exclusive_keys}')

    # Validate features and non-features doesn't intersect
    intersects_names = set(info.features.keys()).intersection(info.non_features.keys())
    if intersects_names:
        raise BadRequest(f'Can\'t use same column name in both features and non_features: {intersects_names}')

    # Create meta columns
    meta_columns = {
        SAMPLE_ID_COL: ColumnType.TEXT,
        SAMPLE_TS_COL: ColumnType.DATETIME
    }
    model_related_cols, required_model_cols = get_model_columns_by_type(model.task_type)
    # Validate no intersections between user columns and dc columns
    saved_keys = set(meta_columns.keys()) | set(model_related_cols.keys())
    intersects_columns = saved_keys.intersection(set(info.features.keys()) | set(info.non_features.keys()))
    if intersects_columns:
        raise BadRequest(f'Can\'t use the following names for columns: {intersects_columns}')

    monitor_table_columns = {**meta_columns, **model_related_cols, **info.non_features, **info.features}
    ref_table_columns = {**model_related_cols, **info.non_features, **info.features}

    # Create json schema
    not_null_columns = list(meta_columns.keys()) + required_model_cols
    monitor_table_schema = {
        'type': 'object',
        'properties': {name: data_type.to_json_schema_type(nullable=name not in not_null_columns)
                       for name, data_type in monitor_table_columns.items()},
        'required': list(info.features.keys()) + list(meta_columns.keys()) + required_model_cols,
        'additionalProperties': False
    }
    reference_table_schema = {
        'type': 'object',
        'properties': {name: data_type.to_json_schema_type(nullable=name not in not_null_columns)
                       for name, data_type in ref_table_columns.items()},
        'required': list(info.features.keys()) + required_model_cols,
        'additionalProperties': False
    }

    # Create statistics info
    empty_statistics = {col: data_type.to_statistics_stub() for col, data_type in monitor_table_columns.items()
                        if data_type.to_statistics_stub() is not None}
    # Save version entity
    model_version = ModelVersion(
        name=info.name, model_id=model_id, monitor_json_schema=monitor_table_schema,
        reference_json_schema=reference_table_schema, features_columns=info.features,
        non_features_columns=info.non_features, meta_columns=meta_columns, model_columns=model_related_cols,
        feature_importance=info.feature_importance, statistics=empty_statistics
    )
    session.add(model_version)
    # flushing to get an id for the model version, used to create the monitor + reference table names.
    await session.flush()

    # Monitor data table
    montior_table_columns_sqlalchemy = column_types_to_table_columns(monitor_table_columns)
    # using md5 hash index in queries to get random order of samples, so adding index for it
    monitor_table = Table(model_version.get_monitor_table_name(), MetaData(), *montior_table_columns_sqlalchemy,
                          Index(f'_{model_version.get_monitor_table_name()}_md5_index', text(f'md5({SAMPLE_ID_COL})')))
    await session.execute(CreateTable(monitor_table))
    # Create indices
    for index in monitor_table.indexes:
        await session.execute(CreateIndex(index))

    # Reference data table
    reference_table_columns_sqlalchemy = column_types_to_table_columns(ref_table_columns)
    reference_table = Table(model_version.get_reference_table_name(), MetaData(), *reference_table_columns_sqlalchemy)
    await session.execute(CreateTable(reference_table))
    # Create indices
    for index in reference_table.indexes:
        await session.execute(CreateIndex(index))

    # Create kafka topic
    if data_ingest.use_kafka:
        # We want to digest the message in the order they are sent, so using single partition.
        data_topic_name = data_ingest.generate_topic_name(model_version, request)
        data_topic = NewTopic(name=data_topic_name,
                              num_partitions=1,
                              replication_factor=settings.kafka_replication_factor)
        invalidation_topic = NewTopic(name=cache_invalidator.generate_invalidation_topic_name(data_topic_name),
                                      num_partitions=1,
                                      replication_factor=settings.kafka_replication_factor)
        kafka_admin.create_topics([data_topic, invalidation_topic])

    return {'id': model_version.id}


@router.get('/model-versions/{model_version_id}/schema', tags=[Tags.MODELS])
async def get_schema(
        model_version_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    session : AsyncSession, optional
        SQLAlchemy session.
    Returns
    -------
    json schema of the model version
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    return model_version.monitor_json_schema


@router.get('/model-versions/{model_version_id}/reference-schema', tags=[Tags.MODELS])
async def get_reference_schema(
        model_version_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    session : AsyncSession, optional
        SQLAlchemy session.
    Returns
    -------
    json schema of the model version
    """
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    return model_version.reference_json_schema


@router.post('/model-versions/{model_version_id}/suite-run', tags=[Tags.CHECKS], response_class=HTMLResponse)
async def run_suite_on_model_version(
        model_version_id: int,
        monitor_options: MonitorOptions,
        session: AsyncSession = AsyncSessionDep
):
    """Run suite (all checks defined) on given model version.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    monitor_options
    session : AsyncSession, optional
        SQLAlchemy session.
    Returns
    -------
    HTML of the suite result.
    """
    options = joinedload(ModelVersion.model).joinedload(Model.checks)
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, options=options, id=model_version_id)

    result = await run_suite_for_model_version(model_version, monitor_options, session)
    buffer = StringIO()
    result.save_as_html(buffer, connected=True)
    html = buffer.getvalue()

    return HTMLResponse(content=html, status_code=200)


class TimeWindowSchema(BaseModel):
    """Monitor run schema."""

    end_time: str = None
    start_time: str = None

    def start_time_dt(self) -> pdl.DateTime:
        """Get start time as datetime object."""
        return pdl.datetime(1970, 1, 1) if self.start_time is None else pdl.parse(self.start_time)

    def end_time_dt(self) -> pdl.DateTime:
        """Get end time as datetime object."""
        return pdl.now() if self.end_time is None else pdl.parse(self.end_time)


class TimeWindowOutputStatsSchema(BaseModel):
    """Monitor run schema."""

    num_labeled_samples: int = None
    num_samples: int = None


@router.post('/model-versions/{model_version_id}/time-window-statistics', response_model=TimeWindowOutputStatsSchema,
             tags=[Tags.DATA])
async def get_time_window_statistics(
        model_version_id: int,
        body: TimeWindowSchema,
        session: AsyncSession = AsyncSessionDep,
):
    """Return a json containing statistics on samples in the provided time window.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    body : TimeWindowSchema
        Description of the time window to provide statistics for.
    session : AsyncSession, optional
        SQLAlchemy session.
    Returns
    -------
    json schema of the model version
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    test_table = model_version.get_monitor_table(session)
    sample_id = test_table.c[SAMPLE_ID_COL]
    sample_label = test_table.c[SAMPLE_LABEL_COL]
    sample_timestamp = test_table.c[SAMPLE_TS_COL]

    query = select(func.count(sample_id), func.count(sample_id).filter(sample_label.is_not(None))). \
        where(and_(sample_timestamp < body.end_time_dt(), sample_timestamp >= body.start_time_dt()))

    result = (await session.execute(query)).first()
    return {'num_samples': result[0], 'num_labeled_samples': result[1]}


@router.get('/model-versions/{model_version_id}/count-samples', tags=[Tags.MODELS])
async def get_count_samples(
        model_version_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    session : AsyncSession, optional
        SQLAlchemy session.
    Returns
    -------
    json schema of the model version
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    count_sql = 'select count(1) from {}'
    mon_count = (await session.execute(text(count_sql.format(model_version.get_monitor_table_name())))).scalar()
    ref_count = (await session.execute(text(count_sql.format(model_version.get_reference_table_name())))).scalar()

    return {'monitor_count': mon_count, 'reference_count': ref_count}


@router.delete('/model-versions/{model_version_id}', tags=[Tags.MODELS])
async def delete_model_version(
        model_version_id: int,
        session: AsyncSession = AsyncSessionDep
):
    """Delete model version by id.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    session : AsyncSession, optional
        SQLAlchemy session.
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    await session.delete(model_version)
    return fastapi.Response()
