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
# pylint: disable=import-outside-toplevel
"""Background tasks open-telementy instrumentors."""
import json
import logging
import typing as t
from functools import wraps
from timeit import default_timer as timer

import anyio
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession  # pylint: disable=unused-import
from sqlalchemy.sql import Executable

from deepchecks_monitoring import __version__

try:
    import opentelemetry
    from opentelemetry import trace
    from opentelemetry.semconv.trace import SpanAttributes
    from opentelemetry.trace import INVALID_SPAN, INVALID_SPAN_CONTEXT, Status, StatusCode, get_current_span
except ImportError:
    opentelemetry = None


if t.TYPE_CHECKING:
    from .core import Actor, Task, Worker  # pylint: disable=unused-import
    from .scheduler import AlertsScheduler  # pylint: disable=unused-import


logger = logging.getLogger(__name__)


def collect_telemetry(routine: t.Any):
    """Instrument open-telementry for given routine."""
    from .core import Worker  # pylint: disable=redefined-outer-name
    from .scheduler import AlertsScheduler  # pylint: disable=redefined-outer-name

    # TODO:
    # maybe also add an env var to control whether telemetry
    # instrumentation will be applied
    if opentelemetry is None:
        logger.warning(
            "Open Telemetry SDK is not installed, cannot "
            "instrument open telemetry collectors"
        )
        return routine

    if issubclass(routine, AlertsScheduler):
        SchedulerInstrumentor(routine).instrument()
        logger.info("Instrumented alerts scheduler telemetry collectors")
        return routine

    if issubclass(routine, Worker):
        WorkerInstrumentor(routine).instrument()
        logger.info("Instrumented worker telemetry collectors")
        return routine

    raise ValueError(
        "Unknown routine, do not know how to do "
        "open-telemetry instrumentation for it."
    )


class SchedulerInstrumentor:
    """Alerts scheduler open-telemetry instrumentor."""

    def __init__(self, scheduler_type: "t.Type[AlertsScheduler]"):
        self.tracer = trace.get_tracer("alerts-scheduler", __version__)
        self.scheduler_type = scheduler_type

    def instrument(self):
        """Instrument open-telemetry for given scheduler type."""
        if not opentelemetry:
            logger.warning("Opentelemetry SDK is not installed")
            return

        scheduler_run = self.scheduler_type.run
        scheduler_try_enqueue_tasks = self.scheduler_type.try_enqueue_tasks

        @wraps(scheduler_run)
        async def run(scheduler: "AlertsScheduler", *args, **kwargs):
            start_time = timer()
            db_url = scheduler.engine.url

            with self.tracer.start_as_current_span("AlertsScheduler.run") as span:
                span.set_attribute(SpanAttributes.DB_NAME, str(db_url.database))
                span.set_attribute(SpanAttributes.DB_CONNECTION_STRING, str(db_url))
                span.set_attribute(SpanAttributes.DB_USER, str(db_url.username))

                span.set_attribute(SpanAttributes.CODE_NAMESPACE, "AlertsScheduler")
                span.set_attribute(SpanAttributes.CODE_FUNCTION, "AlertsScheduler.run")
                span.set_attribute("operation.sleep_seconds", scheduler.sleep_seconds)

                try:
                    await scheduler_run(scheduler, *args, **kwargs)
                except Exception as error:
                    end_time = timer()
                    span.set_attribute("operation.duration", end_time - start_time)
                    if isinstance(error, anyio.get_cancelled_exc_class()):
                        span.set_status(Status(StatusCode.ERROR, description="Scheduled coroutine canceled"))
                    else:
                        span.set_status(Status(StatusCode.ERROR))
                        span.record_exception(error)
                    raise

        @wraps(scheduler_try_enqueue_tasks)
        async def try_enqueue_tasks(
            scheduler: "AlertsScheduler",
            connection: AsyncConnection,
            statement: Executable,
            # using Ellipsis to identify unset parameters and to avoid
            # copying defaults from original method
            max_attempts: int = ...,
            delay: int = ...,
        ):
            with self.tracer.start_as_current_span("AlertsScheduler.try_enqueue_tasks") as span:
                # NOTE:
                # I do not use here semantic name for 'statement' attribute because
                # uptrace always replaces the span name with it and in this case,
                # it is not desirable
                span.set_attribute("database.statement", str(statement))
                span.set_attribute(SpanAttributes.CODE_NAMESPACE, "AlertsScheduler")
                span.set_attribute(SpanAttributes.CODE_FUNCTION, "AlertsScheduler.run")
                start_time = timer()

                kwargs = {}

                if max_attempts is not Ellipsis:
                    span.set_attribute("operation.max_attempts", str(max_attempts))
                    kwargs["max_attempts"] = max_attempts
                if delay is not Ellipsis:
                    span.set_attribute("operation.delay", str(delay))
                    kwargs["delay"] = max_attempts

                try:
                    enqueued_tasks = await scheduler_try_enqueue_tasks(
                        self=scheduler,
                        connection=connection,
                        statement=statement,
                        **kwargs
                    )

                    span.set_status(Status(StatusCode.OK))

                    if enqueued_tasks is not None:
                        stringified_tasks = "\n".join([repr(task) for task in enqueued_tasks])
                        span.set_attribute("operation.enqueued_tasks", stringified_tasks)
                        span.set_status(Status(description=f"{len(enqueued_tasks)} tasks enqueued"))
                    else:
                        span.set_status(Status(description="0 tasks enqueued"))

                    return enqueued_tasks
                except Exception as error:
                    end_time = timer()
                    span.set_attribute("operation.duration", end_time - start_time)
                    if isinstance(error, anyio.get_cancelled_exc_class()):
                        span.set_status(Status(StatusCode.ERROR, description="Scheduled coroutine canceled"))
                    else:
                        span.set_status(Status(StatusCode.ERROR))
                        span.record_exception(error)
                    raise

        self.scheduler_type.run = run
        self.scheduler_type.try_enqueue_tasks = try_enqueue_tasks


