# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining worker and functions for cache invalidation."""
import asyncio
import logging

import pendulum as pdl

from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.kafka_consumer import consume_from_kafka

TOPIC_PREFIX = "invalidation"


class CacheInvalidator:
    """Holds the logic for the cache invalidation. Can be overridden to alter the logic and sent in `create_app`."""

    def __init__(self, resources_provider, logger=None):
        self.resources_provider = resources_provider
        self.cache_funcs: CacheFunctions = resources_provider.cache_functions
        self.logger = logger or logging.getLogger("cache-invalidator")

    def generate_invalidation_topic_name(
            self,
            data_topic_name,
    ):
        """Transform data topic name into invalidation topic name.

        Returns
        -------
        str
            Name of the data topic to be used for invalidation topic name.
        """
        # Removes the first part of the topic name up to "-"
        topic_suffix = data_topic_name[data_topic_name.find("-"):]
        return f"{TOPIC_PREFIX}{topic_suffix}"

    async def handle_invalidation_messages(self, tp, messages) -> bool:
        """Handle messages consumed from kafka."""
        topic_name = tp.topic
        timestamps = {pdl.parse(m.value.decode()) for m in messages}
        self.clear_monitor_cache_by_topic_name(timestamps, topic_name)
        return True

    def clear_monitor_cache_by_topic_name(self, timestamps, topic_name):
        """Clear monitor cache by topic name for given timestamps."""
        for key in self.cache_funcs.scan_by_topic_name(topic_name):
            start_time, end_time = self.cache_funcs.monitor_key_to_timestamps(key)
            if any((start_time <= ts < end_time for ts in timestamps)):
                self.cache_funcs.delete_key(key)

    async def run_invalidation_consumer(self):
        """Create an endless-loop of consuming messages from kafka."""
        await consume_from_kafka(self.resources_provider.kafka_settings,
                                 self.handle_invalidation_messages,
                                 rf"^{TOPIC_PREFIX}\-.*$",
                                 self.logger)

    async def send_invalidation(self, timestamps, topic_name):
        """Send to kafka the timestamps which needs to invalidate the cache for the given topic."""
        rounded_ts_set = {ts.astimezone(pdl.UTC).set(minute=0, second=0, microsecond=0) for ts in timestamps}

        topic_name = self.generate_invalidation_topic_name(topic_name)
        producer = await self.resources_provider.kafka_producer
        send_futures = [await producer.send(topic_name, value=ts.isoformat().encode("utf-8"))
                        for ts in rounded_ts_set]
        await asyncio.gather(*send_futures)
