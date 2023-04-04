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
from datetime import datetime
from io import StringIO

import pandas as pd
import pendulum as pdl
from fastapi import Depends, Path
from fastapi import status as HttpStatus
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, Field, root_validator
from sqlalchemy import Index, MetaData, Table, and_, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.ddl import CreateIndex, CreateTable
from starlette.responses import HTMLResponse

from deepchecks_monitoring.bgtasks.delete_db_table_task import insert_delete_db_table_task
from deepchecks_monitoring.config import Tags
from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import BadRequest, is_unique_constraint_violation_error
from deepchecks_monitoring.logic.check_logic import (SingleCheckRunOptions, TableDataSchema, WindowDataSchema,
                                                     create_execution_data_query)
from deepchecks_monitoring.logic.suite_logic import run_suite_for_model_version
from deepchecks_monitoring.monitoring_utils import (ExtendedAsyncSession, IdentifierKind, IdResponse, ModelIdentifier,
                                                    ModelVersionIdentifier, exists_or_404, fetch_or_404, field_length)
from deepchecks_monitoring.public_models.organization import Organization
from deepchecks_monitoring.public_models.user import User
from deepchecks_monitoring.schema_models.column_type import (REFERENCE_SAMPLE_ID_COL, SAMPLE_ID_COL, SAMPLE_LABEL_COL,
                                                             SAMPLE_LOGGED_TIME_COL, SAMPLE_PRED_PROBA_COL,
                                                             SAMPLE_TS_COL, ColumnType, column_types_to_table_columns,
                                                             get_label_column_type, get_predictions_columns_by_type)
from deepchecks_monitoring.schema_models.model import Model, TaskType
from deepchecks_monitoring.schema_models.model_version import ModelVersion
from deepchecks_monitoring.utils import auth

from .router import router

if t.TYPE_CHECKING:
    import pendulum.datetime  # pylint: disable=unused-import


class ModelVersionCreationSchema(BaseModel):
    """Schema defines the parameters for creating new model version."""

    name: str = Field(max_length=field_length(ModelVersion.name))
    features: t.Dict[str, ColumnType]
    additional_data: t.Dict[str, ColumnType]
    feature_importance: t.Optional[t.Dict[str, float]] = None
    classes: t.Optional[t.List[str]] = None
    label_map: t.Optional[t.Dict[int, str]] = None

    class Config:
        """Config for ModelVersion schema."""

        orm_mode = True


