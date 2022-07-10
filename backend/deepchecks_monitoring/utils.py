"""Module defining utility functions for the deepchecks_monitoring app."""
import typing as t
from fastapi import HTTPException
from fastapi import status
from sqlalchemy import literal
from sqlalchemy import and_
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession


if t.TYPE_CHECKING is True:
    from deepchecks_monitoring.models.base import Base


__all__ = ["exists_or_404", "not_exists_or_400", "fetch_or_404"]


A = t.TypeVar('A', bound="Base")


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
        "'{entity}' with next set of arguments does not exist - {arguments}"
    ))

    criteria = and_(*[getattr(model, k) == v for k, v in kwargs.items()])
    statement = select(model).where(criteria)
    result = await session.execute(statement)
    row = result.first()

    if row is None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_template.format(entity=model_name, arguments=args)
        )

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
        "'{entity}' with next set of arguments does not exist - {arguments}"
    ))

    criteria = and_(*[getattr(model, k) == v for k, v in kwargs.items()])
    statement = select(literal(True)).where(criteria)
    result = await session.execute(statement)

    if result.scalar() is None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_template.format(entity=model_name, arguments=args)
        )


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
        "'{entity}' with next set of arguments already exists - {arguments}"
    ))

    criteria = and_(*[getattr(model, k) == v for k, v in kwargs.items()])
    statement = select(literal(True)).where(criteria)
    result = await session.execute(statement)

    if result.scalar() is not None:
        model_name = getattr(model, "__name__", "Entity")
        args = "; ".join(f"{k}={v}" for k, v in kwargs.items())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_template.format(entity=model_name.capitalize(), arguments=args)
        )
