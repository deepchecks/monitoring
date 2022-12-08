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

import pendulum as pdl
import redis.exceptions
from redis.client import Redis

from deepchecks_monitoring.logic.keys import MODEL_VERSIONS_SORTED_SET_KEY


@dataclass
class CacheResult:
    """Holds results of search in cache."""

    found: bool
    value: t.Any


class CacheFunctions:
    """Class which holds all the actions on the redis cache."""

    def __init__(self, redis_client=None):
        self.use_cache = redis_client is not None
        self.redis: Redis = redis_client
        self.logger = logging.Logger("cache-functions")

    def build_monitor_cache_key(
            self,
            organization_id: t.Union[str, int],
            model_version_id: t.Union[str, int],
            monitor_id: t.Union[str, int],
            start_time: t.Union[pdl.DateTime, str],
            end_time: t.Union[pdl.DateTime, str]) -> str:
        """Build key for the cache using the given parameters.

        Parameters
        ----------
        organization_id: t.Union[str, int]
        model_version_id: t.Union[str, int]
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
        return f"mon_cache:{organization_id}:{model_version_id}:{monitor_id}:{start_time}:{end_time}"

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

    def get_monitor_cache(self, organization_id, model_version_id, monitor_id, start_time, end_time):
        """Get result from cache if exists. We can cache values which are "None" therefore to distinguish between the \
        situations we return CacheResult with 'found' property."""
        if self.use_cache:
            key = self.build_monitor_cache_key(organization_id, model_version_id, monitor_id, start_time, end_time)
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

    def set_monitor_cache(self, organization_id, model_version_id, monitor_id, start_time, end_time, value):
        """Set cache value for the properties given."""
        if not self.use_cache:
            return
        try:
            key = self.build_monitor_cache_key(organization_id, model_version_id, monitor_id, start_time, end_time)
            cache_val = json.dumps(value)
            self.redis.set(key, cache_val)
            # Set expiry of a week
            self.redis.expire(key, pdl.duration(days=7).in_seconds())
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def clear_monitor_cache(self, organization_id: int, monitor_id: int):
        """Clear entries from the cache.

        Parameters
        ----------
        organization_id: int
        monitor_id: int
            model version id to clear for.
        """
        if not self.use_cache:
            return
        try:
            monitor_id = monitor_id or "*"
            pattern = self.build_monitor_cache_key(organization_id, "*", monitor_id, "*", "*")
            for key in self.redis.scan_iter(pattern):
                self.redis.delete(key)
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def delete_key(self, key):
        """Remove a given key from the cache."""
        self.redis.delete(key)

    def scan_by_ids(self, organization_id, model_version_id: int) -> t.Iterator:
        """Scan all cache keys of a given model version."""
        pattern = self.build_monitor_cache_key(organization_id, model_version_id, "*", "*", "*")
        return self.redis.scan_iter(match=pattern)

    def add_to_process_set(self, organization_id: int, model_version_id: int):
        """Add model version to process set."""
        if not self.use_cache:
            return
        set_key = f"{organization_id}-{model_version_id}"
        self.redis.zadd(MODEL_VERSIONS_SORTED_SET_KEY, {set_key: pdl.now().int_timestamp}, nx=True)

    def get_and_incr_user_rate_count(self, user, time, count_added):
        """Get the user's organization samples count for the given minute, and increase by the given amount."""
        key = f"rate-limit:{user.organization.id}:{time.minute}"
        p = self.redis.pipeline()
        p.incr(key, count_added)
        p.expire(key, 60)
        count_after_increase = p.execute()[0]
        # Return the count before incrementing
        return count_after_increase - count_added