class WorkerInstrumentor:
    """Alerts scheduler open-telemetry instrumentor."""

    def __init__(self, worker_type: "t.Type[Worker]"):
        self.tracer = trace.get_tracer("bgtasks-worker", __version__)
        self.worker_type = worker_type

    def instrument(self):
        """Instrument open-telemetry for given worker type."""
        if not opentelemetry:
            logger.warning("Opentelemetry SDK is not installed")
            return

        original_execute_task_fn = self.worker_type.execute_task

        @wraps(original_execute_task_fn)
        async def execute_task(
            worker: "Worker",
            session: "AsyncSession",
            actor: "Actor",
            task: "Task"
        ):
            with self.tracer.start_as_current_span("Worker.execute_task") as span:
                span.set_attribute(SpanAttributes.CODE_NAMESPACE, "Worker")
                span.set_attribute(SpanAttributes.CODE_FUNCTION, "Worker.execute_task")

                span.set_attribute(SpanAttributes.DB_NAME, str(worker.engine.url.database))
                span.set_attribute(SpanAttributes.DB_CONNECTION_STRING, str(worker.engine.url))
                span.set_attribute(SpanAttributes.DB_USER, str(worker.engine.url.username))

                span.set_attribute("operation.worker.expire_after", str(worker.expire_after))

                span.set_attribute(
                    "operation.worker.actors",
                    ", ".join(it.name for it in worker.actors.values())
                )
                span.set_attribute(
                    "operation.worker.additional_params",
                    json.dumps(worker.additional_params, indent=3, default=repr)
                )

                span.set_attribute("operation.actor.name", actor.name)
                span.set_attribute("operation.actor.queue_name", actor.queue_name)
                span.set_attribute("operation.actor.priority", actor.priority)
                span.set_attribute("operation.actor.execution_strategy", actor.execution_strategy)

                span.set_attribute("operation.task.id", task.id)
                span.set_attribute("operation.task.name", task.name)
                span.set_attribute("operation.task.queue", task.queue)
                span.set_attribute("operation.task.executor", task.executor)
                span.set_attribute("operation.task.priority", task.priority)
                span.set_attribute("operation.task.enqueued_at", str(task.enqueued_at))
                span.set_attribute("operation.task.params", json.dumps(task.params, indent=3))
                span.set_attribute("operation.task.execute_after", str(task.execute_after))

                start_time = timer()

                try:
                    return await original_execute_task_fn(
                        self=worker,
                        session=session,
                        actor=actor,
                        task=task
                    )
                except Exception as error:
                    end_time = timer()
                    span.set_attribute("operation.duration", end_time - start_time)
                    if isinstance(error, anyio.get_cancelled_exc_class()):
                        span.set_status(Status(StatusCode.ERROR, description="Scheduled coroutine canceled"))
                    else:
                        span.set_status(Status(StatusCode.ERROR))
                        span.record_exception(error)
                    raise

        self.worker_type.execute_task = execute_task


class TelemetyLoggingHandler(logging.Handler):
    """Open telemetry logging handler.

    Current handler adds log messages as events to the current span.
    """

    def emit(self, record: logging.LogRecord):
        """Handle log record."""
        if opentelemetry is None:
            return
        if (span := get_current_span()) == INVALID_SPAN:
            return
        if not span.is_recording():
            return
        if span.get_span_context() == INVALID_SPAN_CONTEXT:
            return

        if span._lock.locked() is True:  # pylint: disable=protected-access
            # WARNING:
            # if a log message was emitted by a span method that acquired
            # a lock then we will end up in the deadlock, it is because
            # 'add_event' method also tries to acquire a lock, to prevent
            # appearing in the deadlock we need to verify whether the lock
            # is acquired or not
            return

        span.add_event(
            name=record.getMessage(),
            attributes={
                "filename": record.filename,
                "module": record.module,
                "funcName": record.funcName,
                "levelname": record.levelname,
                "levelno": record.levelno,
                "exc_text": record.exc_text or "",
            }
        )
