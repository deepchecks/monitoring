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

import pendulum as pdl
from deepchecks.tabular.datasets.classification import iris
from deepchecks.tabular.suites.default_suites import data_integrity
from pydantic import BaseModel
from sqlalchemy import MetaData, Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.schema import CreateTable
from starlette.responses import HTMLResponse

from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest
from deepchecks_monitoring.logic.data_tables import (column_types_to_table_columns, get_json_schema_columns_for_model,
                                                     get_json_schema_columns_for_monitor, get_table_columns_for_model,
                                                     get_table_columns_for_monitor)
from deepchecks_monitoring.models.model import Model
from deepchecks_monitoring.models.model_version import ColumnType, ModelVersion
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
    model_id: int,
    info: ModelVersionCreationSchema,
    session: AsyncSession = AsyncSessionDep
):
    """Create a new model version.

    Parameters
    ----------
    model_id : int
        ID of the model.
    info : VersionInfo
        Information about the model version.
    session : AsyncSession, optional
        SQLAlchemy session.
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

    monitor_cols = get_json_schema_columns_for_monitor()
    model_related_cols, required_model_cols = get_json_schema_columns_for_model(model.task_type)
    # Validate no intersections between user columns and dc columns
    saved_keys = set(monitor_cols.keys()) | set(model_related_cols.keys())
    intersects_columns = saved_keys.intersection(set(info.features.keys()) | set(info.non_features.keys()))
    if intersects_columns:
        raise BadRequest(f'Can\'t use the following names for columns: {intersects_columns}')

    # Create json schema
    features_props = {name: {'type': data_type.to_json_schema_type()} for name, data_type in info.features.items()}
    non_features_props = {name: {'type': data_type.to_json_schema_type()} for name, data_type in
                          info.non_features.items()}

    monitor_table_schema = {
        'type': 'object',
        'properties': {**monitor_cols, **features_props, **non_features_props, **model_related_cols},
        'required': list(features_props.keys()) + list(monitor_cols.keys()) + required_model_cols
    }
    reference_table_schema = {
        'type': 'object',
        'properties': {**features_props, **non_features_props, **model_related_cols},
        'required': list(features_props.keys()) + required_model_cols
    }

    # Create columns for data tables
    task_related_columns = get_table_columns_for_model(model.task_type)
    meta_columns = get_table_columns_for_monitor()

    # Save version entity
    model_version = ModelVersion(name=info.name, model_id=model_id, monitor_json_schema=monitor_table_schema,
                                 reference_json_schema=reference_table_schema, features=info.features,
                                 non_features=info.non_features, feature_importance=info.feature_importance)
    session.add(model_version)
    # flushing to get an id for the model version
    await session.flush()

    # Monitor data table
    monitor_table_columns = meta_columns + task_related_columns + column_types_to_table_columns(info.features) + \
        column_types_to_table_columns(info.non_features)
    monitor_table = Table(model_version.get_monitor_table_name(), MetaData(), *monitor_table_columns)
    await session.execute(CreateTable(monitor_table))

    # Reference data table
    reference_table_columns = get_table_columns_for_model(model.task_type) + \
        column_types_to_table_columns(info.features) + column_types_to_table_columns(info.non_features)
    reference_table = Table(model_version.get_reference_table_name(), MetaData(), *reference_table_columns)
    await session.execute(CreateTable(reference_table))

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
    await fetch_or_404(session, ModelVersion, id=model_version_id)
    _: pdl.DateTime = pdl.parse(monitor_options.start_time)
    _: pdl.DateTime = pdl.parse(monitor_options.end_time)

    train, test = iris.load_data()
    model = iris.load_fitted_model()

    result = data_integrity().run(train, test, model=model)
    buffer = StringIO()
    result.save_as_html(buffer, connected=True)
    html = buffer.getvalue()

    return HTMLResponse(content=html, status_code=200)
