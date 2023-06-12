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

from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep
from deepchecks_monitoring.exceptions import AccessForbidden, NotFound
from deepchecks_monitoring.utils import auth


class PermissionMixin:
    """Mixin class for ORM entities that have relation to a model."""

    @classmethod
    @abc.abstractmethod
    async def has_object_permissions(cls, session, obj_id, user):
        raise NotImplementedError()

    @classmethod
    async def assert_user_assigend_to_model(cls, session, obj_id, user):
        if not await cls.has_object_permissions(session, obj_id, user):
            raise AccessForbidden("You do not have permissions to access this object.")

    @classmethod
    async def get_object_from_http_request(
        cls,
        request: fastapi.Request,
        user=Depends(auth.CurrentUser()),
        session=AsyncSessionDep,
        resources_provider=ResourcesProviderDep,
    ):
        id_param = cls.__tablename__[:-1] + "_id"
        id_param_val = request.query_params.get(id_param) or request.path_params.get(id_param)
        if id_param_val is None:
            return None
        base_obj_query = sa.select(cls).where(cls.id == int(id_param_val))
        obj = await session.scalar(base_obj_query)
        if obj is None:
            raise NotFound(f"{cls.__class__.__name__} with the identifier {id_param_val} was not found.")
        if resources_provider.get_features_control(user).model_assignment:
            await cls.assert_user_assigend_to_model(session, obj.id, user)
        return obj
