# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# pylint: disable=missing-class-docstring,unused-argument,protected-access
import logging

import pytest
import sqlalchemy as sa
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.bgtasks.tasks_queuer import TasksQueuer
from deepchecks_monitoring.bgtasks.tasks_runner import TaskRunner
from deepchecks_monitoring.public_models.task import BackgroundWorker, Task


class Worker(BackgroundWorker):
    @classmethod
    def queue_name(cls) -> str:
        return 'test'

    @classmethod
    def delay_seconds(cls) -> int:
        return 0

    async def run(self, task: Task, session: AsyncSession, resources_provider, lock):
        await session.execute(sa.update(Task).where(Task.id == task.id).values({'params': {'run': True}}))
        await session.commit()


logger = logging.Logger('test')


@pytest.mark.asyncio
async def test_task_queue(resources_provider, async_session):
    workers = [Worker()]
    redis = FakeRedis()
    queuer = TasksQueuer(resources_provider, redis, workers, logger, 1)
    runner = TaskRunner(resources_provider, redis, workers, logger)

    await async_session.execute(sa.insert(Task).values({'name': 'test', 'bg_worker_task': 'test'}))
    await async_session.commit()

    num_pushed = await queuer.move_tasks_to_queue(async_session)
    assert num_pushed == 1

    task_id, queued_time = await runner.wait_for_task(timeout=1)
    await runner.run_single_task(task_id, async_session, queued_time)

    task = await async_session.execute(sa.select(Task).where(Task.name == 'test'))
    assert task.scalars().first().params['run'] is True
