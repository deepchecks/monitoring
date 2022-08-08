# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility functions for the deepchecks_monitoring app."""
import enum
import operator
import typing as t

import orjson
from pydantic import BaseModel
from sqlalchemy.engine import Row
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.exceptions import NotFound

if t.TYPE_CHECKING is True:
    from deepchecks_monitoring.models.base import Base  # pylint: disable=unused-import


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
    "json_dumps"
]


class OperatorsEnum(enum.Enum):
    """Operators for numeric and categorical filters."""

    GE = "greater_than_equals"
    GT = "greater_than"
    LE = "less_than_equals"
    LT = "less_than"
    CONTAINES = "in"
    EQ = "equals"
    NOT_EQ = "not_equals"


def make_oparator_func(oparator_enum: OperatorsEnum) -> t.Callable[[t.Any, t.Any], bool]:
    """Return an operator function according to our oparator enum."""
    op_not_split = oparator_enum.name.split("not_")
    if len(op_not_split) > 1:
        has_not = True
        op_name = op_not_split[1]
    else:
        has_not = False
        op_name = op_not_split[0]
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


class IdResponse(BaseModel):
    """Schema defines a response containing only id."""

    id: int


class CountResponse(BaseModel):
    """Schema defines a response containing only count."""

    count: int


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


A = t.TypeVar("A", bound="Base")


class TimeUnit(enum.IntEnum):
    """Time unit."""

    SECOND = 1
    MINUTE = 60 * SECOND
    HOUR = 60 * MINUTE
    DAY = 24 * HOUR
    WEEK = 7 * DAY


def json_dumps(data) -> str:
    """Serialize given object to JSON string."""
    return orjson.dumps(data).decode()


async def fetch_or_404(
    session: AsyncSession,
    model: t.Type[A],
    **kwargs
) -> A:
    """Fetch the first row that matches provided criteria or raise "No Found" exxception if `None` was returned.

    Parameters
    ----------
    session : AsyncSession
        sqlalchemy async sessions instance
    model : Type[Base]
        model class
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

    result = await model.filter_by(session, **kwargs)
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
