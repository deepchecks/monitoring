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
# pylint: disable=unused-import
"""Open-telementy instrumentors."""
import enum
import json
import logging
import typing as t
from functools import wraps
from time import perf_counter

import anyio
import pendulum as pdl
import sentry_sdk

from deepchecks_monitoring import __version__
from deepchecks_monitoring.bgtasks.core import TaskStatus
from deepchecks_monitoring.public_models import Organization, User
from deepchecks_monitoring.schema_models import Model, ModelVersion

if t.TYPE_CHECKING:
    from pendulum.datetime import DateTime as PendulumDateTime
    from sqlalchemy.ext.asyncio import AsyncSession

    from deepchecks_monitoring.bgtasks.core import Actor, Task, Worker
    from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
    from deepchecks_monitoring.bgtasks.tasks_queuer import TasksQueuer
    from deepchecks_monitoring.bgtasks.tasks_runner import TaskRunner
    from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend


__all__ = [
    "collect_telemetry",
    "SchedulerInstrumentor",
    "WorkerInstrumentor",
    "DataIngetionInstrumentor"
]


class SpanStatus(str, enum.Enum):
    CANCELED = "Coroutine Canceled"
    FAILED = "Execution Failed"
    OK = "Ok"


def collect_telemetry(routine: t.Any):
    """Instrument open-telementry for given routine."""
    # pylint: disable=redefined-outer-name,import-outside-toplevel
    from deepchecks_monitoring.bgtasks.actors import Worker
    from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
    from deepchecks_monitoring.bgtasks.tasks_queuer import TasksQueuer
    from deepchecks_monitoring.bgtasks.tasks_runner import TaskRunner
    from deepchecks_monitoring.logic.data_ingestion import DataIngestionBackend

    logger = logging.getLogger("instrumentation")

    if issubclass(routine, AlertsScheduler):
        SchedulerInstrumentor(scheduler_type=routine).instrument()
        logger.info("Instrumented alerts scheduler telemetry collectors")
        return routine

    if issubclass(routine, Worker):
        WorkerInstrumentor(worker_type=routine).instrument()
        logger.info("Instrumented worker telemetry collectors")
        return routine

    if issubclass(routine, DataIngestionBackend):
        DataIngetionInstrumentor(data_ingestion_backend_type=routine).instrument()
        logger.info("Instrumented data ingestion backend telemetry collectors")
        return routine

    if issubclass(routine, TaskRunner):
        TaskRunerInstrumentor(task_runner_type=routine).instrument()
        logger.info("Instrumented task runner telemetry collectors")
        return routine

    if issubclass(routine, TasksQueuer):
        TasksQueuerInstrumentor(task_queuer_type=routine).instrument()
        logger.info("Instrumented task queuer telemetry collectors")
        return routine

    raise ValueError(
        "Unknown routine, do not know how to do "
        "open-telemetry instrumentation for it."
    )


