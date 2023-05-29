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
import inspect
import logging.handlers
import typing as t

import aiokafka
import anyio
import pendulum as pdl
import uvloop
from redis.asyncio import Redis, RedisCluster
from redis.exceptions import RedisClusterException
from sqlalchemy import select

from deepchecks_monitoring.bgtasks.alert_task import AlertsTask
from deepchecks_monitoring.bgtasks.delete_db_table_task import DeleteDbTableTask
from deepchecks_monitoring.bgtasks.model_data_ingestion_alerter import ModelDataIngestionAlerter
from deepchecks_monitoring.bgtasks.model_version_cache_invalidation import ModelVersionCacheInvalidation
from deepchecks_monitoring.bgtasks.model_version_offset_update import ModelVersionOffsetUpdate
from deepchecks_monitoring.bgtasks.model_version_topic_delete import ModelVersionTopicDeletionWorker
from deepchecks_monitoring.bgtasks.object_storage_ingestor import ObjectStorageIngestor
from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.logic.keys import GLOBAL_TASK_QUEUE
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task
from deepchecks_monitoring.utils.other import ExtendedAIOKafkaAdminClient

try:
    from deepchecks_monitoring import ee
    from deepchecks_monitoring.ee.resources import ResourcesProvider

    with_ee = True
except ImportError:
    from deepchecks_monitoring.resources import ResourcesProvider

    with_ee = False


class TaskRunner:
    """Task runner."""

    def __init__(
            self,
            resource_provider: ResourcesProvider,
            redis,
            workers: t.List[BackgroundWorker],
            logger: logging.Logger,
    ):
        self.resource_provider = resource_provider
        self.redis = redis
        self.logger = logger
        self.workers = {w.queue_name(): w for w in workers}

    async def run(self):
        """Run the main loop."""
        try:
            while True:
                task = await self.wait_for_task()
                if task:
                    task_id, queued_timestamp = task
                    async with self.resource_provider.create_async_database_session() as session:
                        await self.run_single_task(task_id, session, queued_timestamp)

        except anyio.get_cancelled_exc_class():
            self.logger.exception('Worker coroutine canceled')
            raise
        except Exception:
            self.logger.exception('Failure')
            raise
        except BaseException:
            self.logger.warning('Worker interrupted')
            raise

    async def wait_for_task(self, timeout=0):
        # Question: do we want to hold a lock for edge cases?
        # For example the retry time is 10 minutes. If there is 10 minutes delay in the runner, same task will be pushed
        # again, and if a second runner will get the task before the first one removed it, it will be ran twice.

        task_entry = self.redis.bzpopmin(GLOBAL_TASK_QUEUE, timeout=timeout)
        # allow async redis or normal redis for testing

        if inspect.iscoroutine(task_entry):
            task_entry = await task_entry

        # If timeout is not 0 we might get return value of None
        if task_entry is None:
            self.logger.debug('Got from redis queue task_id none')
            return
        else:
            # Return value from redis is (redis key, value, score)
            task_id = int(task_entry[1].decode())
            queued_timestamp: int = task_entry[2]
            return task_id, queued_timestamp

    async def run_single_task(self, task_id, session, queued_timestamp):
        # queued_time is not used but logged in telemetry
        task = await session.scalar(select(Task).where(Task.id == task_id))
        # Making sure task wasn't deleted for some reason
        if task is None:
            self.logger.debug(f'Got already removed task id: {task_id}')
            return
        await self._run_task(task, session, queued_timestamp)

    async def _run_task(self, task: Task, session, queued_timestamp):
        """Inner function to run task, created in order to wrap in the telemetry instrumentor and be able
        to log the task parameters and queued time."""
        try:
            worker: BackgroundWorker = self.workers.get(task.bg_worker_task)
            if worker:
                start = pdl.now()
                await worker.run(task, session, self.resource_provider)
                duration = (pdl.now() - start).total_seconds()
                delay = start.int_timestamp - queued_timestamp
                self.logger.info({'duration': duration, 'task': task.bg_worker_task, 'delay': delay})
            else:
                self.logger.error(f'Unknown task type: {task.bg_worker_task}')
        except Exception:  # pylint: disable=broad-except
            self.logger.exception('Exception running task')


class BaseWorkerSettings():
    """Worker settings."""

    logfile: t.Optional[str] = None
    loglevel: str = 'INFO'
    logfile_maxsize: int = 10000000  # 10MB
    logfile_backup_count: int = 3
    num_workers: int = 10

    class Config:
        """Model config."""

        env_file = '.env'
        env_file_encoding = 'utf-8'


if with_ee:
    class WorkerSettings(BaseWorkerSettings, ee.config.Settings):
        """Set of worker settings."""
        pass
else:
    class WorkerSettings(BaseWorkerSettings, Settings):
        """Set of worker settings."""
        pass


async def init_async_redis(redis_uri):
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
        service_name = 'tasks-runner'

        logger = configure_logger(
            name=service_name,
            log_level=settings.loglevel,
            logfile=settings.logfile,
            logfile_backup_count=settings.logfile_backup_count,
        )

        # When running main it creates TaskRunner under __main__ module, which fails
        # the telemetry collection. Adding here this import to fix this
        from deepchecks_monitoring.bgtasks import tasks_runner  # pylint: disable=import-outside-toplevel

        if with_ee:
            if settings.sentry_dsn:
                import sentry_sdk  # pylint: disable=import-outside-toplevel

                sentry_sdk.init(
                    dsn=settings.sentry_dsn,
                    traces_sample_rate=0.1,
                    environment=settings.sentry_env
                )
                ee.utils.telemetry.collect_telemetry(tasks_runner.TaskRunner)
                # Ignoring this logger since it can spam sentry with errors
                sentry_sdk.integrations.logging.ignore_logger('aiokafka.cluster')

        # AIOKafka is spamming our logs, disable it for errors and warnings
        logging.getLogger('aiokafka.cluster').setLevel(logging.CRITICAL)

        async with ResourcesProvider(settings) as rp:
            async_redis = await init_async_redis(rp.redis_settings.redis_uri)
            consumer = aiokafka.AIOKafkaConsumer(**rp.kafka_settings.kafka_params)
            await consumer.start()
            kafka_admin = ExtendedAIOKafkaAdminClient(**rp.kafka_settings.kafka_params)
            await kafka_admin.start()

            workers = [ModelVersionTopicDeletionWorker(kafka_admin),
                       ModelVersionOffsetUpdate(consumer),
                       ModelVersionCacheInvalidation(),
                       ModelDataIngestionAlerter(),
                       DeleteDbTableTask(),
                       AlertsTask(),
                       ObjectStorageIngestor(rp)]

            async with anyio.create_task_group() as g:
                worker = tasks_runner.TaskRunner(rp, async_redis, workers, logger)
                for _ in range(settings.num_workers):
                    g.start_soon(worker.run)

    uvloop.install()
    anyio.run(main)


if __name__ == '__main__':
    execute_worker()
