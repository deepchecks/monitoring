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
    def __init__(self, settings: RedisSettings):
        self.settings = settings
        self.client = self._connect(settings)

    @classmethod
    def _connect(cls, settings):
        """Connect to Redis."""
        try:
            client = RedisCluster.from_url(settings.redis_uri)
        except redis_exceptions_tuple:  # pylint: disable=catching-non-exception
            client = Redis.from_url(settings.redis_uri)

        return client

    def __getattr__(self, name):
        """Wrapp the Redis client with retry mechanism."""
        attr = getattr(self.client, name)
        _decorator = retry(stop=stop_after_attempt(self.settings.stop_after_retries),
                           wait=wait_fixed(self.settings.wait_between_retries),
                           retry=retry_if_exception_type(redis_exceptions_tuple),
                           reraise=True)
        if callable(attr):
            if asyncio.iscoroutinefunction(attr):
                @_decorator
                async def wrapped(*args, **kwargs):
                    try:
                        return await attr(*args, **kwargs)
                    except (RedisClusterException, RedisConnectionError):
                        self.client = self._connect(self.settings)
                        raise
            else:
                @_decorator
                def wrapped(*args, **kwargs):
                    try:
                        return attr(*args, **kwargs)
                    except (RedisClusterException, RedisConnectionError):
                        self.client = self._connect(self.settings)
                        raise

            return wrapped
        else:
            return attr