class SchedulerInstrumentor:
    """Alerts scheduler open-telemetry instrumentor."""

    def __init__(self, scheduler_type: "t.Type[AlertsScheduler]"):
        self.scheduler_type = scheduler_type
        self.original_run_all_organizations = self.scheduler_type.run_all_organizations
        self.original_run_organization = self.scheduler_type.run_organization

    def instrument(self):
        """Instrument open-telemetry for given scheduler type."""

        @wraps(self.original_run_all_organizations)
        async def run_all_organizations(scheduler: "AlertsScheduler", *args, **kwargs):
            db_url = scheduler.engine.url
            with sentry_sdk.start_transaction(name="Alerts Execution"):
                sentry_sdk.set_context("deepchecks_monitoring", {
                    "version": __version__
                })
                sentry_sdk.set_context("database", {
                    "name": str(db_url.database),
                    "uri": str(db_url),
                    "user": str(db_url.username)
                })
                with sentry_sdk.start_span(op="AlertsScheduler.run_all_organizations") as span:
                    span.set_data("sleep_seconds", scheduler.sleep_seconds)
                    try:
                        await self.original_run_all_organizations(
                            scheduler,
                            *args,
                            **kwargs
                        )
                    except Exception as error:
                        sentry_sdk.capture_exception(error)
                        if isinstance(error, anyio.get_cancelled_exc_class()):
                            span.set_status(SpanStatus.CANCELED)
                        else:
                            span.set_status(SpanStatus.FAILED)
                        raise
                    else:
                        span.set_status(SpanStatus.OK)

        @wraps(self.original_run_organization)
        async def run_organization(
            scheduler: "AlertsScheduler",
            organization: "Organization",
            *args,
            **kwargs
        ):
            with sentry_sdk.start_span(op="AlertsScheduler.run_organization") as span:
                span.set_data("organization.id", organization.id)
                span.set_data("organization.schema_name", organization.schema_name)
                kwargs = {**kwargs, "organization": organization}
                try:
                    enqueued_tasks = await self.original_run_organization(
                        scheduler,
                        *args,
                        **kwargs
                    )
                except Exception as error:
                    sentry_sdk.capture_exception(error)
                    span.set_status(
                        SpanStatus.CANCELED
                        if isinstance(error, anyio.get_cancelled_exc_class())
                        else SpanStatus.FAILED
                    )
                    raise
                else:
                    span.set_status(SpanStatus.OK)

                    if enqueued_tasks is not None:
                        stringified_tasks = "\n".join([repr(task) for task in enqueued_tasks])
                        span.set_data("enqueued_tasks", stringified_tasks)
                        span.set_data("description", f"Enqueued {len(enqueued_tasks)} tasks")
                    else:
                        span.set_data("description", "Enqueued 0 tasks")

                    return enqueued_tasks

        self.scheduler_type.run_all_organizations = run_all_organizations
        self.scheduler_type.run_organization = run_organization

    def uninstrument(self):
        self.scheduler_type.run_all_organizations = self.original_run_all_organizations
        self.scheduler_type.run_organization = self.original_run_organization


class WorkerInstrumentor:
    """Alerts scheduler open-telemetry instrumentor."""

    def __init__(self, worker_type: "t.Type[Worker]"):
        self.worker_type = worker_type
        self.original_atomic_task_execution = self.worker_type.atomic_task_execution
        self.original_not_atomic_task_execution = self.worker_type.not_atomic_task_execution

    def instrument(self):
        """Instrument open-telemetry for given worker type."""
        self.worker_type.atomic_task_execution = self._wrap_task_execution(
            self.worker_type.atomic_task_execution
        )
        self.worker_type.not_atomic_task_execution = self._wrap_task_execution(
            self.worker_type.not_atomic_task_execution
        )

    def _wrap_task_execution(
        self,
        original_fn: t.Callable[..., t.Any]
    ) -> t.Callable[..., t.Any]:
        """Wrap worker task execution method."""

        @wraps(original_fn)
        async def execute_task(
            worker: "Worker",
            session: "AsyncSession",
            actor: "Actor",
            task: "Task",
        ):
            with sentry_sdk.start_transaction(name="Tasks Consumer (Worker)"):
                sentry_sdk.set_context(
                    "deepchecks_monitoring",
                    {"version": __version__}
                )
                sentry_sdk.set_context("database", {
                    "name": str(worker.engine.url.database),
                    "uri": str(worker.engine.url),
                    "user": str(worker.engine.url.username)
                })
                with sentry_sdk.start_span(op="Worker.execute_task") as span:
                    span.set_data("operation.worker.expire_after", str(worker.expire_after))

                    span.set_data(
                        "operation.worker.actors",
                        ", ".join(it.name for it in worker.actors.values())
                    )
                    span.set_data(
                        "operation.worker.additional_params",
                        json.dumps(worker.additional_params, indent=3, default=repr)
                    )

                    span.set_data("actor.name", actor.name)
                    span.set_data("actor.queue_name", actor.queue_name)
                    span.set_data("actor.priority", actor.priority)
                    span.set_data("actor.execution_strategy", actor.execution_strategy)

                    span.set_data("task.id", task.id)
                    span.set_data("task.name", task.name)
                    span.set_data("task.queue", task.queue)
                    span.set_data("task.executor", task.executor)
                    span.set_data("task.priority", task.priority)
                    span.set_data("task.enqueued_at", str(task.enqueued_at))
                    span.set_data("task.params", json.dumps(task.params, indent=3))
                    span.set_data("task.execute_after", str(task.execute_after))

                    try:
                        result = await original_fn(
                            self=worker,
                            session=session,
                            actor=actor,
                            task=task
                        )
                    except Exception as error:
                        sentry_sdk.capture_exception(error)
                        span.set_status(
                            SpanStatus.CANCELED
                            if isinstance(error, anyio.get_cancelled_exc_class())
                            else SpanStatus.FAILED
                        )
                        raise
                    else:
                        span.set_data("task.status", task.status.value)
                        span.set_data("task.finished_at", str(task.finished_at))
                        span.set_data("task.error", task.error)
                        span.set_data("task.traceback", task.traceback)
                        if task.status == TaskStatus.FAILED:
                            span.set_status(SpanStatus.FAILED)
                        return result

        return execute_task

    def uninstrument(self):
        self.worker_type.atomic_task_execution = self.original_atomic_task_execution
        self.worker_type.not_atomic_task_execution = self.original_not_atomic_task_execution


