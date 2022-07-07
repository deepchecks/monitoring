import uuid

from fastapi import Depends
from sqlalchemy import Column, Table, MetaData
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateTable

from deepchecks_api.database import get_db
from deepchecks_api.api.v1.router import router
from deepchecks_api.logic.data_tables import get_task_related_table_columns, get_monitor_table_meta_columns
from deepchecks_api.models.model import Model
from deepchecks_api.models.model_version import ModelVersion
from deepchecks_api.schemas.model_version import VersionInfo


@router.post("/models/{model_id}/version")
async def create_version(model_id: int, info: VersionInfo, db: Session = Depends(get_db)):
    # Validate name doesn't exists
    model: Model = Model.get(model_id)
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
    db.execute(CreateTable(monitor_table))

    reference_table_name = f'ref_table_{unique_id}'
    reference_table_columns = task_related_columns + user_columns
    reference_table = Table(reference_table_name, MetaData(schema=model.name), reference_table_columns)
    db.execute(CreateTable(reference_table))

    # Save version entity
    model_version = ModelVersion(name=info.name, model_id=model_id, json_schema=schema, column_roles=info.column_roles,
                                 features_importance=info.features_importance, monitor_table_name=monitor_table_name,
                                 reference_table_name=reference_table_name)
    db.add(model_version)
    db.commit()
    return 200
