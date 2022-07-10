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

from sqlalchemy import MetaData, Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.schema import CreateTable

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import (column_types_to_table_columns, get_monitor_table_meta_columns,
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

    # Validate column_roles and column_types have same keys
    mutual_exclusive_keys = set(info.column_roles.keys()).symmetric_difference(set(info.column_types.keys()))
    if mutual_exclusive_keys:
        raise Exception('column_roles and column_types must have the same keys. Keys missing from either one '
                        f'of the dictionaries: {mutual_exclusive_keys}')

    # Validate features importance have all the features
    if info.features_importance:
        feature_names = {name for name, role in info.column_roles.items() if role.is_feature()}
        mutual_exclusive_keys = feature_names.symmetric_difference(info.features_importance.keys())
        if mutual_exclusive_keys:
            raise Exception('features_importance must contain exactly same features as specified in column_roles. '
                            f'Missing features: {mutual_exclusive_keys}')

    # Create json schema
    schema = {
        'type': 'object',
        'properties': {name: {'type': data_type.value} for name, data_type in info.column_types.items()}
    }

    # Create columns for data tables
    task_related_columns = get_task_related_table_columns(model.task_type)
    meta_columns = get_monitor_table_meta_columns()
    saved_column_names = set((col.name for col in task_related_columns)) | set((col.name for col in meta_columns))
    # Validate no collision between features names and saved
    collisioned_names = saved_column_names.intersection(set(info.column_roles.keys()))
    if collisioned_names:
        raise Exception(f'Can\'t use the following names for columns: {collisioned_names}')

    # Save version entity
    model_version = ModelVersion(name=info.name, model_id=model_id, json_schema=schema,
                                 column_roles=info.column_roles,
                                 features_importance=info.features_importance)
    session.add(model_version)
    # flushing to get an id for the model version
    await session.flush()

    # Monitor data table
    monitor_table_columns = meta_columns + task_related_columns + column_types_to_table_columns(info.column_types)
    monitor_table = Table(model_version.get_monitor_table_name(), MetaData(), *monitor_table_columns)
    await session.execute(CreateTable(monitor_table))

    # Reference data table
    reference_table_columns = get_task_related_table_columns(model.task_type) + \
        column_types_to_table_columns(info.column_types)
    reference_table = Table(model_version.get_reference_table_name(), MetaData(), *reference_table_columns)
    await session.execute(CreateTable(reference_table))

    return 200
