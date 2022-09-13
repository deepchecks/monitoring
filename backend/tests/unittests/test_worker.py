# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# pylint: disable=missing-class-docstring,unused-argument
import asyncio
import random
import typing as t
from datetime import datetime, timedelta

import anyio
import asyncpg
import pytest
import randomname
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.task import (Actor, ExecutionStrategy, Notification, NotificationsListener, Task,
                                                TaskStatus, Worker)


def generate_actor(*, fn=None, bind=None, execution_strategy=ExecutionStrategy.ATOMIC):
    async def default_fn(**kwargs):
        print("Hello world")
    a = Actor(
        fn=fn or default_fn,
        name=randomname.get_name(),
        queue_name=randomname.get_name(),
        priority=random.randint(0, 20),
        execution_strategy=execution_strategy,
        description="Dumm actor for tests purpose"
    )
    return a if not bind else a.bind(bind)


async def fetch_task(
    connection: t.Any,
    task_id: int,
    actor: t.Optional[Actor] = None,
    params: t.Optional[t.Dict[t.Any, t.Any]] = None,
):
    stm = sa.select(Task).where(Task.id == task_id)

    if isinstance(connection, AsyncEngine):
        async with connection.connect() as c:
            task = (await c.execute(stm)).first()
    elif isinstance(connection, AsyncConnection):
        task = (await connection.execute(stm)).first()
    elif isinstance(connection, AsyncSession):
        task = await connection.scalar(stm)
    else:
        raise TypeError(f"Unexpected type - {type(connection)}")

    if actor is None:
        return task

    assert task is not None
    assert actor.name == task.executor
    assert actor.description == task.description
    assert actor.queue_name == task.queue
    assert actor.priority == task.priority

    if params is not None:
        assert params == task.params

    return task


@pytest.mark.parametrize(
    "execution_strategy",
    [ExecutionStrategy.ATOMIC, ExecutionStrategy.NOT_ATOMIC]
)
class TestTasksEnqueueing:

    @pytest.mark.asyncio
    async def test_with_engine(self, async_engine: AsyncEngine, execution_strategy: ExecutionStrategy):
        actor = generate_actor(bind=async_engine, execution_strategy=execution_strategy)
        args = {"foo": 1, "bar": 2}
        task_id = await actor.enqueue(**args)
        assert isinstance(task_id, int)
        assert (await fetch_task(async_engine, task_id, actor=actor, params=args)) is not None

    @pytest.mark.asyncio
    async def test_with_orm_session(self, async_session: AsyncSession, execution_strategy: ExecutionStrategy):
        actor = generate_actor(bind=async_session, execution_strategy=execution_strategy)
        args = {"foo": 1, "bar": 2}
        task_id = await actor.enqueue(**args)
        await async_session.commit()
        assert isinstance(task_id, int)
        assert (await fetch_task(async_session, task_id, actor=actor, params=args)) is not None

    @pytest.mark.asyncio
    async def test_with_connection(self, async_engine: AsyncEngine, execution_strategy: ExecutionStrategy):
        async with async_engine.connect() as c:
            actor = generate_actor(bind=c, execution_strategy=execution_strategy)
            args = {"foo": 1, "bar": 2}
            task_id = await actor.enqueue(**args)
            await c.commit()
            assert isinstance(task_id, int)
            assert (await fetch_task(c, task_id, actor=actor, params=args)) is not None


