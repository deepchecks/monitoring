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
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from pydantic import BaseModel
from sqlalchemy import Index, MetaData, Table, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.schema import CreateTable
from sqlalchemy.sql.ddl import CreateIndex
from starlette.responses import HTMLResponse

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep, DataIngestionDep, KafkaAdminDep, SettingsDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.check_logic import run_suite_for_model_version
from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend
from deepchecks_monitoring.models.column_type import (SAMPLE_ID_COL, SAMPLE_TS_COL, ColumnType,
                                                      column_types_to_table_columns, get_model_columns_by_type)
from deepchecks_monitoring.models.model import Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.utils import IdResponse, fetch_or_404

from .check import MonitorOptions
from .router import router


class ModelVersionCreationSchema(BaseModel):
    """Schema defines the parameters for creating new model version."""

    name: str
    features: t.Dict[str, ColumnType]
    non_features: t.Dict[str, ColumnType]
    feature_importance: t.Optional[t.Dict[str, float]] = None

    class Config:
        """Config for ModelVersion schema."""

        orm_mode = True


@router.post('/models/{model_id}/version', response_model=IdResponse, tags=[Tags.MODELS])
async def create_version(
    request: fastapi.Request,
    model_id: int,
    info: ModelVersionCreationSchema,
    session: AsyncSession = AsyncSessionDep,
    kafka_admin: KafkaAdminClient = KafkaAdminDep,
    settings=SettingsDep,
    data_ingest: DataIngestionBackend = DataIngestionDep
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
    """
    # TODO: all this logic must be implemented (encapsulated) within Model type
    model: Model = await fetch_or_404(session, Model, id=model_id)

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
    nullable_columns = list(info.features.keys()) + list(info.non_features.keys())
    monitor_table_schema = {
        'type': 'object',
        'properties': {name: data_type.to_json_schema_type(nullable=name in nullable_columns)
                       for name, data_type in monitor_table_columns.items()},
        'required': list(info.features.keys()) + list(meta_columns.keys()) + required_model_cols
    }
    reference_table_schema = {
        'type': 'object',
        'properties': {name: data_type.to_json_schema_type(nullable=name in nullable_columns)
                       for name, data_type in ref_table_columns.items()},
        'required': list(info.features.keys()) + required_model_cols
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
        topic = NewTopic(name=data_ingest.generate_topic_name(model_version, request),
                         num_partitions=1,
                         replication_factor=settings.kafka_replication_factor)
        kafka_admin.create_topics([topic])

    return {'id': model_version.id}


@router.get('/model-versions/{model_version_id}/schema', tags=[Tags.MODELS])
async def get_schema(
    model_version_id: int,
    session: AsyncSession = AsyncSessionDep
):
    """Return json schema of the model version data to use in validation on client-side.

    Parameters
    ----------
    model_version_id
    session

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
    model_version_id
    session

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
    model_version_id
    monitor_options
    session

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
