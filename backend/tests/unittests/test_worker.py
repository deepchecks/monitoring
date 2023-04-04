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

from deepchecks_monitoring.bgtasks.core import (Actor, ExecutionStrategy, Notification, NotificationsListener, Task,
                                                TasksBroker, TaskStatus, Worker)
from deepchecks_monitoring.public_models import User


def generate_actor(*, fn=None, bind=None, execution_strategy=ExecutionStrategy.NOT_ATOMIC):
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


async def fetch_tasks(
    connection: t.Any,
    task_ids: t.Sequence[int],
    actor: t.Optional[Actor] = None,
    params: t.Optional[t.Dict[t.Any, t.Any]] = None,
) -> t.List[Task]:
    stm = sa.select(Task).where(Task.id.in_(list(task_ids)))

    if isinstance(connection, AsyncEngine):
        async with connection.connect() as c:
            tasks = (await c.execute(stm)).all()
    elif isinstance(connection, AsyncConnection):
        tasks = (await connection.execute(stm)).all()
    elif isinstance(connection, AsyncSession):
        tasks = (await connection.scalars(stm)).all()
    else:
        raise TypeError(f"Unexpected type - {type(connection)}")

    if actor is None:
        return tasks

    for task in tasks:
        assert task is not None
        assert actor.name == task.executor
        assert actor.description == task.description
        assert actor.queue_name == task.queue
        assert actor.priority == task.priority

        if params is not None:
            assert params == task.params

    return tasks


