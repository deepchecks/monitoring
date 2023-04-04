import random

import anyio
import pytest
import randomname
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.core import Actor, ExecutionStrategy, Task, TasksBroker, TaskStatus
from deepchecks_monitoring.config import Settings
from tests.common import generate_user


def generate_actor(*, fn=None, bind=None, execution_strategy=ExecutionStrategy.ATOMIC):
    async def default_fn(**kwargs):  # pylint: disable=unused-argument
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


@pytest.mark.asyncio
async def test_tasks_broker(
    async_engine: AsyncEngine,
    settings: Settings,
):
    # Prepare
    n_of_orgs = 2
    n_of_tasks = 2
    actor = generate_actor()
    created_tasks = set()

    async with AsyncSession(async_engine, expire_on_commit=False) as session:
        users = [await generate_user(session, settings.auth_jwt_secret) for _ in range(n_of_orgs)]

    # enqueue tasks for each created org
    for u in users:
        async with async_engine.begin() as connection:
            await connection.execution_options(
                schema_translate_map={None: u.organization.schema_name}
            )
            for i in range(n_of_tasks):
                name = f"{u.organization.name}-{i}"
                await actor.enqueue(bind=connection, task_name=name)
                created_tasks.add(name)

    broker = TasksBroker(
        database_url=async_engine.url,
        queues_names=[actor.queue_name],
        actors_names=[actor.name]
    )

    tasks = []

    # Act
    with anyio.CancelScope():
        with anyio.move_on_after(delay=10):  # TODO: to big delay
            async with AsyncSession(async_engine) as session:
                async for it in broker.next_task(session):
                    assert isinstance(it, Task)
                    assert it.status == TaskStatus.RUNNING
                    # otherwise, the broker will pick up this task again
                    # note, that it is not its responsibility to change a task status
                    it.status = TaskStatus.COMPLETED
                    tasks.append(it.name)
                    await session.commit()

    # Assert
    assert set(tasks) == created_tasks

# TODO:
# this test should be deleted whereas it is a
# duplicate of `tests/unittests/test_worker.py::TestTasksBroker::test_task_broker_wakup_on_task_enqueue`
# but a strange think is that it fails, we need to determine why it fails to ensure that it is not a bug
#
# @pytest.mark.asyncio
# async def test_tasks_broker_notification_listening_capabilities(
#     async_engine: AsyncEngine,
#     settings: Settings
# ):
#     n_of_orgs = 3
#     queue = asyncio.Queue()
#     actor = generate_actor()

#     async with AsyncSession(async_engine, expire_on_commit=False) as session:
#         users = [await generate_user(session, settings.auth_jwt_secret) for _ in range(n_of_orgs)]

#     broker = TasksBroker(
#         database_url=async_engine.url,
#         queues_names=[actor.queue_name],
#         actors_names=[actor.name],
#         notification_wait_timeout=600,
#     )

#     async def loop(session):
#         nonlocal broker, queue
#         async for it in broker.next_task(session):
#             await queue.put(it)

#     # create a seperate session instance for broker
#     async with AsyncSession(async_engine) as s:
#         async with anyio.create_task_group() as g:
#             task = None
#             g.start_soon(loop, s)
#             await asyncio.sleep(1)  # give broker time to start listening for notifications

#             with anyio.move_on_after(delay=3):
#                 task = await queue.get()

#             assert task is None

#             for u in users:
#                 async with async_engine.begin() as c:
#                     schema_translate_map = {None: u.organization.schema_name}
#                     await c.execution_options(schema_translate_map=schema_translate_map)
#                     task_id = await actor.enqueue(bind=c)

#                 with anyio.move_on_after(delay=3):
#                     task = await queue.get()

#                 assert isinstance(task, Task)
#                 assert task.id == task_id
#                 assert task.status == TaskStatus.RUNNING

#             g.cancel_scope.cancel()
