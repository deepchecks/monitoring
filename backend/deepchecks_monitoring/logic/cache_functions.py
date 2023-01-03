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

from deepchecks_monitoring.logic.keys import MODEL_VERSIONS_SORTED_SET_KEY, build_monitor_cache_key

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
        if self.redis:
            self.delete_keys_by_pattern = self.redis.register_script(delete_keys_by_pattern_script)
            self.delete_monitor_by_timestamp = self.redis.register_script(delete_monitor_by_timestamp_script)

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
            self.delete_keys_by_pattern(args=[pattern])
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)

    def delete_key(self, key):
        """Remove a given key from the cache."""
        self.redis.delete(key)

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

    def delete_monitor_cache_by_timestamp(self, organization_id: int, model_version_id: int, timestamps: t.List[int]):
        """Delete monitor cache entries by timestamp."""
        if not self.use_cache:
            return
        try:
            pattern = build_monitor_cache_key(organization_id, model_version_id, None, None, None)
            self.delete_monitor_by_timestamp(args=[pattern, *timestamps])
        except redis.exceptions.RedisError as e:
            self.logger.exception(e)


delete_keys_by_pattern_script = """
    local cursor = 0
    repeat
        local result = redis.call('SCAN', cursor, 'MATCH', ARGV[1])
        for _,key in ipairs(result[2]) do
            redis.call('DEL', key)
        end
        cursor = tonumber(result[1])
    until cursor == 0
"""


delete_monitor_by_timestamp_script = """
    local cursor = 0
    local pattern = table.remove(ARGV, 1)
    local timestamps = ARGV
    repeat
        local result = redis.call('SCAN', cursor, 'MATCH', pattern)
        for _,key in ipairs(result[2]) do
            local split = {key:match'(.+):(.+):(.+):(.+):(.+):(.+)'}
            local start_time, end_time = split[5], split[6]
            for _, ts in ipairs(timestamps) do
                if start_time <= ts and ts < end_time then
                    redis.call('DEL', key)
                    break
                end
            end
        end
        cursor = tonumber(result[1])
    until cursor == 0
"""
