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
import datetime
import logging.handlers
import typing as t

import anyio
import pendulum as pdl
import redis
import uvloop
from sqlalchemy import case, func, update
from sqlalchemy.cimmutabledict import immutabledict

from deepchecks_monitoring.bgtasks.model_version_cache_invalidation import ModelVersionCacheInvalidation
from deepchecks_monitoring.bgtasks.model_version_offset_update import ModelVersionOffsetUpdate
from deepchecks_monitoring.bgtasks.model_version_topic_delete import ModelVersionTopicDeletionWorker
from deepchecks_monitoring.config import DatabaseSettings, RedisSettings
from deepchecks_monitoring.logic.keys import GLOBAL_TASK_QUEUE
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task

try:
    from deepchecks_monitoring import ee
    from deepchecks_monitoring.ee.resources import ResourcesProvider

    with_ee = True
except ImportError:
    from deepchecks_monitoring.resources import ResourcesProvider
    with_ee = False


class TasksQueuer:
    """Model version worker logic."""

    def __init__(
            self,
            resource_provider: ResourcesProvider,
            workers: t.List[BackgroundWorker],
            logger: logging.Logger,
            run_interval: int = 30,
            retries_interval: int = 600
    ):
        self.resource_provider = resource_provider
        self.logger = logger
        self.run_interval = run_interval

        # Build the query once to be used later
        intervals_by_type = case([
            (Task.bg_worker_task == bg_worker.queue_name(), datetime.timedelta(seconds=bg_worker.delay_seconds()))
            for bg_worker in workers
        ], else_=datetime.timedelta(seconds=0))
        retry_interval = Task.num_pushed * datetime.timedelta(seconds=retries_interval)
        condition = Task.creation_time + intervals_by_type + retry_interval <= func.now()
        self.query = update(Task).where(condition).values({Task.num_pushed: Task.num_pushed + 1}).returning(Task.id)

    async def run(self):
        """Run the main loop."""
        try:
            while True:
                await self.move_tasks_to_queue()
                self.logger.debug(f'sleep for {self.run_interval} seconds')
                await asyncio.sleep(self.run_interval)
        except anyio.get_cancelled_exc_class():
            self.logger.exception('Worker coroutine canceled')
            raise
        except Exception:
            self.logger.exception('Failure')
            raise
        except BaseException:
            self.logger.warning('Worker interrupted')
            raise

    async def move_tasks_to_queue(self) -> int:
        """Return the number of queued tasks."""
        async with self.resource_provider.create_async_database_session() as session:
            # SQLAlchemy evaluates the WHERE criteria in the UPDATE statement in Python, to locate matching objects
            # within the Session and update them. Therefore, we must use synchronize_session=False to tell sqlalchemy
            # that we don't care about updating ORM objects in the session.
            tasks = (await session.execute(self.query,
                                           execution_options=immutabledict({'synchronize_session': False}))).all()
            ts = pdl.now().int_timestamp
            task_ids = {x['id']: ts for x in tasks}
            if task_ids:
                try:
                    # Push to sorted set. if task id is already in set then do nothing.
                    pushed_count = self.resource_provider.redis_client.zadd(GLOBAL_TASK_QUEUE, task_ids, nx=True)
                    self.logger.info(f'Pushed {len(task_ids)} tasks to queue out of {len(task_ids)}')
                    return pushed_count
                except redis.ConnectionError:
                    # If redis failed, does not commit the update to the db
                    await session.rollback()
            else:
                self.logger.info('No tasks to push found')
            return 0


class BaseWorkerSettings(DatabaseSettings, RedisSettings):
    """Worker settings."""

    logfile: t.Optional[str] = None
    loglevel: str = 'INFO'
    logfile_maxsize: int = 10000000  # 10MB
    logfile_backup_count: int = 3

    class Config:
        """Model config."""

        env_file = '.env'
        env_file_encoding = 'utf-8'


if with_ee:
    class WorkerSettings(BaseWorkerSettings, ee.config.TelemetrySettings):
        """Set of worker settings."""
        pass
else:
    class WorkerSettings(BaseWorkerSettings):
        """Set of worker settings."""
        pass


def execute_worker():
    """Execute worker."""

    async def main():
        settings = WorkerSettings()
        service_name = 'tasks-queuer'

        logger = configure_logger(
            name=service_name,
            log_level=settings.loglevel,
            logfile=settings.logfile,
            logfile_backup_count=settings.logfile_backup_count,
        )

        # When running main it creates TaskQueuer under __main__ module, which fails
        # the telemetry collection. Adding here this import to fix this
        from deepchecks_monitoring.bgtasks import tasks_queuer  # pylint: disable=import-outside-toplevel

        if with_ee:
            if settings.sentry_dsn:
                import sentry_sdk  # pylint: disable=import-outside-toplevel
                sentry_sdk.init(
                    dsn=settings.sentry_dsn,
                    traces_sample_rate=0.1,
                    environment=settings.sentry_env,
                )
                ee.utils.telemetry.collect_telemetry(tasks_queuer.TasksQueuer)

        workers = [ModelVersionTopicDeletionWorker(), ModelVersionOffsetUpdate(), ModelVersionCacheInvalidation()]

        async with ResourcesProvider(settings) as rp:
            async with anyio.create_task_group() as g:
                worker = tasks_queuer.TasksQueuer(rp, workers, logger)
                g.start_soon(worker.run)

    uvloop.install()
    anyio.run(main)


if __name__ == '__main__':
    execute_worker()
