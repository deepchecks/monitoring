# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining base functionality for the models."""
import typing as t

from sqlalchemy import and_, delete, literal, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import declarative_base

__all__ = ['Base']


class BaseClass:
    """Base class for SqlAlchemy models which implements basic actions using AsyncSession."""

    @classmethod
    def where(cls, **kwargs):
        return and_(*[getattr(cls, k) == v for k, v in kwargs.items()])

    @classmethod
    async def update(cls, session: AsyncSession, model_id: int, values_to_update: t.Dict):
        result = await session.execute(update(cls).where(cls.where(id=model_id)).values(values_to_update))
        return result

    @classmethod
    async def filter_by(cls, session: AsyncSession, options=None, **filter_by):
        query = select(cls).where(cls.where(**filter_by))
        if options:
            options = options if isinstance(options, t.Iterable) else [options]
            query = query.options(*options)
        result = await session.execute(query)
        return result

    @classmethod
    async def exists(cls, session: AsyncSession, **filter_by):
        result = await session.execute(select(literal(True)).where(cls.where(**filter_by)))
        return result

    @classmethod
    async def delete(cls, session: AsyncSession, model_id: int):
        result = await session.execute(delete(cls).where(cls.where(id=model_id)))
        return result


# declarative base class
Base = t.cast(t.Any, declarative_base(cls=BaseClass))
