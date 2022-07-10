# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the ModelVersion schema."""
import typing as t

from pydantic import BaseModel

from deepchecks_monitoring.models.model_version import ColumnDataType, ColumnRole

__all__ = ['NewVersionSchema']


class NewVersionSchema(BaseModel):
    """Schema defines the parameters for creating new model version."""

    name: str = None
    features_importance: t.Optional[t.Dict[str, float]] = None
    column_roles: t.Dict[str, ColumnRole]
    column_types: t.Dict[str, ColumnDataType]

    class Config:
        """Config for ModelVersion schema."""

        orm_mode = True
