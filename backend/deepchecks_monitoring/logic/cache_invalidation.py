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
import logging

import pendulum as pdl

from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.kafka_consumer import consume_from_kafka

TOPIC_PREFIX = "invalidation"


class CacheInvalidator:
    """Holds the logic for the cache invalidation. Can be overridden to alter the logic and sent in `create_app`."""

    def __init__(self, resources_provider, cache_funcs: CacheFunctions, logger=None):
        self.resources_provider = resources_provider
        self.cache_funcs = cache_funcs
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

    async def handle_invalidation_messages(self, tp, messages):
        """Handle messages consumed from kafka."""
        topic = tp.topic
        timestamps = {pdl.parse(m.value.decode()) for m in messages}
        for key in self.cache_funcs.scan_by_topic_name(topic):
            start_time, end_time = self.cache_funcs.key_to_times(key)
            if any((start_time <= ts < end_time for ts in timestamps)):
                self.cache_funcs.delete_key(key)

    async def handle_failed_invalidation_messages(self, *_):
        """Handle failed invalidation messages."""
        # Always commit also on fails
        return True

    async def run_invalidation_consumer(self):
        """Create an endless-loop of consuming messages from kafka."""
        await consume_from_kafka(self.resources_provider.kafka_settings,
                                 self.handle_invalidation_messages,
                                 self.handle_failed_invalidation_messages,
                                 rf"^{TOPIC_PREFIX}\-.*$",
                                 self.logger)

    async def send_invalidation(self, timestamps, tp):
        """Send to kafka the timestamps which needs to invalidate the cache for the given topic."""
        rounded_ts_set = {ts.astimezone(pdl.UTC).set(minute=0, second=0, microsecond=0) for ts in timestamps}

        topic_name = self.generate_invalidation_topic_name(tp.topic)
        producer = await self.resources_provider.kafka_producer
        send_future = None
        for ts in rounded_ts_set:
            message = ts.isoformat().encode("utf-8")
            send_future = await producer.send(topic_name, value=message)
        # Waiting on the last future since the messages are sent in order anyway
        await send_future
