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

import uuid

from sqlalchemy import Column, Table, MetaData
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.schema import CreateTable

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.logic.data_tables import get_task_related_table_columns, get_monitor_table_meta_columns
from deepchecks_monitoring.models.model import Model
from deepchecks_monitoring.models.model_version import ModelVersion
from deepchecks_monitoring.schemas.model_version import VersionInfo
from deepchecks_monitoring.utils import fetch_or_404

from .router import router


@router.post('/models/{model_id}/version')
async def create_version(
        model_id: int,
        info: VersionInfo,
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
    # Validate name doesn't exists
    model = await fetch_or_404(session, Model, id=model_id)
    version_names = [v.name for v in model.versions]

    if info.name in version_names:
        raise Exception()

    # Validate column_roles and column_types have same keys
    mutual_exclusive_keys = set(info.column_roles.keys()).symmetric_difference(set(info.column_types.keys()))
    if mutual_exclusive_keys:
        raise Exception('column_roles and column_types must have the same keys. Keys missing from either one '
                        f'of the dictionaries: {mutual_exclusive_keys}')

    # Create json schema
    schema = {
        'type': 'object',
        'properties': {k: {'type': v} for k, v in info.column_types}
    }

    # Create columns for data tables
    task_related_columns = get_task_related_table_columns(model.task_type)
    meta_columns = get_monitor_table_meta_columns()
    saved_column_names = set((col.name for col in task_related_columns)) | set((col.name for col in meta_columns))
    # Validate no collision between features names and saved
    collisioned_names = saved_column_names.intersection(set(info.column_roles.keys()))
    if collisioned_names:
        raise Exception(f'Can\'t use the following names for columns: {collisioned_names}')

    user_columns = [(Column(k, v.to_sqlalchemy_type(), index=True) for k, v in info.column_types)]

    unique_id = uuid.uuid4().hex[:10]
    monitor_table_name = f'monitor_table_{unique_id}'
    monitor_table_columns = meta_columns + task_related_columns + user_columns
    monitor_table = Table(monitor_table_name, MetaData(schema=model.name), *monitor_table_columns)
    await session.execute(CreateTable(monitor_table))

    reference_table_name = f'ref_table_{unique_id}'
    reference_table_columns = task_related_columns + user_columns
    reference_table = Table(reference_table_name, MetaData(schema=model.name), reference_table_columns)
    await session.execute(CreateTable(reference_table))

    # Save version entity
    model_version = ModelVersion(name=info.name, model_id=model_id, json_schema=schema, column_roles=info.column_roles,
                                 features_importance=info.features_importance, monitor_table_name=monitor_table_name,
                                 reference_table_name=reference_table_name)
    session.add(model_version)
    await session.commit()
    return 200
