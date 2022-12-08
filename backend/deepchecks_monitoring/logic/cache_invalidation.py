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

from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.logic.kafka_consumer import consume_from_kafka
from deepchecks_monitoring.logic.keys import INVALIDATION_TOPIC_PREFIX, get_invalidation_topic_name, topic_name_to_ids


class CacheInvalidator:
    """Holds the logic for the cache invalidation. Can be overridden to alter the logic and sent in `create_app`."""

    def __init__(self, resources_provider, logger=None):
        self.resources_provider = resources_provider
        self.cache_funcs: CacheFunctions = resources_provider.cache_functions
        self.logger = logger or logging.getLogger("cache-invalidator")
        self._producer = None

    async def handle_invalidation_messages(self, tp, messages) -> bool:
        """Handle messages consumed from kafka."""
        timestamps = {int(m.value.decode()) for m in messages}
        organization_id, model_version_id = topic_name_to_ids(tp.topic)
        self.cache_funcs.delete_monitor_cache_by_timestamp(organization_id, model_version_id, timestamps)
        return True

    async def run_invalidation_consumer(self):
        """Create an endless-loop of consuming messages from kafka."""
        await consume_from_kafka(self.resources_provider.kafka_settings,
                                 self.handle_invalidation_messages,
                                 rf"^{INVALIDATION_TOPIC_PREFIX}\-.*$",
                                 self.logger)

    async def send_invalidation(self, organization_id, model_version_id, int_timestamps):
        """Send to kafka the timestamps which needs to invalidate the cache for the given topic."""
        topic_name = get_invalidation_topic_name(organization_id, model_version_id)
        self.resources_provider.ensure_kafka_topic(topic_name)

        if self._producer is None:
            self._producer = await self.resources_provider.kafka_producer

        send_futures = [await self._producer.send(topic_name, value=str(ts).encode("utf-8"))
                        for ts in int_timestamps]
        await asyncio.gather(*send_futures)