class TestTasksEnqueueing:

    @pytest.mark.parametrize("execution_strategy", [ExecutionStrategy.ATOMIC, ExecutionStrategy.NOT_ATOMIC])
    @pytest.mark.asyncio
    async def test_with_engine(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        engine = async_engine.execution_options(
            schema_translate_map={None: user.organization.schema_name}
        )
        actor = generate_actor(
            bind=engine,
            execution_strategy=execution_strategy
        )
        args = {"foo": 1, "bar": 2}
        task_id = await actor.enqueue(**args)
        assert isinstance(task_id, int)
        assert len(await fetch_tasks(engine, [task_id], actor=actor, params=args)) > 0

    @pytest.mark.parametrize("execution_strategy", [ExecutionStrategy.ATOMIC, ExecutionStrategy.NOT_ATOMIC])
    @pytest.mark.asyncio
    async def test_with_orm_session(self, async_session: AsyncSession, execution_strategy: ExecutionStrategy):
        actor = generate_actor(bind=async_session, execution_strategy=execution_strategy)
        args = {"foo": 1, "bar": 2}
        task_id = await actor.enqueue(**args)
        await async_session.commit()
        assert isinstance(task_id, int)
        assert len(await fetch_tasks(async_session, [task_id], actor=actor, params=args)) > 0

    @pytest.mark.parametrize("execution_strategy", [ExecutionStrategy.ATOMIC, ExecutionStrategy.NOT_ATOMIC])
    @pytest.mark.asyncio
    async def test_with_connection(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        async with async_engine.connect() as c:
            await c.execution_options(schema_translate_map={None: user.organization.schema_name})
            actor = generate_actor(bind=c, execution_strategy=execution_strategy)
            args = {"foo": 1, "bar": 2}
            task_id = await actor.enqueue(**args)
            await c.commit()
            assert isinstance(task_id, int)
            assert len(await fetch_tasks(c, [task_id], actor=actor, params=args))

    @pytest.mark.asyncio
    async def test_that_system_parameters_are_not_requiered_during_task_enqueue(
        self,
        async_engine: AsyncEngine,
        user: User
    ):
        async def fn(session: AsyncSession, engine: AsyncEngine, **kwargs):
            raise RuntimeError("Hello world")
        async with async_engine.connect() as c:
            await c.execution_options(schema_translate_map={None: user.organization.schema_name})
            actor = generate_actor(bind=c, execution_strategy=ExecutionStrategy.NOT_ATOMIC, fn=fn)
            args = {"foo": 1, "bar": 2}
            task_id = await actor.enqueue(**args)
            assert isinstance(task_id, int)

    @pytest.mark.asyncio
    async def test_that_presence_of_actor_parameters_is_checked_during_enqueue(
        self,
        async_engine: AsyncEngine,
        user: User
    ):
        async def fn(
            foo: int,
            bar: float,
            session: AsyncSession,
            engine: AsyncEngine,
            **kwargs
        ):
            raise RuntimeError("Hello world")

        actor = generate_actor(execution_strategy=ExecutionStrategy.NOT_ATOMIC, fn=fn)
        args = {"foo": 1}

        with pytest.raises(
            TypeError,
            match=r"missing a required argument: 'bar'"
        ):
            await actor.enqueue(**args)


@pytest.mark.parametrize(
    "execution_strategy",
    [
        # NOTE:
        # not used currently, commented to reduce tests time run
        # ExecutionStrategy.ATOMIC,
        ExecutionStrategy.NOT_ATOMIC
    ]
)
class TestWorker:

    @pytest.mark.asyncio
    async def test_tasks_execution(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        organization_engine = async_engine.execution_options(schema_translate_map={None: user.organization.schema_name})

        actor = generate_actor(bind=organization_engine, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker.create(engine=organization_engine, actors=[actor], notification_wait_timeout=1)

        async with worker.create_database_session() as session:
            for task in (await fetch_tasks(session, tasks_ids, actor=actor)):
                await worker.execute_task(session, task)

        for task in await fetch_tasks(organization_engine, tasks_ids):
            assert task is not None
            assert task.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_with_failing_actor(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        async def fn(**kwargs):
            raise RuntimeError("Hello world")

        organization_engine = async_engine.execution_options(schema_translate_map={None: user.organization.schema_name})

        actor = generate_actor(bind=organization_engine, fn=fn, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker.create(engine=organization_engine, actors=[actor], notification_wait_timeout=1)

        async with worker.create_database_session() as session:
            # TODO:
            # do not fetch all tasks at once
            # explain why
            for task_id in tasks_ids:
                task, *_ = await fetch_tasks(session, [task_id], actor=actor)
                await worker.execute_task(session, task)

        for task in (await fetch_tasks(organization_engine, tasks_ids)):
            assert task is not None
            assert task.status == TaskStatus.FAILED
            assert task.error is not None
            assert task.traceback is not None

    @pytest.mark.asyncio
    async def test_with_actor_that_invailidates_database_session(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        """
        Verify that an actor that causes database session invalidation
        by issueing an incorrect SQL statement does not cause worker failure.

        See related issue:
        - https://github.com/deepchecks/mon/issues/808
        """
        async def fn(session: AsyncSession, **kwargs):
            await session.execute(sa.text("SELECT 2/0"))

        schema_translate_map = {None: user.organization.schema_name}
        organization_engine = async_engine.execution_options(schema_translate_map=schema_translate_map)

        actor = generate_actor(bind=organization_engine, fn=fn, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]
        worker = Worker.create(engine=organization_engine, actors=[actor], notification_wait_timeout=1)

        async with worker.create_database_session() as session:
            # TODO:
            # do not fetch all tasks at once
            # explain why
            for task_id in tasks_ids:
                task, *_ = await fetch_tasks(session, [task_id], actor=actor)
                await worker.execute_task(session, task)

        for task in (await fetch_tasks(organization_engine, tasks_ids)):
            assert task is not None
            assert task.status == TaskStatus.FAILED
            assert task.error is not None
            assert task.traceback is not None

    @pytest.mark.asyncio
    async def test__execute_after__parameter(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        organization_engine = async_engine.execution_options(schema_translate_map={None: user.organization.schema_name})
        actor = generate_actor(bind=organization_engine, execution_strategy=execution_strategy)
        worker = Worker.create(engine=organization_engine, actors=[actor], notification_wait_timeout=1)

        tasks_ids = [
            await actor.enqueue(execute_after=datetime.utcnow() + timedelta(days=2))
            for _ in range(3)
        ]

        async with worker.create_database_session() as session:
            # TODO:
            # do not fetch all tasks at once
            # explain why
            for task_id in tasks_ids:
                task, *_ = await fetch_tasks(session, [task_id], actor=actor)
                await worker.execute_task(session, task)

        for task in await fetch_tasks(organization_engine, tasks_ids):
            assert task is not None
            assert task.status == TaskStatus.SCHEDULED

    @pytest.mark.asyncio
    async def test_that_additional_and_meta_parameters_are_passed_to_actor_function(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        async def fn(**kwargs):
            assert kwargs.get("foo") == 1
            assert isinstance(kwargs.get("task"), Task)
            assert isinstance(kwargs.get("actor"), Actor)
            assert isinstance(kwargs.get("session"), AsyncSession)
            assert isinstance(kwargs.get("engine"), AsyncEngine)
            assert "logger" in kwargs

        organization_engine = async_engine.execution_options(schema_translate_map={None: user.organization.schema_name})
        actor = generate_actor(bind=organization_engine, fn=fn, execution_strategy=execution_strategy)
        tasks_ids = [await actor.enqueue() for _ in range(3)]

        worker = Worker.create(
            engine=organization_engine,
            actors=[actor],
            notification_wait_timeout=1,
            additional_params={"foo": 1}
        )

        async with worker.create_database_session() as session:
            for task in await fetch_tasks(session, tasks_ids, actor=actor):
                await worker.execute_task(session, task)

        for task in await fetch_tasks(organization_engine, tasks_ids):
            assert task is not None
            assert task.status == TaskStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_worker_cancellation_with_running_task(
        self,
        async_engine: AsyncEngine,
        execution_strategy: ExecutionStrategy,
        user: User
    ):
        async def fn(**kwargs):
            await anyio.sleep(600)

        organization_engine = async_engine.execution_options(schema_translate_map={None: user.organization.schema_name})
        actor = generate_actor(bind=organization_engine, fn=fn, execution_strategy=execution_strategy)
        task_id = await actor.enqueue()
        worker = Worker.create(engine=organization_engine, actors=[actor], notification_wait_timeout=2)

        async with worker.create_database_session() as session:
            task, *_ = await fetch_tasks(session, [task_id], actor=actor)
            with anyio.move_on_after(delay=1):
                await worker.execute_task(session, task)

        task, *_ = await fetch_tasks(organization_engine, [task_id], actor=actor)

        assert task is not None

        if execution_strategy == ExecutionStrategy.ATOMIC:
            assert task.status == TaskStatus.SCHEDULED
        elif execution_strategy == ExecutionStrategy.NOT_ATOMIC:
            assert task.status == TaskStatus.CANCELED
        else:
            raise ValueError(f"Unexpected value of execution_strategy parameter {execution_strategy}")


class TestNotificationListener:

    @pytest.mark.asyncio
    async def test_listener(self, async_engine: AsyncEngine):
        dsn = str(async_engine.url.set(drivername="postgres"))
        connection_factory = lambda: asyncpg.connect(dsn=dsn)
        queue = asyncio.Queue()
        listener = NotificationsListener(connection_factory=connection_factory, channels=["first", "second"])

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)
            await anyio.sleep(1)  # we need to give listener a time to establish connection

            async with async_engine.begin() as c:
                await c.execute(sa.text("NOTIFY first"))
                await c.execute(sa.text("NOTIFY second"))
                await c.commit()

            await anyio.sleep(2)
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
            reconnect_delay=1,  # seconds
        )

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)
            await anyio.sleep(5)

        assert queue.empty() is False
        assert isinstance(queue.get_nowait(), Exception)

    @pytest.mark.asyncio
    async def test_enqueued_task_notification_receival(
        self,
        async_engine: AsyncEngine,
        user: User
    ):
        dsn = str(async_engine.url.set(drivername="postgres"))
        connection_factory = lambda: asyncpg.connect(dsn=dsn)
        queue = asyncio.Queue()
        actor = generate_actor()

        listener = NotificationsListener(
            connection_factory=connection_factory,
            channels=[actor.channel],
            max_reconnect_attempts=3,
            reconnect_delay=1,  # seconds
        )

        async with anyio.create_task_group() as g:
            g.start_soon(listener.listen, queue)

            await anyio.sleep(2)  # give time to starttup
            assert queue.empty() is True

            async with async_engine.begin() as c:
                await c.execution_options(schema_translate_map={None: user.organization.schema_name})
                await actor.enqueue(bind=c)

            await anyio.sleep(2)
            g.cancel_scope.cancel()

        assert queue.empty() is False
        n = queue.get_nowait()
        assert isinstance(n, Notification)
        assert n.channel == actor.channel


class TestTasksBroker:

    @pytest.mark.asyncio
    async def test_tasks_broker(
        self,
        async_session: AsyncSession
    ):
        n_of_tasks = 3
        actor = generate_actor(bind=async_session)
        tasks_ids = [await actor.enqueue() for _ in range(n_of_tasks)]

        broker = TasksBroker(
            database_url=async_session.get_bind().url,
            queues_names=[actor.queue_name],
            actors_names=[actor.name]
        )

        tasks = [it async for it in broker._next_task(async_session)]
        assert len(tasks) == 3

        for task in tasks:
            assert isinstance(task, Task)
            assert task.id in tasks_ids
            assert task.status == TaskStatus.RUNNING

    @pytest.mark.asyncio
    async def test_queues_bounds(self, async_session: AsyncSession):
        """Test that broker picks up tasks only from own queue."""
        first_actor = generate_actor(bind=async_session)
        second_actor = generate_actor(bind=async_session)

        first_task_id = await first_actor.enqueue()
        second_task_id = await second_actor.enqueue()  # pylint: disable=unused-variable

        await async_session.commit()

        broker = TasksBroker(
            database_url=async_session.get_bind().url,
            queues_names=[first_actor.queue_name],
            actors_names=[first_actor.name]
        )

        task = await broker.pop_task(
            session=async_session,
            queue_names=[first_actor.queue_name],
            actor_names=[first_actor.name]
        )

        assert task is not None
        assert task.id == first_task_id

        with pytest.raises(ValueError):
            await broker.pop_task(
                session=async_session,
                queue_names=[second_actor.queue_name],
                actor_names=[second_actor.name]
            )

    @pytest.mark.asyncio
    async def test_task_broker_wakup_on_task_enqueue(
        self,
        async_engine: AsyncEngine,
        user: User
    ):
        queue = asyncio.Queue()
        actor = generate_actor()

        broker = TasksBroker(
            database_url=async_engine.url,
            queues_names=[actor.queue_name],
            actors_names=[actor.name],
            notification_wait_timeout=600
        )

        async def loop(session):
            nonlocal broker, queue
            async for it in broker.next_task(session):
                await queue.put(it)

        async with AsyncSession(async_engine) as s:
            async with anyio.create_task_group() as g:
                task = None
                g.start_soon(broker.listen_for_notifications)
                g.start_soon(loop, s)
                await asyncio.sleep(1)  # give broker time to start listening for notifications

                with anyio.move_on_after(delay=3):
                    task = await queue.get()

                assert task is None

                async with async_engine.begin() as c:
                    await c.execution_options(schema_translate_map={None: user.organization.schema_name})
                    task_id = await actor.enqueue(bind=c)

                with anyio.fail_after(delay=3):
                    task = await queue.get()

                assert isinstance(task, Task)
                assert task.id == task_id
                assert task.status == TaskStatus.RUNNING

                g.cancel_scope.cancel()
