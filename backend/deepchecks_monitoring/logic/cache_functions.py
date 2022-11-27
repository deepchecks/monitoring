# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
"""Cache helper functions."""
# pylint: disable=unused-argument
import json
import logging
import typing as t
from dataclasses import dataclass

import fastapi
import pendulum as pdl
import redis.exceptions
from redis.client import Redis

from deepchecks_monitoring.models import ModelVersion


@dataclass
class CacheResult:
    """Holds results of search in cache."""

    found: bool
    value: t.Any


MODEL_VERSIONS_UPDATE = "model_versions_update"


class CacheFunctions:
    """Class which holds all the actions on the redis cache."""

    def __init__(self, redis_client=None):
        self.use_cache = redis_client is not None
        self.redis: Redis = redis_client
        self.logger = logging.Logger("cache-functions")

    def get_key_base_by_request(self, request: fastapi.Request):
        """Build the base of key to be used for this model version cache. We override this function when extending \
        this class."""
        return "mon_cache:"

    def get_key_base_by_topic(self, topic_name):
        """Build the base of key to be used for this model version cache. We override this function when extending \
        this class."""
        return "mon_cache:"

    def build_monitor_cache_key(
            self,
            key_base,
            model_version_id: t.Union[str, int],
            monitor_id: t.Union[str, int],
            start_time: t.Union[pdl.DateTime, str],
            end_time: t.Union[pdl.DateTime, str]) -> str:
        """Build key for the cache using the given parameters.

        Parameters
        ----------
        key_base: str
        model_version_id: int
            Can be either a model version id or a regex for pattern
        monitor_id: t.Union[str, int]
            Can be either a monitor id or a regex for pattern
        start_time: t.Union[pdl.DateTime, str]
            Can either be datetime or a regex for pattern
        end_time: t.Union[pdl.DateTime, str]
            Can either be datetime or a regex for pattern

        Returns
        -------
        str
        """
        end_time = str(end_time.int_timestamp) if isinstance(end_time, pdl.DateTime) else end_time
        start_time = str(start_time.int_timestamp) if isinstance(start_time, pdl.DateTime) else start_time
        return f"{key_base}{model_version_id}:{monitor_id}:{start_time}:{end_time}"

    def monitor_key_to_timestamps(self, key: t.Union[str, bytes]):
        """Extract from a key the start and end date from it.

        Parameters
        ----------
        key

        Returns
        -------
        Tuple[datetime, datetime]
        """
        key = key.decode() if isinstance(key, bytes) else key
        key_split = key.split(":")
        start_time = pdl.from_timestamp(int(key_split[-2]))
        end_time = pdl.from_timestamp(int(key_split[-1]))
        return start_time, end_time

    def get_monitor_cache(self, key_base, model_version_id, monitor_id, start_time, end_time):
        """Get result from cache if exists. We can cache values which are "None" therefore to distinguish between the \
        situations we return CacheResult with 'found' property."""
        if self.use_cache:
            key = self.build_monitor_cache_key(key_base, model_version_id, monitor_id, start_time, end_time)
            try:
                cache_value = self.redis.get(key)
                # If cache value is none it means the key was not found
                if cache_value is not None:
                    # Set the expiry longer for this key
                    self.redis.expire(key, pdl.duration(days=7).in_seconds())
                    return CacheResult(found=True, value=json.loads(cache_value))
            except redis.exceptions.RedisError as e:
                self.logger.exception(e)

        # Return no cache result
        return CacheResult(found=False, value=None)

    def set_monitor_cache(self, key_base, model_version_id, monitor_id, start_time, end_time, value):
        """Set cache value for the properties given."""
        if not self.use_cache:
            return
        try:
            key = self.build_monitor_cache_key(key_base, model_version_id, monitor_id, start_time, end_time)
            cache_val = json.dumps(value)
            self.redis.set(key, cache_val)
            # Set expiry of a week
            self.redis.expire(key, pdl.duration(days=7).in_seconds())
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def clear_monitor_cache(self, key_base: str, monitor_id: int):
        """Clear entries from the cache.

        Parameters
        ----------
        key_base: str
        monitor_id: int
            model version id to clear for.
        """
        if not self.use_cache:
            return
        try:
            monitor_id = monitor_id or "*"
            pattern = self.build_monitor_cache_key(key_base, "*", monitor_id, "*", "*")
            for key in self.redis.scan_iter(pattern):
                self.redis.delete(key)
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def delete_key(self, key):
        """Remove a given key from the cache."""
        self.redis.delete(key)

    def scan_by_topic_name(self, topic_name) -> t.Iterator:
        """Scan all cache keys of a given model version."""
        # Expected topic name last part to be model version id
        model_version_id = int(topic_name[topic_name.rfind("-") + 1:])
        pattern = self.build_monitor_cache_key(self.get_key_base_by_topic(topic_name), model_version_id, "*", "*", "*")
        return self.redis.scan_iter(match=pattern)

    def add_to_process_set_if_outdated(self, model_version: ModelVersion, request: fastapi.Request):
        """Add model version to process set."""
        self.redis.sadd(MODEL_VERSIONS_UPDATE, model_version.id)

    def add_to_process_set_from_ingestion_topic(self, topic_name):
        """Add model version to process set."""
        model_version_id = topic_name.split("-")[-1]
        self.redis.sadd(MODEL_VERSIONS_UPDATE, model_version_id)
