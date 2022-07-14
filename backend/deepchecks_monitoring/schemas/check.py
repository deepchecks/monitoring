# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the Check Schema."""
import typing as t

from deepchecks.core.checks import CheckConfig
from pydantic import BaseModel

__all__ = ['CheckSchema']


class CheckSchema(BaseModel):
    """Check schema."""

    config: CheckConfig
    id: t.Optional[int] = None
    name: t.Optional[str] = None

    class Config:
        """Config for Check schema."""

        orm_mode = True
