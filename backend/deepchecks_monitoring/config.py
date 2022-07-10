# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the configuration for the deepchecks_monitoring package."""
import logging

from pydantic import BaseSettings, PostgresDsn

__all__ = ['Settings']


logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Settings for the deepchecks_monitoring package."""

    database_uri: PostgresDsn
    async_database_uri: PostgresDsn
    echo_sql: bool = True

    # jwt_secret_key: str = Field(..., env='SECRET_KEY')
    # jwt_algorithm: str = Field(..., env='ALGORITHM')
    # jwt_access_token_expire_minutes: int = Field(..., env='ACCESS_TOKEN_EXPIRE_MINUTES')

    class Config:
        """Config for the deepchecks_monitoring package."""

        env_file = '.env'
        env_file_encoding = 'utf-8'
