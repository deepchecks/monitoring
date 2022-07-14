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
from sqlalchemy import and_, literal, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import declarative_base

__all__ = ['Base']


class BaseActions:
    """Base class for SqlAlchemy models which implements basic actions using AsyncSession."""

    @classmethod
    def where(cls, **kwargs):
        return and_(*[getattr(cls, k) == v for k, v in kwargs.items()])

    @classmethod
    async def update(cls, session: AsyncSession, model_id: int, values_to_update):
        result = await session.execute(update(cls).where(cls.where(id=model_id)).values(values_to_update))
        return result

    @classmethod
    async def filter_by(cls, session: AsyncSession, **filter_by):
        result = await session.execute(select(cls).where(cls.where(**filter_by)))
        return result

    @classmethod
    async def exists(cls, session: AsyncSession, filter_by):
        result = await session.execute(select(literal(True)).where(cls.where(**filter_by)))
        return result


# declarative base class
Base = declarative_base(cls=BaseActions)
