# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# pylint: disable=ungrouped-imports,import-outside-toplevel
"""Module defining utility functions for the deepchecks_monitoring app."""
import abc
import enum
import logging
import logging.handlers
import operator
import sys
import typing as t
from datetime import date, datetime
from typing import TYPE_CHECKING

import orjson
import sqlalchemy as sa
from fastapi import Depends, Path, Query
from pydantic import BaseModel, conlist, constr
from sqlalchemy.engine import Row
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import BinaryExpression
from sqlalchemy.sql.expression import ColumnOperators

from deepchecks_monitoring.exceptions import BadRequest, NotFound

if TYPE_CHECKING:
    from deepchecks_monitoring.public_models import Base


__all__ = [
    "exists_or_404",
    "ExtendedAsyncSession",
    "not_exists_or_400",
    "fetch_or_404",
    "TimeUnit",
    "DataFilter",
    "DataFilterList",
    "OperatorsEnum",
    "make_oparator_func",
    "json_dumps",
    "CountResponse",
    "IdResponse",
    "CheckParameterTypeEnum",
    "NameIdResponse",
    "field_length",
    "configure_logger",
    "ModelIdentifier",
    "CheckIdentifier",
    "MonitorCheckConf",
    "MetadataMixin"
]


class OperatorsEnum(str, enum.Enum):
    """Operators for numeric and categorical filters."""

    GE = "greater_than_equals"
    GT = "greater_than"
    LE = "less_than_equals"
    LT = "less_than"
    EQ = "equals"
    NOT_EQ = "not_equals"
    IN = "in"

    def __str__(self) -> str:
        """Return string representation."""
        return f"{self.__class__.__name__}.{self.name}"

    def __repr__(self) -> str:
        """Return string representation."""
        return self.__str__()


class CheckParameterTypeEnum(str, enum.Enum):
    """Supported customizable parameter types in checks."""

    FEATURE = "feature"
    SCORER = "scorer"
    AGGREGATION_METHOD = "aggregation method"
    CLASS = "class"
    PROPERTY = "property"

    def to_kwarg_name(self):
        """Return the SQLAlchemy type of the data type."""
        types_map = {
            CheckParameterTypeEnum.FEATURE: "columns",
            CheckParameterTypeEnum.SCORER: "scorers",
            CheckParameterTypeEnum.AGGREGATION_METHOD: "aggregation_method",
            CheckParameterTypeEnum.CLASS: "class_list_to_show",
            CheckParameterTypeEnum.PROPERTY: "property",
        }
        return types_map[self]


def make_oparator_func(oparator_enum: OperatorsEnum) -> t.Callable[[t.Any, t.Any], BinaryExpression]:
    """Return an operator function according to our oparator enum."""
    op_not_split = oparator_enum.name.split("not_")
    if len(op_not_split) > 1:
        has_not = True
        op_name = op_not_split[1]
    else:
        has_not = False
        op_name = op_not_split[0]
    if oparator_enum == OperatorsEnum.IN:
        return lambda a, b: not a.in_(b) if has_not else a.in_(b)
    else:
        op_func = getattr(operator, op_name.lower())
        return lambda a, b: not op_func(a, b) if has_not else op_func(a, b)


class DataFilter(BaseModel):
    """Filter to be used on data, column can be feature/non-feature and value can be numeric/string."""

    column: str
    operator: OperatorsEnum
    value: t.Any


class DataFilterList(BaseModel):
    """List of data filters."""

    filters: t.List[DataFilter]


class MonitorValueConf(BaseModel):
    """List of data filters."""

    name: str
    is_agg: t.Optional[bool]


class MonitorTypeConf(BaseModel):
    """List of data filters."""

    type: str
    values: t.Union[t.List[MonitorValueConf], None]
    is_agg_shown: t.Optional[bool]


class MonitorCheckConf(BaseModel):
    """List of data filters."""

    check_conf: t.Union[t.List[MonitorTypeConf], None]
    res_conf: t.Union[MonitorTypeConf, None]