@pytest.mark.parametrize(
    "execution_strategy",
    [ExecutionStrategy.ATOMIC, ExecutionStrategy.NOT_ATOMIC]
)
class TestWorker:

    @pytest.mark.asyncio
    async def test(self, async_engine: AsyncEngine, execution_strategy: ExecutionStrategy):
        actor = generate_actor(bind=async_engine, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=1)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            await anyio.sleep(5)
            g.cancel_scope.cancel()

        tasks = [await fetch_task(async_engine, id, actor=actor) for id in tasks_ids]

        for task in tasks:
            assert task is not None
            assert task.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_with_failing_actor(self, async_engine: AsyncEngine, execution_strategy: ExecutionStrategy):
        async def fn(**kwargs):
            raise RuntimeError("Hello world")

        actor = generate_actor(bind=async_engine, fn=fn, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=1)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            await anyio.sleep(5)
            g.cancel_scope.cancel()

        tasks = [await fetch_task(async_engine, id, actor=actor) for id in tasks_ids]

        for task in tasks:
            assert task is not None
            assert task.status == TaskStatus.FAILED
            assert task.error is not None
            assert task.traceback is not None

    @pytest.mark.asyncio
    async def test_queues_bound(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy
    ):
        # TODO: add descrption to the test
        actor = generate_actor(bind=async_engine, execution_strategy=execution_strategy)
        second_actor = generate_actor(bind=async_engine, execution_strategy=execution_strategy)

        tasks_ids = [await actor.enqueue() for _ in range(3)]
        second_actor_task_ids = [await second_actor.enqueue() for _ in range(3)]

        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=1)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            await anyio.sleep(5)
            g.cancel_scope.cancel()

        tasks = [await fetch_task(async_engine, id, actor=actor) for id in tasks_ids]

        for task in tasks:
            assert task is not None
            assert task.status == TaskStatus.COMPLETED

        second_actor_tasks = [await fetch_task(async_engine, id, actor=second_actor) for id in second_actor_task_ids]

        for task in second_actor_tasks:
            assert task is not None
            assert task.status == TaskStatus.SCHEDULED

    @pytest.mark.asyncio
    async def test__execute_after__parameter(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy
    ):
        actor = generate_actor(bind=async_engine, execution_strategy=execution_strategy)

        tasks_ids = [
            await actor.enqueue(execute_after=datetime.utcnow() + timedelta(days=2))
            for _ in range(3)
        ]

        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=1)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            await anyio.sleep(10)
            g.cancel_scope.cancel()

        tasks = [await fetch_task(async_engine, id, actor=actor) for id in tasks_ids]

        for task in tasks:
            assert task is not None
            assert task.status == TaskStatus.SCHEDULED

    @pytest.mark.asyncio
    async def test_that_additional_and_meta_parameters_are_passed_to_actor_function(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy
    ):
        async def fn(**kwargs):
            assert kwargs.get("foo") == 1
            assert isinstance(kwargs.get("task"), Task)
            assert isinstance(kwargs.get("actor"), Actor)
            assert isinstance(kwargs.get("session"), AsyncSession)
            assert isinstance(kwargs.get("engine"), AsyncEngine)
            assert "logger" in kwargs

        actor = generate_actor(bind=async_engine, fn=fn, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=1, additional_params={"foo": 1})

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            await anyio.sleep(10)
            g.cancel_scope.cancel()

        tasks = [await fetch_task(async_engine, id, actor=actor) for id in tasks_ids]

        for task in tasks:
            assert task is not None
            assert task.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_worker_cancellation_with_running_task(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy
    ):
        e = anyio.create_event()

        async def fn(**kwargs):
            nonlocal e
            e.set()
            await anyio.sleep(600)

        actor = generate_actor(bind=async_engine, fn=fn, execution_strategy=execution_strategy)
        task_id = await actor.enqueue()
        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=2)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            with anyio.fail_after(delay=10):
                await e.wait()  # wait for worker to pick up a task
            g.cancel_scope.cancel()

        task = await fetch_task(async_engine, task_id, actor=actor)

        assert task is not None

        if execution_strategy == ExecutionStrategy.ATOMIC:
            assert task.status == TaskStatus.SCHEDULED
        elif execution_strategy == ExecutionStrategy.NOT_ATOMIC:
            assert task.status == TaskStatus.CANCELED
        else:
            raise ValueError(f"Unexpected value of execution_strategy parameter {execution_strategy}")

    @pytest.mark.asyncio
    async def test_worker_wakeup_on_task_creation(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy
    ):
        async def fn(**kwargs):
            print("Hello world")

        actor = generate_actor(bind=async_engine, fn=fn, execution_strategy=execution_strategy)
        worker = Worker(engine=async_engine, actors=[actor], notification_wait_timeout=600)

        async with anyio.create_task_group() as g:
            g.start_soon(worker.start)
            task_id = await actor.enqueue()
            await anyio.sleep(10)  # to much time
            g.cancel_scope.cancel()

        task = await fetch_task(async_engine, task_id, actor=actor)

        assert task is not None
        assert task.status == TaskStatus.COMPLETED


class TestNotificationListener:

    @pytest.mark.asyncio
    async def test_listener(self, async_engine: AsyncEngine):
        dsn = str(async_engine.url.set(drivername="postgres"))
        connection_factory = lambda: asyncpg.connect(dsn=dsn)
        queue = asyncio.Queue()
        listener = NotificationsListener(connection_factory=connection_factory, channels=["first", "second"])

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)
            await anyio.sleep(5)  # we need to give him time to establish a connection

            async with async_engine.begin() as c:
                await c.execute(sa.text("NOTIFY first"))
                await c.execute(sa.text("NOTIFY second"))
                await c.commit()

            await anyio.sleep(5)
            g.cancel_scope.cancel()

        assert queue.empty() is False

        n = [queue.get_nowait(), queue.get_nowait()]
        assert all(isinstance(it, Notification) for it in n)
        assert any(it.channel == "first" for it in n)
        assert any(it.channel == "second" for it in n)

    @pytest.mark.asyncio
    async def test_reconection_max_attempts(self, async_engine: AsyncEngine):
        dsn = str(async_engine.url.set(drivername="<unknown>"))
        connection_factory = lambda: asyncpg.connect(dsn=dsn)
        queue = asyncio.Queue()

        listener = NotificationsListener(
            connection_factory=connection_factory,
            channels=["test"],
            max_reconnect_attempts=3,
            reconnect_delay=2,  # seconds
        )

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)
            await anyio.sleep(8)

        assert queue.empty() is False
        assert isinstance(queue.get_nowait(), Exception)

    @pytest.mark.asyncio
    async def test_enqueued_task_notification_receival(self, async_engine: AsyncEngine):
        dsn = str(async_engine.url.set(drivername="postgres"))
        connection_factory = lambda: asyncpg.connect(dsn=dsn)
        queue = asyncio.Queue()

        actor = generate_actor(bind=async_engine)

        listener = NotificationsListener(
            connection_factory=connection_factory,
            channels=[actor.channel],
            max_reconnect_attempts=3,
            reconnect_delay=2,  # seconds
        )

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)
            await anyio.sleep(2)  # give time to starttup
            await actor.enqueue()
            await anyio.sleep(2)
            g.cancel_scope.cancel()

        assert queue.empty() is False
        n = queue.get_nowait()
        assert isinstance(n, Notification)
        assert n.channel == actor.channel
