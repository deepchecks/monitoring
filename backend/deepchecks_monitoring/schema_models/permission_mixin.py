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

import fastapi
import sqlalchemy as sa
from fastapi import Depends

from deepchecks_monitoring.dependencies import AsyncSessionDep
from deepchecks_monitoring.exceptions import AccessForbidden, NotFound


class PermissionMixin:
    """Mixin class for ORM entities that have metadata."""

    from deepchecks_monitoring.public_models.user import User
    from deepchecks_monitoring.utils import auth

    @classmethod
    @abc.abstractmethod
    def get_object_by_id(cls, id, user):
        raise NotImplementedError()

    @classmethod
    async def fetch_or_403(cls, session, id, user):
        obj = await session.scalar(cls.get_object_by_id(id, user))
        if obj is None:
            raise AccessForbidden(f"You do not have permissions to access this object.")
        return obj

    @classmethod
    async def get_object(cls, request: fastapi.Request,
                         user: User = Depends(auth.CurrentUser()),
                         session=AsyncSessionDep):
        id_param = cls.__tablename__[:-1] + '_id'
        id_param_val = request.query_params.get(id_param) or request.path_params.get(id_param)
        if id_param_val is None:
            return None
        base_obj_query = sa.select(cls).where(cls.id == int(id_param_val))
        obj = await session.scalar(base_obj_query)
        if obj is None:
            raise NotFound(f"{cls.__class__.__name__} with the identifier {id_param_val} was not found.")
        return await cls.fetch_or_403(session, obj.id, user)
