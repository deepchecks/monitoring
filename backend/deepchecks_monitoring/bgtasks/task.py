# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#  pylint: disable=redefined-outer-name
"""Contains Task ORM model and the 'Worker' implementation."""
import asyncio
import dataclasses
import enum
import inspect
import io
import logging
import traceback
import typing as t
from datetime import datetime, timedelta, timezone

import anyio
import sqlalchemy as sa
from asyncpg.connection import Connection as AsyncpgConnection
from asyncpg.connection import connect as asyncpg_connect
from asyncpg.exceptions import PostgresConnectionError
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import DisconnectionError
from sqlalchemy.exc import TimeoutError as AlchemyTimeoutError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession
from sqlalchemy.orm import declarative_base
from typing_extensions import Awaitable, ParamSpec, Self, TypeAlias

from deepchecks_monitoring.utils import TimeUnit

__all__ = ["Task", "Worker", "actor"]


Base = t.cast(t.Any, declarative_base())


class TaskStatus(enum.Enum):
    """Task status."""

    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELED = "canceled"


class Task(Base):
    """Task ORM model."""

    __tablename__ = "tasks"

    __table_args__ = (
        sa.UniqueConstraint(
            "name", "queue",
            name="name_uniqueness"
        ),
    )

    id = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.String, nullable=True)
    executor = sa.Column(sa.String, nullable=False, index=True)
    queue = sa.Column(sa.String, nullable=False, default="default", index=True)
    status = sa.Column(
        sa.Enum(TaskStatus, values_callable=lambda e: [it.value for it in e]),
        nullable=False,
        server_default=sa.text(f"'{TaskStatus.SCHEDULED.value}'"),
        index=True,
    )
    params = sa.Column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    priority = sa.Column(sa.Integer, nullable=False, server_default=sa.literal(0))
    description = sa.Column(sa.String)
    error = sa.Column(sa.String)
    traceback = sa.Column(sa.String)

    reference = sa.Column(sa.String, nullable=True, index=True)

    execute_after = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    enqueued_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    started_at = sa.Column(sa.DateTime(timezone=True))
    finished_at = sa.Column(sa.DateTime(timezone=True))

    def __repr__(self) -> str:
        """Return task textual representation."""
        return (
            f"<Task id:{self.id}, name:{self.name}, executor:{self.executor}, queue:{self.queue}, "
            f"status:{self.status}, priority:{self.priority}, params:{self.params}>"
        )


PGTaskNotificationFunc = sa.DDL("""
CREATE OR REPLACE FUNCTION new_task_notification()
RETURNS TRIGGER AS $$
BEGIN
PERFORM pg_notify(NEW.queue || '.' || NEW.executor, '');
RETURN NEW;
END; $$ LANGUAGE PLPGSQL
""")


PGTaskNotificationTrigger = sa.DDL("""
CREATE OR REPLACE TRIGGER trigger_new_task_notification AFTER INSERT ON tasks
FOR EACH ROW EXECUTE PROCEDURE new_task_notification();
""")


event.listen(
    Base.metadata,
    "after_create",
    PGTaskNotificationFunc.execute_if(dialect="postgresql")
)

event.listen(
    Base.metadata,
    "after_create",
    PGTaskNotificationTrigger.execute_if(dialect="postgresql")
)


class ExecutionStrategy(str, enum.Enum):
    """Task execution strategy.

    From more info see `Worker.atomic_task_execution` and `Worker.not_atomic_task_execution`
    """

    ATOMIC = "atomic"  # do not use with long running tasks, see 'Worker.atomic_task_execution' for more info
    NOT_ATOMIC = "not_atomic"


P = ParamSpec("P")
R = t.TypeVar("R")