class DataIngetionInstrumentor:
    """Data ingestion backend open-telemetry instrumentor."""

    def __init__(self, data_ingestion_backend_type: t.Type["DataIngestionBackend"]):
        self.data_ingestion_backend_type = data_ingestion_backend_type
        self.original_log_samples = self.data_ingestion_backend_type.log_samples
        self.original_log_labels = self.data_ingestion_backend_type.log_labels

    def instrument(self):
        """Instrument fo the data ingestion backend."""

        @wraps(self.data_ingestion_backend_type.log_samples)
        async def log_samples(
            data_ingestion_backend: "DataIngestionBackend",
            model_version: ModelVersion,
            data: t.List[t.Dict[str, t.Any]],
            session: "AsyncSession",
            user: User,
            log_time: "PendulumDateTime",
        ):
            settings = data_ingestion_backend.resources_provider.settings

            with sentry_sdk.start_transaction(name="Log Samples"):
                sentry_sdk.set_context("deepchecks_monitoring", {
                    "version": __version__
                })
                sentry_sdk.set_context("kafka", {
                    "host": settings.kafka_host,
                    "username": settings.kafka_username,
                    "security_protocol": settings.kafka_security_protocol,
                    "max_metadata_age": settings.kafka_max_metadata_age,
                    "replication_factor": settings.kafka_replication_factor,
                    "sasl_mechanism": settings.kafka_sasl_mechanism,
                })
                sentry_sdk.set_context("redis", {
                    "uri": settings.redis_uri
                })
                sentry_sdk.set_context("database", {
                    "uri": settings.database_uri
                })
                with sentry_sdk.start_span(op="DataIngestionBackend.log_or_update") as span:
                    span.set_data("user.id", user.id)
                    span.set_data("user.organization_id", user.organization_id)
                    span.set_data("n_of_samples", len(data))
                    try:
                        result = await self.original_log_samples(
                            data_ingestion_backend,
                            model_version,
                            data,
                            session,
                            user,
                            log_time
                        )
                    except Exception as error:
                        span.set_status(SpanStatus.FAILED)
                        sentry_sdk.capture_exception(error)
                        raise
                    else:
                        return result

        @wraps(self.data_ingestion_backend_type.log_labels)
        async def log_labels(
                data_ingestion_backend: "DataIngestionBackend",
                model: Model,
                data: t.List[t.Dict[str, t.Any]],
                session: "AsyncSession",
                user: User,
        ):
            settings = data_ingestion_backend.resources_provider.settings

            with sentry_sdk.start_transaction(name="Log Labels"):
                sentry_sdk.set_context("deepchecks_monitoring", {
                    "version": __version__
                })
                sentry_sdk.set_context("kafka", {
                    "host": settings.kafka_host,
                    "username": settings.kafka_username,
                    "security_protocol": settings.kafka_security_protocol,
                    "max_metadata_age": settings.kafka_max_metadata_age,
                    "replication_factor": settings.kafka_replication_factor,
                    "sasl_mechanism": settings.kafka_sasl_mechanism,
                })
                sentry_sdk.set_context("redis", {
                    "uri": settings.redis_uri
                })
                sentry_sdk.set_context("database", {
                    "uri": settings.database_uri
                })
                with sentry_sdk.start_span(op="DataIngestionBackend.log_or_update") as span:
                    span.set_data("user.id", user.id)
                    span.set_data("user.organization_id", user.organization_id)
                    span.set_data("n_of_samples", len(data))
                    try:
                        result = await self.original_log_labels(
                            data_ingestion_backend,
                            model,
                            data,
                            session,
                            user
                        )
                    except Exception as error:
                        span.set_status(SpanStatus.FAILED)
                        sentry_sdk.capture_exception(error)
                        raise
                    else:
                        return result

        self.data_ingestion_backend_type.log_samples = log_samples
        self.data_ingestion_backend_type.log_labels = log_labels

    def uninstrument(self):
        self.data_ingestion_backend_type.log_samples = self.original_log_samples
        self.data_ingestion_backend_type.log_labels = self.original_log_labels


