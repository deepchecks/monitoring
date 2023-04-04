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
import json
import logging
import typing as t
from dataclasses import dataclass

import pendulum as pdl
import redis.exceptions
from redis.client import Redis

from deepchecks_monitoring.logic.keys import build_monitor_cache_key, get_invalidation_set_key

MONITOR_CACHE_EXPIRY_TIME = 60 * 60 * 24 * 7  # 7 days


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

    def get_monitor_cache(self, organization_id, model_version_id, monitor_id, start_time, end_time):
        """Get result from cache if exists. We can cache values which are "None" therefore to distinguish between the \
        situations we return CacheResult with 'found' property."""
        if self.use_cache:
            key = build_monitor_cache_key(organization_id, model_version_id, monitor_id, start_time, end_time)
            try:
                p = self.redis.pipeline()
                p.get(key)
                p.expire(key, MONITOR_CACHE_EXPIRY_TIME)
                cache_value = p.execute()[0]
                # If cache value is none it means the key was not found
                if cache_value is not None:
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
            key = build_monitor_cache_key(organization_id, model_version_id, monitor_id, start_time, end_time)
            cache_val = json.dumps(value)
            p = self.redis.pipeline()
            p.set(key, cache_val)
            p.expire(key, MONITOR_CACHE_EXPIRY_TIME)
            p.execute()
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
            pattern = build_monitor_cache_key(organization_id, None, monitor_id, None, None)
            keys_to_delete = []
            for key in self.redis.scan_iter(match=pattern):
                keys_to_delete.append(key)
            if keys_to_delete:
                self.redis.delete(*keys_to_delete)
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def delete_key(self, key):
        """Remove a given key from the cache."""
        self.redis.delete(key)

    def get_and_incr_user_rate_count(self, user, time, count_added):
        """Get the user's organization samples count for the given minute, and increase by the given amount."""
        key = f"rate-limit:{user.organization.id}:{time.minute}"
        p = self.redis.pipeline()
        p.incr(key, count_added)
        p.expire(key, 60)
        count_after_increase = p.execute()[0]
        # Return the count before incrementing
        return count_after_increase - count_added

    def add_invalidation_timestamps(self, organization_id: int, model_version_id: int, timestamps: t.Set[int]):
        key = get_invalidation_set_key(organization_id, model_version_id)
        now = pdl.now().timestamp()
        self.redis.zadd(key, {ts: now for ts in timestamps})