class MonitorCheckConfSchema(BaseModel):
    """List of data filters."""

    check_conf: t.Dict[CheckParameterTypeEnum, t.Optional[conlist(constr(min_length=1), min_items=1)]]
    res_conf: t.Union[conlist(constr(min_length=1), min_items=1), None]

    class Config:
        use_enum_values = True


class IdResponse(BaseModel):
    """Schema defines a response containing only id."""

    id: int

    class Config:
        """Schema config."""

        orm_mode = True


class NameIdResponse(BaseModel):
    """Schema defines a response containing only id and name."""

    id: int
    name: str

    class Config:
        """Schema config."""

        orm_mode = True


class CountResponse(BaseModel):
    """Schema defines a response containing only count."""

    count: int

    class Config:
        """Schema config."""

        orm_mode = True


class ExtendedAsyncSession(AsyncSession):
    """Extended async session."""

    async def fetchone_or_404(
        self,
        statement: t.Any,
        message: str
    ) -> Row:
        """Fetch the first row or raise "No Found" exxception if `None` was returned."""
        result = await self.execute(statement)
        row = result.scalars().first()
        if row is None:
            raise NotFound(message)
        return row

    async def exists_or_404(
        self,
        statement: t.Any,
        message: str
    ):
        """Make sure the record exists, otherwise, raise "Not Found" exception."""
        result = await self.scalar(sa.select(sa.exists(statement)))
        if result is False:
            raise NotFound(message)


A = t.TypeVar("A", bound="Base")


class TimeUnit(enum.IntEnum):
    """Time unit."""

    SECOND = 1
    MINUTE = 60 * SECOND
    HOUR = 60 * MINUTE
    DAY = 24 * HOUR
    WEEK = 7 * DAY


