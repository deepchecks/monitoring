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
"""Open-telementy instrumentors."""
import json
import logging
import typing as t
from functools import wraps
from timeit import default_timer as timer
from typing import TYPE_CHECKING

import anyio
import pendulum as pdl
from opentelemetry import trace
from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry.semconv.trace import SpanAttributes
from opentelemetry.trace import SpanKind, Status, StatusCode

from deepchecks_monitoring import __version__
from deepchecks_monitoring.bgtasks.core import TaskStatus
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import ModelVersion

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from deepchecks_monitoring.bgtasks.core import Actor, Task, Worker
    from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
    from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend


logger = logging.getLogger(__name__)


class SchedulerInstrumentor(BaseInstrumentor):
    """Alerts scheduler open-telemetry instrumentor."""

    def _instrument(self, scheduler_type: "t.Type[AlertsScheduler]"):
        """Instrument open-telemetry for given scheduler type."""

        self.tracer = trace.get_tracer("alerts-scheduler", __version__)
        self.scheduler_type = scheduler_type

        self.orig_scheduler_run = self.scheduler_type.run
        self.orig_run_organization = self.scheduler_type.run_organization

        @wraps(self.orig_scheduler_run)
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
                    await self.orig_scheduler_run(scheduler, *args, **kwargs)
                except Exception as error:
                    end_time = timer()
                    span.set_attribute("operation.duration", end_time - start_time)
                    if isinstance(error, anyio.get_cancelled_exc_class()):
                        span.set_status(Status(StatusCode.ERROR, description="Scheduled coroutine canceled"))
                    else:
                        span.set_status(Status(StatusCode.ERROR))
                        span.record_exception(error)
                    raise

        @wraps(self.orig_run_organization)
        async def run_organization(scheduler: "AlertsScheduler", *args, **kwargs):
            with self.tracer.start_as_current_span("AlertsScheduler.run_organization") as span:
                # NOTE:
                # I do not use here semantic name for 'statement' attribute because
                # uptrace always replaces the span name with it and in this case,
                # it is not desirable
                span.set_attribute(SpanAttributes.CODE_NAMESPACE, "AlertsScheduler")
                span.set_attribute(SpanAttributes.CODE_FUNCTION, "AlertsScheduler.run_organization")
                start_time = timer()

                try:
                    enqueued_tasks = await self.orig_run_organization(scheduler, *args, **kwargs)

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
        self.scheduler_type.run_organization = run_organization

    def _uninstrument(self):
        self.scheduler_type.run = self.orig_scheduler_run
        self.scheduler_type.run_organization = self.orig_run_organization

    def instrumentation_dependencies(self):
        return []


class WorkerInstrumentor(BaseInstrumentor):
    """Alerts scheduler open-telemetry instrumentor."""

    def _instrument(self, worker_type: "t.Type[Worker]"):
        """Instrument open-telemetry for given worker type."""

        self.tracer = trace.get_tracer("bgtasks-worker", __version__)
        self.worker_type = worker_type

        self.orig_atomic_task_execution = self.worker_type.atomic_task_execution
        self.orig_not_atomic_task_execution = self.worker_type.not_atomic_task_execution

        self.worker_type.atomic_task_execution = self._wrap_task_execution(
            self.worker_type.atomic_task_execution
        )
        self.worker_type.not_atomic_task_execution = self._wrap_task_execution(
            self.worker_type.not_atomic_task_execution
        )

    def _wrap_task_execution(self, original_fn):
        """Wrap worker task execution method."""
        @wraps(original_fn)
        async def execute_task(
            worker: "Worker",
            session: "AsyncSession",
            actor: "Actor",
            task: "Task",
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
                    result = await original_fn(
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
                else:
                    span.set_attribute("operation.task.status", task.status.value)
                    span.set_attribute("operation.task.finished_at", str(task.finished_at))
                    span.set_attribute("operation.task.error", task.error)
                    span.set_attribute("operation.task.traceback", task.traceback)
                    if task.status == TaskStatus.FAILED:
                        span.set_status(Status(StatusCode.ERROR, description="Task execution failure"))
                    return result

        return execute_task

    def _uninstrument(self):
        self.worker_type.atomic_task_execution = self.orig_atomic_task_execution
        self.worker_type.not_atomic_task_execution = self.orig_not_atomic_task_execution

    def instrumentation_dependencies(self):
        return []


class DataIngetionInstrumentor(BaseInstrumentor):
    """Data ingestion backend open-telemetry instrumentor."""

    def _instrument(self, data_ingestion_backend_type: t.Type["DataIngestionBackend"]):
        """Instrument fo the data ingestion backend."""
        self.tracer = trace.get_tracer("data-ingestion-backend", __version__)
        self.data_ingestion_backend_type = data_ingestion_backend_type

        self.orig_log_or_update = self.data_ingestion_backend_type.log_or_update

        @wraps(self.data_ingestion_backend_type.log_or_update)
        async def log_or_update(
            data_ingestion_backend: "DataIngestionBackend",
            model_version: ModelVersion,
            data: t.List[t.Dict[str, t.Any]],
            session: "AsyncSession",
            user: User,
            action: t.Literal["log", "update"],
            log_time: pdl.DateTime,
        ):
            span_attributes = {
                SpanAttributes.CODE_NAMESPACE: "DataIngestionBackend",
                SpanAttributes.CODE_FUNCTION: "log_or_update",
                "operation.user.id": user.id,
                "operation.user.organization_id": user.organization_id,
                "operation.size": len(data),
                "operation.action": action,
            }

            with self.tracer.start_as_current_span("DataIngestionBackend.log_or_update",
                                                   kind=SpanKind.CONSUMER, attributes=span_attributes) as span:
                start_time = timer()
                try:
                    result = await self.orig_log_or_update(data_ingestion_backend, model_version,
                                                           data, session, user, action, log_time)
                except Exception as error:
                    span.set_attribute("operation.duration",  timer() - start_time)
                    span.set_status(Status(StatusCode.ERROR))
                    span.record_exception(error)
                    raise
                else:
                    span.set_attribute("operation.duration",  timer() - start_time)
                    return result

        self.data_ingestion_backend_type.log_or_update = log_or_update

    def _uninstrument(self):
        self.data_ingestion_backend_type.log_or_update = self.orig_log_or_update

    def instrumentation_dependencies(self):
        return []