class Actor(t.Generic[P, R]):
    """Wrapper for task execution logic.

    This type also provides a tasks enqueueing facility.

    Parameters
    ==========
    fn : Callable[..., Coroutine[Any, Any, Any]]
        task execution logic
    name : str
        actor (task executor) name
    queue_name : str , default "default"
        queue name from which to pull tasks for this actor
    priority : int , default 0
        tasks priority
    description : Optional[str]
        tasks description
    execution_strategy : ExecutionStrategy, default ExecutionStrategy.NOT_ATOMIC
        tasks execution strategy

    Examples
    ========

    >> def useful_work(**kwargs):
    >>     ...
    >>
    >> a = Actor(fn=useful_work)
    >> a(foo="hello-world")  # execute task localy
    >>
    >> async with engine.connect() as c:
    >>     a.enqueue(foo="hello-world", bind=c)  # enqueue task
    >>     # or
    >>     a.bind(c).enqueue(foo="hello-world")
    """

    def __init__(
        self,
        fn: t.Callable[P, Awaitable[R]],
        name: str,
        queue_name: str = "default",
        priority: int = 0,
        description: t.Optional[str] = None,
        execution_strategy: ExecutionStrategy = ExecutionStrategy.NOT_ATOMIC
    ):
        self.fn = fn
        self.name = name
        self.queue_name = queue_name
        self.channel = f"{queue_name}.{name}"
        self.description = description
        self.priority = priority
        self.execution_strategy = execution_strategy
        self._bind: t.Union[AsyncEngine, AsyncConnection, AsyncSession, None] = None
        self._fn_signature: inspect.Signature = inspect.signature(self.fn)

        has_kwargs = False

        for parameter in self._fn_signature.parameters.values():
            if parameter.kind in {inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.VAR_POSITIONAL}:
                raise TypeError("Positional-only and variadic-positional parameters are not allowed")
            if parameter.kind == inspect.Parameter.VAR_KEYWORD:
                has_kwargs = True

        if not has_kwargs:
            raise TypeError(
                "You must include '**kwargs' into the function signature. "
                "Worker passes many additional parameters to the actor function, "
                "and in order to prevent 'TypeError' because of 'unknown' parameters "
                "actors functions must include '**kwargs'"
            )

    def __call__(self, *args: P.args, **kwargs: P.kwargs) -> Awaitable[R]:
        """Execute 'fn' localy."""
        return self.fn(*args, **kwargs)

    async def enqueue(
        self,
        *,
        bind: t.Union[AsyncEngine, AsyncConnection, AsyncSession, None] = None,
        task_name: t.Optional[str] = None,
        execute_after: t.Optional[datetime] = None,
        **params: t.Any
    ) -> int:
        """Enqueue task.

        Parameters
        ==========
        bind : Optional[Union[AsyncEngine, AsyncConnection, AsyncSession]] , default None
            database connection to use to enqueue task
        task_name : Optional[str] , default None
            name that uniquely identifies a task
        execute_after : Optional[datetime] , default None
            a date after which task must be executed

        Returns
        =======
        int : task id
        """
        # verifying whether user passed all required parameters
        # will raise a TypeError if not
        self._fn_signature.bind(**params)

        stm = (
            sa.insert(Task).values(
                name=task_name or sa.text("DEFAULT"),
                executor=self.name,
                queue=self.queue_name,
                description=self.description,
                params=params,
                priority=self.priority,
                execute_after=execute_after or sa.text("DEFAULT"),
            ).returning(Task.id)
        )

        bind = t.cast(
            t.Union[AsyncEngine, AsyncConnection, AsyncSession, None],
            bind or self._bind
        )

        if bind is not None:
            if isinstance(bind, AsyncEngine):
                async with bind.begin() as c:
                    task_id = await c.scalar(stm)
                    return task_id
            elif isinstance(bind, (AsyncConnection, AsyncSession)):
                task_id = await bind.scalar(stm)
                return task_id
            else:
                raise TypeError(f"Unsupported type of 'bind' parameter - {type(bind)}")
        else:
            raise RuntimeError("Actor is not binded to the engine")

    def bind(self: Self, bind: t.Union[AsyncEngine, AsyncConnection, AsyncSession]) -> Self:
        """Bind actor to a database connection/session.

        Returns
        =======
        Self
        """
        if not isinstance(bind, (AsyncEngine, AsyncConnection, AsyncSession)):
            raise TypeError(
                "Expected AsyncEngine|AsyncConnection|AsyncSession "
                f"but got {type(bind)}"
            )
        self._bind = bind
        return self

    def __repr__(self) -> str:
        return (
            f"<Actor name:{self.name}, queue:{self.queue_name}, "
            f"execution-strategy:{self.execution_strategy}, "
            f"description:{self.description}>"
        )


