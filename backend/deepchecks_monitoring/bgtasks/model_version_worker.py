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
"""Contains alert scheduling logic."""
import logging.handlers
import typing as t

import aiokafka
import anyio
import pendulum as pdl
import uvloop
from redis.asyncio import Redis, RedisCluster
from redis.exceptions import RedisClusterException
from sqlalchemy import select

from deepchecks_monitoring.config import DatabaseSettings, KafkaSettings, RedisSettings
from deepchecks_monitoring.logic.keys import (MODEL_VERSIONS_QUEUE_KEY, MODEL_VERSIONS_SORTED_SET_KEY,
                                              get_data_topic_name)
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import ModelVersion


class ModelVersionWorker:
    """Model version worker logic."""

    def __init__(
            self,
            resource_provider: ResourcesProvider,
            redis: Redis,
            consumer,
            logger: logging.Logger,
            process_interval_seconds: int
    ):
        self.resource_provider = resource_provider
        self.logger = logger
        self.redis = redis
        self.process_interval_seconds = process_interval_seconds
        self.consumer = consumer

    async def run_move_from_set_to_queue(self):
        """Run the main loop."""
        try:
            while True:
                await self.move_single_item_set_to_queue()
        except anyio.get_cancelled_exc_class():
            self.logger.exception("Worker coroutine canceled")
            raise
        except Exception:
            self.logger.exception("Failure")
            raise
        except BaseException:
            self.logger.warning("Worker interrupted")
            raise

    async def move_single_item_set_to_queue(self):
        """Get single item from the sorted set and move it to the queue if needed."""
        items = await self.redis.zrange(MODEL_VERSIONS_SORTED_SET_KEY, 0, 0, withscores=True)
        # If set is empty, sleep and return
        if not items:
            self.logger.info("No items in set, sleeping for %s seconds", self.process_interval_seconds)
            await anyio.sleep(self.process_interval_seconds)
            return
        # Items are returned as tuple of (key, score)
        org_model_version, timestamp = items[0]
        # If still not enough time passed to run, sleep until needed to run
        now = pdl.now().int_timestamp
        if timestamp + self.process_interval_seconds > now:
            # We know that items are only added with sequential scores (timestamps), so we know we can sleep until the
            # first item is ready
            sleep_seconds = timestamp + self.process_interval_seconds - now
            self.logger.info("Next item is not ready yet, sleeping for %s seconds", sleep_seconds)
            await anyio.sleep(sleep_seconds)
            return
        # Two workers might get same item key, so if was already removed doesn't push to queue
        if await self.redis.zrem(MODEL_VERSIONS_SORTED_SET_KEY, org_model_version):
            await self.redis.rpush(MODEL_VERSIONS_QUEUE_KEY, org_model_version)
            self.logger.info("Moved item %s from set to queue", org_model_version)

    async def run_poll_from_queue(self):
        """Run the main loop."""
        try:
            while True:
                await self.calculate_single_item_in_queue()
        except anyio.get_cancelled_exc_class():
            self.logger.exception("Worker coroutine canceled")
            raise
        except Exception:
            self.logger.exception("Failure")
            raise
        except BaseException:
            self.logger.warning("Worker interrupted")
            raise

    async def calculate_single_item_in_queue(self, timeout=0):
        """Run the actual calculations on a given model version id."""
        # First argument is the queue key, second is the popped value. if timeout is none the command blocks
        # indefinitely until a value is found.
        value = await self.redis.blpop(MODEL_VERSIONS_QUEUE_KEY, timeout=timeout)
        # If there is a timeout value might be none if nothing found.
        if value is None:
            return
        self.logger.info("Popped item %s from queue", value)
        organization_id, model_version_id = value[1].decode().split("-")
        async with self.resource_provider.create_async_database_session(int(organization_id)) as session:
            # If session is none, organization was removed.
            if session is None:
                self.logger.info("Organization %s not exists, skipping", organization_id)
                return

            model_version: ModelVersion = (await session.execute(
                select(ModelVersion).where(ModelVersion.id == int(model_version_id))
            )).scalar_one_or_none()

            # Model version was deleted, doesn't need to do anything
            if model_version is None:
                self.logger.info("Model version %s not exists, skipping", model_version_id)
                return

            # Get kafka topic offset
            if self.consumer:
                topic = get_data_topic_name(organization_id, model_version_id)
                topics = (await self.consumer.topics())
                if topic in topics:
                    topic_partition = aiokafka.TopicPartition(get_data_topic_name(organization_id, model_version_id), 0)
                    # The end_offset returned is the next offset (end + 1)
                    assigment = list(self.consumer.assignment())
                    assigment.append(topic_partition)
                    self.consumer.assign(list(assigment))
                    model_version.topic_end_offset = await self.consumer.position(topic_partition) - 1
                else:
                    self.logger.info("Topic %s not exists, skipping", topic)

            # It's possible only messages where pushed to the queue, but no data was updated yet. In that case  does
            # not update statistics.
            if (model_version.last_statistics_update is None or
                    model_version.last_statistics_update < model_version.last_update_time):
                # TODO: calculate statistics
                # Set the last statistics update as the last update time in order avoid edge case. In data ingestion
                # we set current update time, so in rare use case we can run the worker here after the time was taken
                # but before the commit to the db completed. Therefore, when we use the last update time we are
                # guaranteed our calculations runs on data from at least that time, but if we take current time we
                # can't guarantee that.
                model_version.last_statistics_update = model_version.last_update_time
                pass


class WorkerSettings(DatabaseSettings, RedisSettings, KafkaSettings):
    """Worker settings."""

    logfile: t.Optional[str] = None
    loglevel: str = "INFO"
    logfile_maxsize: int = 10000000  # 10MB
    logfile_backup_count: int = 3
    uptrace_dsn: t.Optional[str] = None
    process_interval_seconds: int = 30
    num_workers: int = 3

    class Config:
        """Model config."""

        env_file = ".env"
        env_file_encoding = "utf-8"


async def init_redis(redis_uri):
    """Initialize redis connection."""
    try:
        redis = RedisCluster.from_url(redis_uri)
        await redis.ping()
        return redis
    except RedisClusterException:
        return Redis.from_url(redis_uri)


def execute_worker():
    """Execute worker."""

    async def main():
        settings = WorkerSettings()
        service_name = "model-version-worker"

        logger = configure_logger(
            name=service_name,
            log_level=settings.loglevel,
            logfile=settings.logfile,
            logfile_backup_count=settings.logfile_backup_count,
            uptrace_dsn=settings.uptrace_dsn,
        )

        async with ResourcesProvider(settings) as rp:
            # In tests for example we don't use kafka
            if rp.kafka_settings.kafka_host is not None:
                consumer = aiokafka.AIOKafkaConsumer(**rp.kafka_settings.kafka_params)
                await consumer.start()

            redis = await init_redis(rp.redis_settings.redis_uri)

            async with anyio.create_task_group() as g:
                worker = ModelVersionWorker(rp, redis, consumer, logger, settings.process_interval_seconds)
                # Creating single job to move items from set to queue, and multiple jobs to poll from the queue (the
                # heavy lifting part)
                g.start_soon(worker.run_move_from_set_to_queue)
                for _ in range(settings.num_workers):
                    g.start_soon(worker.run_poll_from_queue)

    uvloop.install()
    anyio.run(main)


if __name__ == "__main__":
    execute_worker()