def _none_serializable_to_json(obj):
    """Serialize none serializable objects to a JSON serializable object."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def json_dumps(data) -> str:
    """Serialize given object to JSON string."""
    return orjson.dumps(data, default=_none_serializable_to_json).decode()


async def fetch_or_404(
    session: AsyncSession,
    model: t.Type[A],
    options=None,
    **kwargs
) -> A:
    """Fetch the first row that matches provided criteria or raise "No Found" exxception if `None` was returned.

    Parameters
    ----------
    session : AsyncSession
        sqlalchemy async sessions instance
    model : Type[Base]
        model class
    options
    error_template : Optional[str], default None
        template of an exception message (possible keys: entity, arguments)
    **kwargs : Any
        key-value arguments are used as a set of criterias joined by `and` operation

    Returns
    -------
    Row
        first row that matches provided criteria

    Examples
    --------
    >>> class Person(Base):
    ...    name = Column(String(50))
    ...    last_name = Column(String(50))

    >>> await fetch_or_404(
    ...     session=session,
    ...     model=Person,
    ...     name='Angelina',
    ...     last_name='Jolie',
    ... )
    """
    error_template = t.cast(str, kwargs.pop(
        "error_template",
        "'{entity}' with next set of arguments does not exist: {arguments}"
    ))

    result = await model.filter_by(session, options, **kwargs)
    row = result.scalars().first()

    if row is None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise NotFound(error_template.format(entity=model_name, arguments=args))

    return row


async def exists_or_404(
    session: AsyncSession,
    model: t.Type["Base"],
    **kwargs
):
    """Make sure the record exists, otherwise, raise "Not Found" exception.

    Parameters
    ----------
    session : AsyncSession
        sqlalchemy async sessions instance
    model : Type[Base]
        model class
    error_template : Optional[str], default None
        template of a exception message (possible keys: entity, arguments)
    **kwargs : Any
        key-value arguments are used as a set of criterias joined by `and` operation

    Examples
    --------
    >>> class Person(Base):
    ...    name = Column(String(50))
    ...    last_name = Column(String(50))
    ...    sex = Column(String(10))
    >>> await exists_or_404(
    ...     session=session,
    ...     model=Person,
    ...     name='Maria',
    ...     sex='Female',
    ... )
    """
    error_template = t.cast(str, kwargs.pop(
        "error_template",
        "'{entity}' with next set of arguments does not exist: {arguments}"
    ))

    result = await model.exists(session, **kwargs)

    if result.scalar() is None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise NotFound(error_template.format(entity=model_name, arguments=args))


async def not_exists_or_400(
    session: AsyncSession,
    model: t.Type["Base"],
    **kwargs
):
    """Make sure there is no a record that matches provided criteria, otherwise, raise "Bad Request" exception.

    Parameters
    ----------
    session : AsyncSession
        sqlalchemy async sessions instance
    model : Type[Base]
        model class
    error_template : Optional[str], default None
        template of a exception message (possible keys: entity, arguments)
    **kwargs : Any
        key-value arguments are used as a set of criterias joined by `and` operation

    Examples
    --------
    >>> class Person(Base):
    ...    name = Column(String(50))
    ...    last_name = Column(String(50))
    ...    age = Column(Int)
    >>> await not_exists_or_400(
    ...     session=session,
    ...     model=Person,
    ...     name='Jonh',
    ...     age=32,
    ... )
    """
    error_template = t.cast(str, kwargs.pop(
        "error_template",
        "'{entity}' with next set of arguments already exists: {arguments}"
    ))

    result = await model.exists(session, **kwargs)

    if result.scalar() is not None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise NotFound(error_template.format(entity=model_name.capitalize(), arguments=args))


def field_length(column) -> int:
    """Return model field length."""
    result = getattr(column.expression.type, "length", None)
    if not isinstance(result, int):
        raise ValueError(f"Field {column.expression.key} does not have length or it is not set")
    return result


def configure_logger(
    name: str,
    log_level: str = "INFO",
    message_format: str = "%(asctime)s %(levelname)s %(name)s %(message)s",
    logfile: t.Optional[str] = None,
    logfile_backup_count: int = 3,
):
    """Configure logger instance."""
    logger = logging.getLogger(name)
    logger.propagate = True
    logger.setLevel(log_level)
    formatter = logging.Formatter(message_format)

    h = logging.StreamHandler(sys.stdout)
    h.setLevel(log_level)
    h.setFormatter(formatter)
    logger.addHandler(h)

    if logfile:
        h = logging.handlers.RotatingFileHandler(
            filename=logfile,
            maxBytes=logfile_backup_count,
        )
        h.setLevel(log_level)
        h.setFormatter(formatter)
        logger.addHandler(h)

    return logger


def fetch_unused_monitoring_tables(session: Session) -> t.List[str]:
    """Fetch names of unused monitoring tables."""
    from deepchecks_monitoring.schema_models import ModelVersion

    model_versions = session.scalars(sa.select(ModelVersion)).all()
    active_monitoring_tables = set()

    for version in model_versions:
        active_monitoring_tables.add(version.get_monitor_table_name())
        active_monitoring_tables.add(version.get_reference_table_name())

    existing_tables = session.scalars(sa.text(
        "SELECT DISTINCT tablename "
        "FROM pg_catalog.pg_tables "
        "WHERE tablename LIKE 'model_%_monitor_data_%' OR tablename LIKE 'model_%_ref_data_%'"
    )).all()

    return list(set(existing_tables).difference(active_monitoring_tables))


class EntityIdentifierError(ValueError):
    pass


TEntityIdentifier = t.TypeVar("TEntityIdentifier", bound="EntityIdentifier")


class IdentifierKind(enum.Enum):
    """Identifier kind."""

    ID = "id"
    NAME = "name"


class EntityIdentifier(abc.ABC):
    """Orm entities utility class.

    The purpose of this class is to facilitate ORM entities
    lookup (selection) by their unique identifier - 'id' and 'name'

    Parameters
    ==========
    value : Union[int, str]
        value of unique identifier
    model : Any
        ORM model type
    kind : Union[Literal[id], Literal[name]] , default "id"
        kind of unique identifier

    Attributes
    ==========
    as_kwargs : Dict[str, Any]
        a dictionary instance that contains identifier name->value pair
    as_expression : ColumnOperators
        sqlalchemy filtering expression (identifier-name == identifier-value)
    """

    path_parameter_name: t.ClassVar[str] = "identifier"
    path_parameter_desc: t.ClassVar[str] = ""
    kind: IdentifierKind
    as_kwargs: t.Dict[str, t.Union[int, str]]
    as_expression: ColumnOperators

    @classmethod
    def from_request_params(
        cls: t.Type[TEntityIdentifier],
        value: t.Union[int, str],
        kind: IdentifierKind = IdentifierKind.ID,
        additional_parameter_name: str = "identifier_kind",
    ) -> TEntityIdentifier:
        """Create an identity identifier.

        This method exists only for use in the HTTP handler
        context in order to re-raise 'EntityIdentifierError'
        exception as a 'BadRequest' exception. Raising a 'BadRequest'
        exception instance in the 'EntityIdentifier' constructor
        directly will make this utility class unusable in other contexts,
        therefore we need this method.
        """
        try:
            return cls(value=value, kind=kind)
        except EntityIdentifierError as e:
            raise BadRequest(
                f"{e.args[0]}, if you use an entity name to query "
                "data then you need to provide an additional HTTP "
                f"query parameter: {additional_parameter_name}=name"
            ) from e

    def __init__(
        self,
        value: t.Union[int, str],
        kind: IdentifierKind = IdentifierKind.ID,
    ):
        if not isinstance(value, (int, str)):
            raise ValueError(f"Expected a integer|string value but got - {type(value)}")

        self.kind = kind
        entity = self.entity

        if kind == IdentifierKind.NAME:
            self.value = str(value)
            self.column = entity.name
            self.column_name = "name"
            self.as_kwargs = {"name": self.value}
            self.as_expression = entity.name == self.value
            self._repr = f"name={self.value}"
        elif kind == IdentifierKind.ID:
            try:
                self.value = int(value)
            except ValueError as e:
                raise EntityIdentifierError("entity id value must be of an integer type") from e
            else:
                self.column = entity.id
                self.column_name = "id"
                self.as_kwargs = {"id": self.value}
                self.as_expression = entity.id == self.value
                self._repr = f"id={self.value}"

    def __repr__(self) -> str:
        return self._repr

    @property
    @abc.abstractmethod
    def entity(self):
        raise NotImplementedError()

    @classmethod
    def resolver(
        cls,
        *,
        parameter_name: t.Optional[str] = None,
        parameter_desc: t.Optional[str] = None,
    ) -> t.Any:
        """Create fastapi dependency resolver.

        Creates a callable instance that will resolve an
        EntityIdentifier instance from HTTP request data.
        """
        parameter_name = parameter_name or cls.path_parameter_name
        parameter_desc = parameter_desc or cls.path_parameter_desc

        def resolver_fn(
            identifier: t.Union[str, int] = Path(
                alias=parameter_name,
                description=parameter_desc
            ),
            identifier_kind: IdentifierKind = Query(
                default=IdentifierKind.ID,
                description="A flag that indicates which kind of entity identifier to use: id or name"
            )
        ):
            return cls.from_request_params(value=identifier, kind=identifier_kind)

        return Depends(resolver_fn)


class ModelIdentifier(EntityIdentifier):
    """Model identifier which is either a model id or a model name."""

    path_parameter_name = "model_id"
    path_parameter_desc = "Model id or name"

    @property
    def entity(self):
        """Return the ORM entity."""
        from deepchecks_monitoring.schema_models import Model
        return Model


class ModelVersionIdentifier(EntityIdentifier):
    """Model version identifier which is either a model id or a model name."""

    path_parameter_name = "model_version_id"
    path_parameter_desc = "Model Version id or name"

    @property
    def entity(self):
        """Return the ORM entity."""
        from deepchecks_monitoring.schema_models import ModelVersion
        return ModelVersion


class CheckIdentifier(EntityIdentifier):
    """Check identifier which is either a model id or a model name."""

    path_parameter_name = "check_id"
    path_parameter_desc = "Check id or name"

    @property
    def entity(self):
        """Return the ORM entity."""
        from deepchecks_monitoring.schema_models import Check
        return Check


class MetadataMixin:
    """Mixin class for ORM entities that have metadata."""

    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    created_by = sa.Column(sa.Integer, primary_key=False, nullable=False)
    updated_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
                           onupdate=sa.func.now())
    updated_by = sa.Column(sa.Integer, nullable=False)