def actor(
    name: t.Optional[str] = None,
    queue_name: str = "default",
    priority: int = 0,
    description: t.Optional[str] = None,
    execution_strategy: ExecutionStrategy = ExecutionStrategy.ATOMIC
) -> t.Callable[
    [t.Callable[P, Awaitable[R]]],
    Actor[P, R]
]:
    """Make an Actor instance from a callable.

    Examples
    ========

    >> @actor(queue_name="default", priority=2)
    >> def useful_work(**kwargs):
    >>     ...
    >>
    >> async with engine.connect() as c:
    >>     useful_work.enqueue(foo="hello-world", bind=c)  # enqueue task
    >>     # or
    >>     useful_work.bind(c).enqueue(foo="hello-world")
    """
    def decorator(
        fn: t.Callable[P, Awaitable[R]],
    ) -> Actor[P, R]:
        nonlocal name, description
        name = name or fn.__qualname__
        description = description or fn.__doc__
        return Actor(
            fn=fn,
            name=name,
            queue_name=queue_name,
            priority=priority,
            description=description,
            execution_strategy=execution_strategy
        )
    return decorator


TNotificationsQueue: TypeAlias = "asyncio.Queue[t.Union[Notification, Exception]]"


class Worker:
    """Tasks processing infinite loop.

    Infinite loop that pulls tasks from the queue table and
    routes them to the appropriate actor (task execution logic)

    Parameters
    ==========
    engine : AsyncEngine
        database engine instance
    actors : Sequence[Actor]
        sequence of Actor instances (task execution logic),
        also defines set of queues and tasks for worker to
        listen and consume
    worker_name : str , default "tasks-executor"
        name of the worker which will be seen in the logs
    notification_wait_timeout : float , default '1 minute'
        for how long to wait for a notifications.
        Worker implementation expects that for each enqueued
        task notification will be sent to the '{queue_name}.{executor}'
        channel via Postgres 'NOTIFY' mechanism. In order to guard a
        worker against endless waiting when a notification was forgotten
        to send we define a timeout for notification-waiting operation.
        After a timeout, a worker will look up the queue-table for a new
        task.
    expire_after : timedelta , default '2 days'
        max allowed time for a task to be in the 'scheduled' state,
        after exceeding the time limit task is considered to be 'expired'
        In short:
        >> is_expired = (now() - task.execute_after) > expire_after
    additional_params : Optional[Dict[Any, Any]] , default None
        additional params that will be passed to the actor function

    Examples
    ========

    >> @actor(queue_name="default")
    >> def foo():
    >>     print("Foo")
    >>
    >> @actor(queue_name="default")
    >> def bar():
    >>     print("Bar")
    >>
    >> e = create_async_engine(...)
    >> w = Worker(engine=e, actors=[foo, bar])
    >>
    >> await w.start()
    >>
    """

    def __init__(
        self,
        engine: AsyncEngine,
        actors: t.Sequence[Actor],
        worker_name: str = "tasks-executor",
        notification_wait_timeout: float = TimeUnit.SECOND * 60,
        expire_after: timedelta = timedelta(hours=2),  # TODO: consider moving it to actor type
        additional_params: t.Optional[t.Dict[str, t.Any]] = None,
        logger: t.Optional[logging.Logger] = None,
    ):
        assert len(actors) > 0
        self.engine = engine
        self.additional_params = additional_params or {}
        self.notification_wait_timeout = notification_wait_timeout
        self.expire_after = expire_after
        self.logger = logger or logging.getLogger(worker_name)

        self.actors: t.Dict[t.Tuple[str, str], Actor] = {}
        self.channels: t.Set[str] = set()
        self.actor_names: t.Set[str] = set()
        self.queue_names: t.Set[str] = set()

        for a in actors:
            k = (a.queue_name, a.name)
            if k in self.actors:
                raise ValueError(f"Actors duplication - {k}")
            else:
                self.actors[k] = a
                self.actor_names.add(a.name)
                self.queue_names.add(a.queue_name)
                self.channels.add(f"{k[0]}.{k[1]}")

        dsn = str(engine.url.set(drivername="postgres"))
        factory = lambda: asyncpg_connect(dsn=dsn)
        self.notifications: TNotificationsQueue = asyncio.Queue()
        self.notifications_listener = NotificationsListener(connection_factory=factory, channels=list(self.channels))

    @classmethod
    async def start_many(
        cls,
        engine: AsyncEngine,
        actors: t.Sequence[Actor],
        n_of_workers: int = 4,
        worker_name: str = "tasks-executor",
        notification_wait_timeout: float = TimeUnit.SECOND * 60,
        expire_after: timedelta = timedelta(hours=2),
        additional_params: t.Optional[t.Dict[str, t.Any]] = None,
        logger: t.Optional[logging.Logger] = None
    ):
        """Start many concurrent instances of worker."""
        async with anyio.create_task_group() as g:
            for n in range(n_of_workers):
                name = f"{worker_name}-{n}"
                g.start_soon(cls(
                    worker_name=name,
                    engine=engine,
                    actors=actors,
                    notification_wait_timeout=notification_wait_timeout,
                    expire_after=expire_after,
                    additional_params=additional_params,
                    logger=logger
                ).start)

    async def start(self):
        """Start processing tasks."""
        async with AsyncSession(self.engine, autoflush=False, expire_on_commit=False) as session:
            try:
                async with anyio.create_task_group() as g:
                    g.start_soon(self.notifications_listener.listen, self.notifications)
                    g.start_soon(self.loop, session)
            finally:
                with anyio.CancelScope(shield=True):
                    await session.rollback()
                    await session.close()

    async def loop(self, session: AsyncSession):
        """Loop over enqueued tasks."""
        async for task in self.next_task(session):
            if (datetime.now(timezone.utc) - task.execute_after) > self.expire_after:
                task.status = TaskStatus.EXPIRED
                await session.flush()
                await session.commit()
            else:
                k = (t.cast(str, task.queue), t.cast(str, task.executor))
                actor: t.Optional[Actor] = self.actors.get(k)
                if actor is None:
                    self.logger.warning(f"No actor for task: {repr(task)}")
                    await session.rollback()
                else:
                    await self.execute_task(session, actor, task)

    async def next_task(self, session: AsyncSession) -> t.AsyncIterator[Task]:
        """Pop next task from the queue or wait for it."""
        queue_names = None
        actor_names = None
        while True:
            task = await self.pop_task(session=session, queue_names=queue_names, actor_names=actor_names)
            queue_names = None
            actor_names = None
            if task is not None:
                yield task
            else:
                await session.rollback()  # closing any active transaction
                notification = await self.wait_for_notification()
                if notification is not None:
                    q, a = notification.unfold_channel_name()
                    queue_names = [q]
                    actor_names = [a]
                    continue

    async def pop_task(
        self,
        session: AsyncSession,
        actor_names: t.Optional[t.Sequence["ExecutorName"]] = None,
        queue_names: t.Optional[t.Sequence["QueueName"]] = None
    ) -> t.Optional[Task]:
        """Pop next task from the queue."""
        cte = (
            sa.select(Task)
            .where(sa.and_(
                Task.executor.in_(actor_names or self.actor_names),
                Task.queue.in_(queue_names or self.queue_names),
                Task.status == TaskStatus.SCHEDULED,
                Task.execute_after <= sa.func.now(),
            ))
            .order_by(Task.enqueued_at, Task.priority.desc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        cte = (
            sa.update(Task)
            .where(cte.c.id == Task.id)
            .values(
                status=TaskStatus.RUNNING,
                started_at=datetime.now(timezone.utc))
            .returning(Task)
        )
        return await session.scalar(sa.select(Task).from_statement(cte))

    async def wait_for_notification(self) -> t.Optional["Notification"]:
        """Wait for a task enqueueing notification."""
        try:
            notification = await asyncio.wait_for(
                self.notifications.get(),
                timeout=self.notification_wait_timeout
            )
        except asyncio.TimeoutError:
            return
        else:
            if isinstance(notification, Exception):
                msg = "Notification listener failed"
                self.logger.error(msg)
                raise RuntimeError(msg)
            else:
                return notification

    async def execute_task(self, session: AsyncSession, actor: Actor, task: Task):
        """Execute task logic."""
        if actor.execution_strategy == ExecutionStrategy.ATOMIC:
            return await self.atomic_task_execution(session, actor, task)
        elif actor.execution_strategy == ExecutionStrategy.NOT_ATOMIC:
            return await self.not_atomic_task_execution(session, actor, task)
        else:
            raise ValueError(
                f"Unexpected value of 'actor.execution_strategy' - {actor.execution_strategy}, "
                f"actor: {repr(actor)}"
            )

    async def not_atomic_task_execution(self, session: AsyncSession, actor: Actor, task: Task):
        """Execute task in not atomic mode.

        A task is dequeued with aquired row lock on it, after that
        its state is immediately updated to 'running' and a transaction is commited.
        Doing so releases all transaction locks and resources and prevents
        a task from being consumed by another worker but it becomes possible
        to 'lost' the task in case of the worker failure or any other interruption.

        TODO:
        consider using an advisory lock to prevent a task DB record from updating
        while the worker processes the task

        Parameters
        ==========
        session : AsyncSession
            session instance to use for task execution
        actor : Actor
            actor instance that is responsable for task execution
        task : Task
            task instance that was pulled out from the 'queue'
            for processing
        """
        self.logger.info(f"Executing task: {repr(task)}")

        await session.commit()
        await session.refresh(task)
        args = self.prepare_task_params(session, actor, task)

        try:
            await actor(**args)
        except anyio.get_cancelled_exc_class() as error:
            self.logger.exception(f"Task execution canceled: {repr(task)}")
            with anyio.CancelScope(shield=True):
                await session.rollback()
                await session.refresh(task)
                task.status = TaskStatus.CANCELED
                task.finished_at = datetime.now(timezone.utc)
                task.error = str(error)
                task.traceback = read_traceback()
                await session.flush()
                await session.commit()
            raise
        except (PostgresConnectionError, DisconnectionError, AlchemyTimeoutError):
            # TODO: try re-establish connection in order to update task
            self.logger.exception(f"Task failed because of database connection error: {repr(task)}")
            raise
        except Exception as error:  # pylint: disable=broad-except
            self.logger.exception(f"Task failed: {repr(task)}")
            with anyio.CancelScope(shield=True):
                await session.rollback()
                await session.refresh(task)
                task.status = TaskStatus.FAILED
                task.finished_at = datetime.now(timezone.utc)
                task.error = str(error)
                task.traceback = read_traceback()
                await session.flush()
                await session.commit()
        except BaseException as error:  # pylint: disable=broad-except
            self.logger.exception(f"Task interupted: {repr(task)}")
            with anyio.CancelScope(shield=True):
                await session.rollback()
                await session.refresh(task)
                task.status = TaskStatus.CANCELED
                task.finished_at = datetime.now(timezone.utc)
                task.error = str(error)
                task.traceback = read_traceback()
                await session.flush()
                await session.commit()
            raise
        else:
            self.logger.info(f"Task successed: {repr(task)}")
            with anyio.CancelScope(shield=True):
                if sa.inspect(task).expired is True:
                    await session.refresh(task)
                task.status = TaskStatus.COMPLETED
                task.finished_at = datetime.now(timezone.utc)
                await session.flush()
                await session.commit()

    async def atomic_task_execution(self, session: AsyncSession, actor: Actor, task: Task):
        """Execute task in 'atomic' mode.

        A task is dequeued with an acquired row lock on it and
        the lock is held until task execution is finished.
        Saying differently - a transaction is kept active
        until task execution ends.

        Pros:
            we can not worry that a task could be lost or hung
            in a 'running' state in a case of interruption or a
            worker failure, any side effects produced by a task
            (inserted/modified records in the DB) will be rolled
            back and the task will become available for consumption
            again

        Cons:
            a terrible choice for long runnin tasks, 'SELECT FOR UPDATE'
            to addition to a row level lock that prevents selected records
            from being updated/deleted also aquires table level 'ROW SHARE' lock
            that prevents commands like 'REINDEX', 'ALTER INDEX', 'ALTER TABLE',
            'VACUUM FULL' from running.

            plus, an active transaction keeps all its resources in the memory
            which could lead to a situation when a server will not
            have enough resources to process a user query/transaction
            or at least to do it effectively

        WARNING:
        do not use 'ExecutionStrategy.ATOMIC' for long running tasks

        NOTE:
        the same sqlalchemy session instance that is used to fetch and acquire a task
        record, is passed to the task function, you must not 'commit' or 'rollback'
        that session by yourself, worker will do it by itself. If you do so it will
        cause a worker to fail and might lead to the 'task lose'.

        Parameters
        ==========
        session : AsyncSession
            session instance to use for task execution
        actor : Actor
            actor instance that is responsable for task execution
        task : Task
            task instance that was pulled out from the 'queue'
            for processing
        """
        self.logger.info(f"Executing task: {repr(task)}")
        args = self.prepare_task_params(session, actor, task)
        try:
            async with session.begin_nested():
                await actor(**args)
        except anyio.get_cancelled_exc_class():
            self.logger.exception(f"Task canceled: {repr(task)}")
            raise
        except (PostgresConnectionError, DisconnectionError, AlchemyTimeoutError):
            self.logger.exception(f"Task failed because of database connection error: {repr(task)}")
            raise
        except Exception as error:  # pylint: disable=broad-except
            self.logger.exception(f"Task failed: {repr(task)}")
            task.status = TaskStatus.FAILED
            task.finished_at = datetime.now(timezone.utc)
            task.error = str(error)
            task.traceback = read_traceback()
            await session.flush()
            await session.commit()
        else:
            self.logger.info(f"Task successed: {repr(task)}")
            task.status = TaskStatus.COMPLETED
            task.finished_at = datetime.now(timezone.utc)
            await session.flush()
            await session.commit()

    def prepare_task_params(self, session: AsyncSession, actor: Actor, task: Task) -> t.Dict[t.Any, t.Any]:
        """Prepare task parameters."""
        task_params = t.cast(t.Any, task.params)

        if task_params is None:
            task_params = {}
        elif isinstance(task_params, dict):
            pass
        else:
            self.logger.warn(
                "'task.params' must contain dictionary, value stored in "
                f"'task.params' will be ignored. Task: {repr(task)}"
            )
            task_params = {}

        return {
            "task": task,
            "session": session,
            "actor": actor,
            "engine": self.engine,
            "logger": self.logger.getChild(f"{actor.queue_name}/{actor.name}"),
            **self.additional_params,
            **task_params
        }


def read_traceback() -> str:
    """Get recently raised exception traceback."""
    b = io.StringIO()
    traceback.print_exc(file=b)
    b.seek(0)
    return b.read()


QueueName = str
ExecutorName = t.Optional[str]
AsyncpgConnectionFactory = t.Callable[..., Awaitable[AsyncpgConnection]]


@dataclasses.dataclass(frozen=True)
class Notification:
    channel: str
    payload: t.Optional[str] = None

    def unfold_channel_name(self) -> t.Tuple[QueueName, ExecutorName]:
        r = self.channel.split(".")
        if len(r) < 2:
            return r[0], None
        else:
            return r[0], r[1] or None


class NotificationsListener:
    """Postgres notifications listener.

    See:
    - https://github.com/MagicStack/asyncpg/issues/519
    - https://github.com/anna-money/asyncpg-listen
    """

    def __init__(
        self,
        connection_factory: AsyncpgConnectionFactory,
        channels: t.List[str],
        reconnect_delay: float = TimeUnit.SECOND * 5,
        connection_verification_interval: float = TimeUnit.SECOND * 10,
        max_reconnect_attempts: int = 5,
        logger: t.Optional[logging.Logger] = None
    ):
        assert reconnect_delay > 0
        assert connection_verification_interval > 0
        assert max_reconnect_attempts > 0
        self.connection_factory = connection_factory
        self.channels = channels
        self.reconnect_delay = reconnect_delay
        self.connection_verification_interval = connection_verification_interval
        self.max_reconnect_attempts = max_reconnect_attempts
        self.logger = logger or logging.getLogger("notifications-listener")

    async def listen(self, queue: TNotificationsQueue):
        """Listen for notifications."""
        failed_connect_attempts = 0

        while True:
            try:
                connection = await self.connection_factory()
                try:
                    self.logger.info("Connection established")
                    failed_connect_attempts = 0
                    for channel in self.channels:
                        self.logger.info("Listening channel '%s'", channel)
                        await connection.add_listener(channel, self.create_callback(queue, self.logger))
                    while True:
                        await asyncio.sleep(self.connection_verification_interval)
                        self.logger.info("Verifying connection")
                        await connection.execute("SELECT 1")
                        self.logger.info("Connection is alive")
                finally:
                    with anyio.CancelScope(shield=True):
                        await connection.close()
            except Exception as error:  # pylint: disable=broad-except
                self.logger.exception("Connection was lost or not established")
                await asyncio.sleep(self.reconnect_delay * failed_connect_attempts)
                failed_connect_attempts += 1
                if self.max_reconnect_attempts and failed_connect_attempts > self.max_reconnect_attempts:
                    self.logger.exception("Max limit of reconnection attempts exceeded, exiting")
                    queue.put_nowait(error)
                    return

    @staticmethod
    def create_callback(
        queue: TNotificationsQueue,
        logger: logging.Logger,
    ) -> t.Callable[[t.Any, t.Any, t.Any, t.Any], None]:
        def callback(_: t.Any, __: t.Any, channel: t.Any, payload: t.Any):  # pylint: disable=invalid-name
            logger.info(f"Received notification from channel '{channel}'")
            queue.put_nowait(Notification(channel, payload))
        return callback
