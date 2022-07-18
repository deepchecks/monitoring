# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining the schemas for data input APIs."""
import typing as t

from pydantic import BaseModel

__all__ = ['ReferenceDataSchema']


class ReferenceDataSchema(BaseModel):
    """Schema defines the parameters for creating new model version."""

    data: t.List[t.Dict]