@router.post('/models/{model_id}/version', response_model=IdResponse, tags=[Tags.MODELS])
async def get_or_create_version(
        info: ModelVersionCreationSchema,
        model_identifier: ModelIdentifier = ModelIdentifier.resolver(),
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Create a new model version.

    Parameters
    ----------
    model_identifier : ModelIdentifier
        ID or name of the model.
    info : VersionInfo
        Information about the model version.
    session : AsyncSession, optional
        SQLAlchemy session.
    """
    model: Model = await fetch_or_404(session, Model, **model_identifier.as_kwargs)

    model_version: ModelVersion = (await session.execute(
        select(ModelVersion)
        .where(ModelVersion.name == info.name, ModelVersion.model_id == model.id)
        .limit(1)
    )).scalars().first()

    if model_version is not None:
        if model_version.features_columns != {key: val.value for key, val in info.features.items()}:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different features')
        if info.additional_data is not None and \
                model_version.additional_data_columns != {key: val.value for key, val in info.additional_data.items()}:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different non features')
        if info.feature_importance is not None and \
                model_version.feature_importance != info.feature_importance:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             'different feature importance')
        if info.classes is not None and model_version.classes != info.classes:
            raise BadRequest(f'A model version with the name "{model_version.name}" already exists but with '
                             f'different classes: {model_version.classes}')
        return {'id': model_version.id}
    # Validate features importance have all the features
    if info.feature_importance:
        mutual_exclusive_keys = set(info.features.keys()).symmetric_difference(info.feature_importance.keys())
        if mutual_exclusive_keys:
            raise BadRequest('feature_importance must contain exactly same features as specified in "features". '
                             f'Missing features: {mutual_exclusive_keys}')
        if any(val < 0 for val in info.feature_importance.values()):
            raise BadRequest('feature_importance values must be non-negative')

    # Validate features and additional data doesn't intersect
    intersects_names = set(info.features.keys()).intersection(info.additional_data.keys())
    if intersects_names:
        raise BadRequest(f'Can\'t use same column name in both features and additional_data: {intersects_names}')

    # Validate classes parameter
    have_classes = info.classes is not None
    classes = info.classes

    if have_classes:
        if model.task_type not in [TaskType.MULTICLASS, TaskType.BINARY]:
            raise BadRequest('Classes parameter is valid only for classification, bot model task is '
                             f'{model.task_type.value}')
        if len(classes) < 2:
            raise BadRequest(f'Got {len(classes)} classes but minimal number of classes is 2')
        if len(classes) > 2 and model.task_type == TaskType.BINARY:
            raise BadRequest(f'Got {len(classes)} classes but task type is binary')
        if sorted(classes) != classes:
            raise BadRequest('Classes list must be sorted alphabetically')

    # Create meta columns
    meta_columns = {SAMPLE_ID_COL: ColumnType.TEXT, SAMPLE_TS_COL: ColumnType.DATETIME}
    predictions_cols, required_cols = get_predictions_columns_by_type(model.task_type, have_classes)

    # Validate no intersections between user columns and dc columns
    saved_keys = set(meta_columns.keys()) | set(predictions_cols.keys())
    intersects_columns = saved_keys.intersection(set(info.features.keys()) | set(info.additional_data.keys()))

    if intersects_columns:
        raise BadRequest(f'Can\'t use the following names for columns: {intersects_columns}')

    monitor_table_columns = {**meta_columns, **predictions_cols, **info.additional_data, **info.features}
    # For the reference we save the label directly in the table
    label_col = {SAMPLE_LABEL_COL: get_label_column_type(TaskType(model.task_type))}
    ref_table_columns = {**predictions_cols, **info.additional_data, **info.features, **label_col}

    # Create json schema
    not_null_columns = list(meta_columns.keys()) + required_cols
    # Define the length of the array for probabilities column
    length_columns = {
        SAMPLE_PRED_PROBA_COL: len(classes)
        if have_classes else None
    }
    monitor_table_schema = {
        'type': 'object',
        'properties': {
            name: data_type.to_json_schema_type(
                nullable=name not in not_null_columns,
                min_items=length_columns.get(name),
                max_items=length_columns.get(name),
            )
            for name, data_type in monitor_table_columns.items()
        },
        'required': list(info.features.keys()) + list(meta_columns.keys()) + required_cols,
        'additionalProperties': False
    }
    reference_table_schema = {
        'type': 'object',
        'properties': {
            name: data_type.to_json_schema_type(
                nullable=name not in not_null_columns,
                min_items=length_columns.get(name),
                max_items=length_columns.get(name),
            )
            for name, data_type in ref_table_columns.items()
        },
        'required': list(info.features.keys()) + required_cols,
        'additionalProperties': False
    }

    # Create statistics info
    empty_statistics = {col: data_type.to_statistics_stub() for col, data_type in monitor_table_columns.items()
                        if data_type.to_statistics_stub() is not None}

    # To save the label map we must use string keys
    label_map = {str(key): val for key, val in info.label_map.items()} if info.label_map else None

    # Private columns are handled by us and are not exposed to the user
    private_columns = {SAMPLE_LOGGED_TIME_COL: ColumnType.DATETIME}
    # Save the label column in the reference table as private, in order to be able to query it later
    private_reference_columns = {REFERENCE_SAMPLE_ID_COL: ColumnType.INTEGER, **label_col}

    # Save version entity
    model_version = ModelVersion(
        name=info.name,
        model_id=model.id,
        monitor_json_schema=monitor_table_schema,
        reference_json_schema=reference_table_schema,
        features_columns=info.features,
        additional_data_columns=info.additional_data,
        meta_columns=meta_columns,
        model_columns=predictions_cols,
        feature_importance=info.feature_importance,
        statistics=empty_statistics,
        classes=info.classes,
        label_map=label_map,
        private_columns=private_columns,
        private_reference_columns=private_reference_columns,
        created_by=user.id,
        updated_by=user.id
    )

    session.add(model_version)
    # flushing to get an id for the model version, used to create the monitor + reference table names.
    await session.flush()

    # Monitor data table
    monitor_table_columns_sqlalchemy = column_types_to_table_columns({**monitor_table_columns, **private_columns})
    monitor_table_name = model_version.get_monitor_table_name()

    # using md5 hash index in queries to get random order of samples, so adding index for it
    monitor_table = Table(
        monitor_table_name,
        MetaData(),
        *monitor_table_columns_sqlalchemy,
        Index(f'_{monitor_table_name}_md5_index', text(f'md5({SAMPLE_ID_COL})'))
    )
    await session.execute(CreateTable(monitor_table))
    # Create indices
    for index in monitor_table.indexes:
        await session.execute(CreateIndex(index))

    # Reference data table
    reference_table_name = model_version.get_reference_table_name()
    reference_schema = {**ref_table_columns, **private_reference_columns}

    reference_table_columns_sqlalchemy = column_types_to_table_columns(
        reference_schema,
        primary_key=REFERENCE_SAMPLE_ID_COL
    )

    reference_table = Table(
        reference_table_name,
        MetaData(),
        *reference_table_columns_sqlalchemy,
        # TODO:
        # another possible solution is to use UUID type
        # with reference table 'SAMPLE_ID_COL' column
        Index(f'_{reference_table_name}_md5_index', text(f'md5({REFERENCE_SAMPLE_ID_COL}::varchar)'))
    )
    await session.execute(CreateTable(reference_table))
    # Create indices
    for index in reference_table.indexes:
        await session.execute(CreateIndex(index))

    return {'id': model_version.id}


class ModelVersionUpdateSchema(BaseModel):
    """ModelVersion update schema."""

    name: t.Optional[str] = None
    feature_importance: t.Optional[t.Dict[str, float]] = None

    @root_validator(pre=False, skip_on_failure=True)
    @classmethod
    def validate_instance(cls, values: t.Dict[str, t.Any]):
        """Make sure that at least one field was provided."""
        if values.get('name') is None and values.get('feature_importance') is None:
            raise ValueError('at least one of the fields must be provided')
        return values

    class Config:
        """Schema config."""

        orm_mode = True


@router.put(
    '/model-versions/{model_version_id}',
    tags=[Tags.MODELS],
    description='Update model version',
    status_code=HttpStatus.HTTP_200_OK
)
async def update_model_version(
        model_version_id: int,
        data: ModelVersionUpdateSchema,
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.CurrentUser()),
):
    """Update model version."""
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)

    if data.feature_importance is not None:
        # TODO: move to ModelVersion
        existing_features = set(model_version.features_columns.keys())
        provided_features = set(data.feature_importance.keys())
        unknown_features = provided_features.difference(existing_features)
        missing_features = existing_features.difference(provided_features)
        errors = []

        if len(unknown_features) > 0:
            errors.append(f'Unknown features: {list(unknown_features)}')
        if len(missing_features) > 0:
            errors.append(f'Missing features: {list(missing_features)}')

        if errors:
            msg = '. '.join(errors)
            raise BadRequest(
                '"feature_importance" must contain exactly same '
                f'features as model version. {msg}.'
            )

    try:
        await session.execute(
            update(ModelVersion)
            .where(ModelVersion.id == model_version_id)
            .values(created_by=user.id, updated_by=user.id, **data.dict(exclude_none=True))
        )
    except IntegrityError as error:
        if is_unique_constraint_violation_error(error):
            raise BadRequest('version with provided name already exists') from error
        else:
            raise


class ModelVersionSchema(BaseModel):
    """Model version schema."""

    id: int
    model_id: int
    name: str
    start_time: datetime
    end_time: datetime
    features_columns: t.Dict[str, t.Any]
    additional_data_columns: t.Dict[str, t.Any]
    model_columns: t.Dict[str, t.Any]
    meta_columns: t.Dict[str, t.Any]
    feature_importance: t.Optional[t.Dict[str, t.Any]]
    statistics: t.Optional[t.Dict[str, t.Any]]
    classes: t.Optional[t.List[str]]
    label_map: t.Optional[t.Dict[int, str]]
    balance_classes: bool

    class Config:
        """Schema config."""

        orm_mode = True


@router.get(
    '/model-versions/{model_version_id}',
    tags=[Tags.MODELS],
    description='Retrieve model version.',
    response_model=ModelVersionSchema,
    status_code=HttpStatus.HTTP_200_OK
)
async def retrieve_model_version_by_id(
        model_version_id: int,
        session: AsyncSession = AsyncSessionDep
) -> ModelVersionSchema:
    """Retrieve model version record."""
    model_version = await fetch_or_404(session, ModelVersion, id=model_version_id)
    return ModelVersionSchema.from_orm(model_version)


@router.get(
    '/models/{model_name}/model-versions/{version_name}',
    tags=[Tags.MODELS],
    description='Retrieve model version.',
    response_model=ModelVersionSchema,
    status_code=HttpStatus.HTTP_200_OK
)
async def retrieve_model_version_by_name(
        model_name: str = Path(..., description='Model name.'),
        version_name: str = Path(..., description='Model version name.'),
        session: ExtendedAsyncSession = AsyncSessionDep
) -> ModelVersionSchema:
    """Retrieve model version record."""
    model = await fetch_or_404(session, Model, name=model_name)
    model_version = await fetch_or_404(session, ModelVersion, name=version_name, model_id=model.id)
    return ModelVersionSchema.from_orm(model_version)


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
    dictionary containing:
        json schema of the monitored data in model version
        json schema of the reference data in model version
        feature columns schema
        non-feature columns schema
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    result = {
        'monitor_schema': model_version.monitor_json_schema,
        'reference_schema': model_version.reference_json_schema,
        'features': model_version.features_columns,
        'additional_data': model_version.additional_data_columns,
        'classes': model_version.classes,
        'label_map': model_version.label_map,
        'feature_importance': model_version.feature_importance
    }
    return result


@router.post('/model-versions/{model_version_id}/suite-run', tags=[Tags.CHECKS], response_class=HTMLResponse)
async def run_suite_on_model_version(
        model_version_id: int,
        monitor_options: SingleCheckRunOptions,
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


async def _get_data(model_version_id: int,
                    monitor_options: t.Union[TableDataSchema, WindowDataSchema],
                    session: AsyncSession,
                    is_ref):
    """Get data for a model version.

    Parameters
    ----------
    model_version_id : int
        The model version id.
    monitor_options : t.Union[TableDataSchema, WindowDataSchema]
        The monitor options.
    session : AsyncSession
        The database session.
    is_ref : bool
        Whether to get reference data (otherwise get production data).

    Returns
    -------
    ORJSONResponse
        The data in a json format.
    """
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, options=joinedload(ModelVersion.model),
                                                     id=model_version_id)

    columns = (list(model_version.features_columns.keys()) + list(model_version.additional_data_columns.keys()) +
               list(model_version.model_columns.keys()))
    if not is_ref:
        columns += list(model_version.meta_columns.keys())

    data_query = create_execution_data_query(model_version,
                                             session=session,
                                             options=monitor_options,
                                             columns=columns,
                                             n_samples=monitor_options.rows_count,
                                             is_ref=is_ref,
                                             with_labels=True)
    data_query = await data_query
    df = pd.DataFrame(data_query.all(), columns=[str(key) for key in data_query.keys()])

    if SAMPLE_TS_COL in df.columns:
        df[SAMPLE_TS_COL] = df[SAMPLE_TS_COL].apply(lambda x: x.isoformat())

    return ORJSONResponse(df.to_json(orient='records'))


@router.post('/model-versions/{model_version_id}/get-ref-data', tags=[Tags.MODELS], response_class=ORJSONResponse)
async def get_model_version_ref_data(
        model_version_id: int,
        monitor_options: TableDataSchema,
        session: AsyncSession = AsyncSessionDep
):
    """Get reference data for a model version.

    Parameters
    ----------
    model_version_id : int
        The id of the model version.
    monitor_options : TableDataSchema
        The options for the monitor data.
    session : AsyncSession
        The database session.

    Returns
    -------
    ORJSONResponse
        The reference data in a json format.
    """
    return await _get_data(model_version_id, monitor_options, session, True)


@router.post('/model-versions/{model_version_id}/get-prod-data', tags=[Tags.MODELS], response_class=ORJSONResponse)
async def get_model_version_prod_data(
        model_version_id: int,
        monitor_options: WindowDataSchema,
        session: AsyncSession = AsyncSessionDep
):
    """Get reference data for a model version.

    Parameters
    ----------
    model_version_id : int
        The id of the model version.
    monitor_options : WindowDataSchema
        The options for the monitor data.
    session : AsyncSession
        The database session.

    Returns
    -------
    ORJSONResponse
        The production data in a json format.
    """
    return await _get_data(model_version_id, monitor_options, session, False)


class TimeWindowSchema(BaseModel):
    """Monitor run schema."""

    end_time: t.Optional[str] = None
    start_time: t.Optional[str] = None

    def start_time_dt(self) -> 'pendulum.datetime.DateTime':
        """Get start time as datetime object."""
        return pdl.datetime(1970, 1, 1) if self.start_time is None else pdl.parse(self.start_time)

    def end_time_dt(self) -> 'pendulum.datetime.DateTime':
        """Get end time as datetime object."""
        return pdl.now() if self.end_time is None else pdl.parse(self.end_time)


class TimeWindowOutputStatsSchema(BaseModel):
    """Monitor run schema."""

    num_labeled_samples: t.Optional[int] = None
    num_samples: t.Optional[int] = None


@router.get(
    '/model-versions/{model_version_id}/time-window-statistics',
    response_model=TimeWindowOutputStatsSchema,
    tags=[Tags.DATA]
)
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
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, options=joinedload(ModelVersion.model),
                                                     id=model_version_id)
    test_table = model_version.get_monitor_table(session)
    sample_labels_table = model_version.model.get_sample_labels_table(session)
    sample_id = test_table.c[SAMPLE_ID_COL]
    sample_label = sample_labels_table.c[SAMPLE_LABEL_COL]
    sample_timestamp = test_table.c[SAMPLE_TS_COL]

    query = select(
        func.count(sample_id),
        func.count(sample_id).filter(sample_label.is_not(None))
    ).where(and_(
        sample_timestamp < body.end_time_dt(),
        sample_timestamp >= body.start_time_dt()
    )).join(
        sample_labels_table,
        onclause=test_table.c[SAMPLE_ID_COL] == sample_labels_table.c[SAMPLE_ID_COL],
        isouter=True
    )

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


@router.delete(
    '/models/{model_name}/model-versions/{version_name}',
    tags=[Tags.MODELS],
    description='Delete model version.'
)
async def delete_model_version_by_name(
        model_name: str = Path(..., description='Model name'),
        version_name: str = Path(..., description='Model version name'),
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser()),
):
    """Delete model version by name."""
    await _delete_model_version(
        organization=user.organization,
        model_identifier=ModelIdentifier(model_name, kind=IdentifierKind.NAME),
        version_identifier=ModelVersionIdentifier(version_name, kind=IdentifierKind.NAME),
        session=session,
    )


@router.delete(
    '/model-versions/{model_version_id}',
    tags=[Tags.MODELS],
    description='Delete model version by unique numerical identifier',
    status_code=HttpStatus.HTTP_200_OK
)
async def delete_model_version_by_id(
        model_version_id: int = Path(..., description='Model version id'),
        session: AsyncSession = AsyncSessionDep,
        user: User = Depends(auth.AdminUser()),
):
    """Delete model version by id.

    Parameters
    ----------
    model_version_id : int
        Version id to run function on.
    session : AsyncSession, optional
        SQLAlchemy session.
    """
    await _delete_model_version(
        organization=user.organization,
        version_identifier=ModelVersionIdentifier.from_request_params(model_version_id),
        session=session,
    )


async def _delete_model_version(
        *,
        organization: Organization,
        version_identifier: ModelVersionIdentifier,
        model_identifier: t.Optional[ModelIdentifier] = None,
        session: AsyncSession = AsyncSessionDep,
):
    """Delete model version.

    A caller needs to make sure that version identifier uses id field
    if model identifier is not given.
    """

    if model_identifier is not None:
        await exists_or_404(session, Model, **model_identifier.as_kwargs)
        model_version = await fetch_or_404(session, ModelVersion, **version_identifier.as_kwargs)
    else:
        if version_identifier.kind != IdentifierKind.ID:
            raise ValueError('Version name cannot be used without model identifier')
        model_version = await fetch_or_404(session, ModelVersion, **version_identifier.as_kwargs)

    await session.delete(model_version)
    tables = [f'"{organization.schema_name}"."{model_version.get_monitor_table_name()}"',
              f'"{organization.schema_name}"."{model_version.get_reference_table_name()}"']
    await insert_delete_db_table_task(session=session, full_table_paths=tables)
