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

from fastapi.responses import JSONResponse
from sqlalchemy import MetaData, Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.schema import CreateTable

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import (SAMPLE_ID_COL, SAMPLE_TS_COL, column_types_to_table_columns,
                                                     get_json_schema_columns, get_monitor_table_meta_columns,
                                                     get_task_related_table_columns)
from deepchecks_monitoring.models.model import Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.schemas.model_version import NewVersionSchema
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


@router.post('/models/{model_id}/version')
async def create_version(
    model_id: int,
    info: NewVersionSchema,
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
    # Get relevant model
    model = await fetch_or_404(session, Model, id=model_id)

    # Validate features importance have all the features
    if info.features_importance:
        mutual_exclusive_keys = set(info.features.keys()).symmetric_difference(info.features_importance.keys())
        if mutual_exclusive_keys:
            raise Exception('features_importance must contain exactly same features as specified in "features". '
                            f'Missing features: {mutual_exclusive_keys}')

    # Validate features and non-features doesn't intersect
    collisioned = set(info.features.keys()).intersection(info.non_features.keys())
    if collisioned:
        raise Exception(f'Can\'t use same column name in both features and non_features: {collisioned}')

    # Create json schema
    features_props = {name: {'type': data_type.to_json_schema_type()} for name, data_type in info.features.items()}
    non_features_props = {name: {'type': data_type.to_json_schema_type()} for name, data_type in
                          info.non_features.items()}
    dc_cols = get_json_schema_columns(model.task_type)
    schema = {
        'type': 'object',
        'properties': {**features_props, **non_features_props, **dc_cols},
        'required': list(features_props.keys()) + [SAMPLE_ID_COL, SAMPLE_TS_COL]
    }

    # Create columns for data tables
    task_related_columns = get_task_related_table_columns(model.task_type)
    meta_columns = get_monitor_table_meta_columns()
    saved_column_names = set((col.name for col in task_related_columns)) | set((col.name for col in meta_columns))
    user_column_names = set(info.features.keys()) | set(info.non_features.keys())
    # Validate no collision between features names and saved
    collisioned_names = saved_column_names.intersection(user_column_names)
    if collisioned_names:
        raise Exception(f'Can\'t use the following names for columns: {collisioned_names}')

    # Save version entity
    model_version = ModelVersion(name=info.name, model_id=model_id, json_schema=schema,
                                 features=info.features, non_features=info.non_features,
                                 features_importance=info.features_importance)
    session.add(model_version)
    # flushing to get an id for the model version
    await session.flush()

    # Monitor data table
    monitor_table_columns = meta_columns + task_related_columns + column_types_to_table_columns(info.features) + \
        column_types_to_table_columns(info.non_features)
    monitor_table = Table(model_version.get_monitor_table_name(), MetaData(), *monitor_table_columns)
    await session.execute(CreateTable(monitor_table))

    # Reference data table
    reference_table_columns = get_task_related_table_columns(model.task_type) + \
        column_types_to_table_columns(info.features) + column_types_to_table_columns(info.non_features)
    reference_table = Table(model_version.get_reference_table_name(), MetaData(), *reference_table_columns)
    await session.execute(CreateTable(reference_table))

    return JSONResponse(content={'id': model_version.id})
