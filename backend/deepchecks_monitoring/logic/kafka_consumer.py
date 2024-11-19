# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Module defining an infinite consuming loop form kafka."""
import asyncio

from aiokafka import AIOKafkaConsumer, TopicPartition
from kafka.errors import KafkaError

from deepchecks_monitoring.config import KafkaSettings


async def consume_from_kafka(settings: KafkaSettings, handle_func, pattern, logger):
    """Create an endless-loop of consuming messages from kafka."""
    while True:
        consumer = None
        try:
            consumer = AIOKafkaConsumer(
                **settings.kafka_params,
                group_id="data_group",  # Consumer must be in a group to commit
                enable_auto_commit=False,  # Will disable autocommit
                auto_offset_reset="earliest",  # If committed offset not found, start from beginning,
                max_poll_records=500,
                session_timeout_ms=300 * 1000,
                heartbeat_interval_ms=60 * 1000,
                consumer_timeout_ms=60 * 1000,
            )
            await consumer.start()
            consumer.subscribe(pattern=pattern)
            while True:
                result = await consumer.getmany(timeout_ms=30 * 1000)
                for tp, messages in result.items():
                    tp: TopicPartition
                    if messages:
                        to_commit = await handle_func(consumer, tp, messages)
                        if to_commit:
                            offset = messages[-1].offset
                            await consumer.commit({tp: offset + 1})
        except KafkaError as e:  # pylint: disable=broad-except
            logger.exception(e)
        finally:
            if consumer:
                await consumer.stop()
        # If consumer fails sleep 30 seconds and tried again
        await asyncio.sleep(30)
