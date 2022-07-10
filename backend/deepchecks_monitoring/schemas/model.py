# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the Model Schema."""
import typing as t
from pydantic import BaseModel
from deepchecks_monitoring.models.model import TaskType


__all__ = ['Model']


class Model(BaseModel):
    """Model schema."""

    id: t.Optional[int] = None
    name: t.Optional[str] = None
    description: t.Optional[str] = None
    task_type: t.Optional[TaskType] = None

    class Config:
        """Config for Model schema."""

        orm_mode = True