class TaskRunerInstrumentor:
    """Task runner open-telemetry instrumentor."""

    def __init__(self, task_runner_type: t.Type["TaskRunner"]):
        self.task_runner_type = task_runner_type
        self.original_run_single_task = self.task_runner_type.run_single_task

    def instrument(self):
        """Instrument the task runner functions we want to monitor."""

        @wraps(self.original_run_single_task)
        async def run_single_task(runner: "TaskRunner", task, session, queued_time):
            redis_uri = runner.resource_provider.redis_settings.redis_uri
            database_uri = runner.resource_provider.database_settings.database_uri
            kafka_settings = runner.resource_provider.kafka_settings

            with sentry_sdk.start_transaction(name="Task Runner"):
                sentry_sdk.set_context("deepchecks_monitoring", {
                    "version": __version__
                })
                sentry_sdk.set_context("kafka", {
                    "host": kafka_settings.kafka_host,
                    "username": kafka_settings.kafka_username,
                    "security_protocol": kafka_settings.kafka_security_protocol,
                    "max_metadata_age": kafka_settings.kafka_max_metadata_age,
                    "replication_factor": kafka_settings.kafka_replication_factor,
                    "sasl_mechanism": kafka_settings.kafka_sasl_mechanism,
                })
                sentry_sdk.set_context("redis", {
                    "uri": redis_uri
                })
                sentry_sdk.set_context("database", {
                    "uri": database_uri
                })
                with sentry_sdk.start_span(op="TaskRunner.run_single_task") as span:
                    span.set_data("task.num-pushed", str(task.num_pushed))
                    span.set_data("task.params", json.dumps(task.params, indent=3))
                    span.set_data("task.type", str(task.bg_worker_task))
                    span.set_data("task.creation-time", str(task.creation_time))
                    span.set_data("task.name", task.name)
                    span.set_data("task.duration-in-queue", pdl.now().int_timestamp - queued_time)

                    try:
                        start = perf_counter()
                        result = await self.original_run_single_task(runner, task, session, queued_time)
                        span.set_data("task.execution-duration", perf_counter() - start)
                        span.set_status(SpanStatus.OK)
                    except Exception as error:
                        span.set_status(SpanStatus.FAILED)
                        sentry_sdk.capture_exception(error)
                        raise
                    else:
                        return result

        self.task_runner_type.run_single_task = run_single_task

    def uninstrument(self):
        self.task_runner_type.run_single_task = self.original_run_single_task


class TasksQueuerInstrumentor:
    """Task runner open-telemetry instrumentor."""

    def __init__(self, task_queuer_type: t.Type["TasksQueuer"]):
        self.task_queuer_type = task_queuer_type
        self.original_move_tasks_to_queue = self.task_queuer_type.move_tasks_to_queue

    def instrument(self):
        """Instrument the task runner functions we want to monitor."""

        @wraps(self.original_move_tasks_to_queue)
        async def move_tasks_to_queue(queuer: "TasksQueuer"):
            redis_uri = queuer.resource_provider.redis_settings.redis_uri
            database_uri = queuer.resource_provider.database_settings.database_uri

            with sentry_sdk.start_transaction(name="Tasks Queuer"):
                sentry_sdk.set_context("deepchecks_monitoring", {
                    "version": __version__
                })
                sentry_sdk.set_context("redis", {
                    "uri": redis_uri
                })
                sentry_sdk.set_context("database", {
                    "uri": database_uri
                })
                with sentry_sdk.start_span(op="TasksQueuer.move_tasks_to_queue") as span:
                    try:
                        start = perf_counter()
                        result = await self.original_move_tasks_to_queue(queuer)
                        span.set_data("execution-duration", perf_counter() - start)
                        span.set_data("queued-tasks-amount", result)
                        span.set_status(SpanStatus.OK)
                    except Exception as error:
                        span.set_status(SpanStatus.FAILED)
                        sentry_sdk.capture_exception(error)
                        raise
                    else:
                        return result

        self.task_queuer_type.move_tasks_to_queue = move_tasks_to_queue

    def uninstrument(self):
        self.task_queuer_type.move_tasks_to_queue = self.original_move_tasks_to_queue
