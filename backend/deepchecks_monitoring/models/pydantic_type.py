# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Defining pydantic type for sqlalchemy."""
# pylint: disable=unused-argument
from pydantic import BaseModel
from sqlalchemy import types
from sqlalchemy.dialects.postgresql import JSONB


class PydanticType(types.TypeDecorator):
    """Custom sqlalchemy type which wraps JSONB and allows forcing a pydantic schema on a json column."""

    impl = JSONB
    cache_ok = True

    def __init__(self, pydantic_model, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not issubclass(pydantic_model, BaseModel):
            raise Exception('Must use pydantic.BaseModel class')
        self.pydantic_model = pydantic_model

    def process_bind_param(self, value, dialect):
        """Get value assigned on column and returns dict."""
        if value is None:
            return None

        return self.pydantic_model(**value).dict()

    def process_result_value(self, value: dict, dialect):
        """Get dict from database column and return it as class defined."""
        if value is None:
            return None

        return self.pydantic_model(**value)
