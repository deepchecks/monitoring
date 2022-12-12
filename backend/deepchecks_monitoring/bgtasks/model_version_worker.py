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
import asyncio
import logging.handlers
import typing as t

import anyio
import pendulum as pdl
import uvloop
from kafka import KafkaConsumer
from sqlalchemy import select

from deepchecks_monitoring.config import DatabaseSettings, KafkaSettings, RedisSettings
from deepchecks_monitoring.logic.keys import MODEL_VERSIONS_QUEUE_KEY, MODEL_VERSIONS_SORTED_SET_KEY
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import ModelVersion


class ModelVersionWorker:
    """Model version worker logic."""

    def __init__(
            self,
            resource_provider: ResourcesProvider,
            logger: logging.Logger,
            process_interval_seconds: int
    ):
        self.resource_provider = resource_provider
        self.logger = logger
        self.redis = self.resource_provider.redis_client
        self.process_interval_seconds = process_interval_seconds
        # In tests for example we don't use kafka
        if resource_provider.kafka_settings.kafka_host is not None:
            self.consumer = KafkaConsumer(**self.resource_provider.kafka_settings.kafka_params)

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
        items = self.redis.zrange(MODEL_VERSIONS_SORTED_SET_KEY, 0, 0, withscores=True)
        # If set is empty, sleep for 1 second and return
        if not items:
            await asyncio.sleep(1)
            return
        # Items are returned as tuple of (key, score)
        org_model_version, timestamp = items[0]
        # If still not enough time passed to run, sleep until needed to run
        now = pdl.now().int_timestamp
        if timestamp + self.process_interval_seconds > now:
            # We know that items are only added with sequential scores (timestamps), so we know we can sleep until the
            # first item is ready
            await asyncio.sleep(timestamp + self.process_interval_seconds - now)
            return
        # Two workers might get same item key, so if was already removed doesn't push to queue
        if self.redis.zrem(MODEL_VERSIONS_SORTED_SET_KEY, org_model_version):
            self.redis.rpush(MODEL_VERSIONS_QUEUE_KEY, org_model_version)

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

    async def calculate_single_item_in_queue(self, timeout=None):
        """Run the actual calculations on a given model version id."""
        # First argument is the queue key, second is the popped value. if timeout is none the command blocks
        # indefinitely until a value is found.
        _, value = self.redis.blpop(MODEL_VERSIONS_QUEUE_KEY, timeout=timeout)
        # If there is a timeout value might be none if nothing found.
        if value is None:
            return
        organization_id, model_version_id = value.split("-")
        with self.resource_provider.create_async_database_session(organization_id) as session:
            # If session is none, organization was removed.
            if session is None:
                return

            model_version: ModelVersion = session.execute(
                select(ModelVersion).where(ModelVersion.id == model_version_id)
            ).scalar()

            # Model version was deleted, doesn't need to do anything
            if model_version is None:
                return

            # Get kafka topic offset
            if self.consumer:
                model_version.set_topic_offset(organization_id, self.consumer)

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
    process_interval_seconds: int = 600
    num_workers: int = 3

    class Config:
        """Model config."""

        env_file = ".env"
        env_file_encoding = "utf-8"


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
            async with anyio.create_task_group() as g:
                worker = ModelVersionWorker(rp, logger, settings.process_interval_seconds)
                # Creating single job to move items from set to queue, and multiple jobs to poll from the queue (the
                # heavy lifting part)
                g.start_soon(worker.run_move_from_set_to_queue)
                for _ in range(settings.num_workers):
                    g.start_soon(worker.run_poll_from_queue)

    uvloop.install()
    anyio.run(main)


if __name__ == "__main__":
    execute_worker()
