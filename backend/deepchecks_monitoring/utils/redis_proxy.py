# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""A proxy for Redis client that handles connection errors."""

import asyncio

import redis.exceptions as redis_exceptions
from redis.asyncio.client import Redis
from redis.asyncio.cluster import RedisCluster
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisClusterException
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed

from deepchecks_monitoring.config import RedisSettings

redis_exceptions_tuple = tuple(  # Get all exception classes from redis.exceptions
    cls for _, cls in vars(redis_exceptions).items()
    if isinstance(cls, type) and issubclass(cls, Exception)
)


class RedisProxy:
    "A proxy for Redis client that handles connection errors."

    def __init__(self, settings: RedisSettings):
        self.settings = settings
        self.client = None

    async def init_conn_async(self):
        """Connect to Redis."""
        @retry(
            stop=stop_after_attempt(self.settings.stop_after_retries),
            wait=wait_fixed(self.settings.wait_between_retries),
            retry=retry_if_exception_type(redis_exceptions_tuple),
            reraise=True
        )
        async def connect_to_redis():
            try:
                self.client = RedisCluster.from_url(self.settings.redis_uri)
                await self.client.ping()
            except redis_exceptions_tuple:  # pylint: disable=catching-non-exception
                self.client = Redis.from_url(self.settings.redis_uri)
        await connect_to_redis()
