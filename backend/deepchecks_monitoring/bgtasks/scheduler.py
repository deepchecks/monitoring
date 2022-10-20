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
import logging
import logging.handlers
import typing as t
from textwrap import dedent

import anyio
import sqlalchemy as sa
import uvloop
from asyncpg.exceptions import SerializationError
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from sqlalchemy.sql import Executable

from deepchecks_monitoring import __version__
from deepchecks_monitoring.bgtasks.core import Task
from deepchecks_monitoring.bgtasks.telemetry import collect_telemetry
from deepchecks_monitoring.config import DatabaseSettings
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import TimeUnit, configure_logger

__all__ = ["AlertsScheduler"]


# TODO: rename to MonitorScheduler
class AlertsScheduler:
    """Alerts scheduler."""

    def __init__(
        self,
        engine: AsyncEngine,
        sleep_seconds: int = TimeUnit.MINUTE * 5,
        logger: t.Optional[logging.Logger] = None,
    ):
        self.engine = engine
        self.sleep_seconds = sleep_seconds
        self.logger = logger or logging.getLogger("alerts-scheduler")

    async def run(self):
        """Start alert scheduler."""
        # TODO: add retry logic in case of database connection lose
        engine = self.engine.execution_options(isolation_level="REPEATABLE READ")
        s = self.sleep_seconds
        try:
            while True:
                async with engine.connect() as connection:
                    await self.enqueue_tasks(connection)
                self.logger.info(f"Sleep for the next {s} seconds")
                await asyncio.sleep(s)
        except anyio.get_cancelled_exc_class():
            self.logger.exception("Scheduler coroutine canceled")
            raise
        except Exception:
            self.logger.exception("Failure")
            raise
        except BaseException:
            self.logger.warning("Scheduler interrupted")
            raise

    async def enqueue_tasks(self, connection: AsyncConnection):
        """Enqueue alert-rules execution tasks."""
        await self.try_enqueue_tasks(connection=connection, statement=EnqueueTasks)

    async def try_enqueue_tasks(
        self,
        connection: AsyncConnection,
        statement: Executable,
        max_attempts: int = 3,
        delay: int = TimeUnit.SECOND * 2
    ) -> t.Optional[t.List[Task]]:
        """Try enqueue monitor execution tasks."""
        attempts = 0
        max_attempts = 3
        delay = 2  # seconds
        while True:
            try:
                async with connection.begin():
                    self.logger.info("Looking for monitors to enqueue for execution")
                    tasks = t.cast(t.List[Task], (await connection.execute(statement)).all())
                    self.logger.info(f"Enqueued {len(tasks)} new task(s)")
                    return tasks
            except (SerializationError, DBAPIError) as error:
                # NOTE:
                # We use 'Repeatable Read Isolation Level' to run query
                # therefore transaction serialization error is possible.
                # If it occurs then we want to repeat query
                attempts += 1
                if isinstance(error, DBAPIError) and not is_serialization_error(error):
                    self.logger.exception("Monitor(s) enqueue failed")
                    raise
                if attempts > max_attempts:
                    self.logger.warning(f"Max number of attemts reached {max_attempts}")
                    return
                else:
                    self.logger.info(
                        "Serialization error occured, will "
                        f"try again in next {delay} seconds"
                    )
                    await asyncio.sleep(delay)


def is_serialization_error(error: DBAPIError):
    orig = getattr(error, "orig", None)
    orig_code = getattr(orig, "pgcode", -1)
    return (
        isinstance(orig, SerializationError)
        or error.code == "40001"
        or orig_code == "40001"
    )


# NOTE: important
# this query relies on two things
# - it must be run with 'Repeatable Read' isolation level
# - 'tasks' table must contain 'unique' constraint for the 'name' column
# without this two points query below will corrupt 'monitors' table
# logical state and will create task duplicates
#
EnqueueTasks = sa.text(dedent("""
    WITH
        mons_with_endtime AS (
            SELECT
                m.id as monitor_id,
                m.frequency as frequency,
                m.scheduling_start as scheduling_start,
                m.latest_schedule as latest_schedule,
                max(mv.end_time) as end_time
            FROM
                monitors as m,
                checks as c,
                model_versions as mv
            WHERE
                m.check_id = c.id AND
                c.model_id = mv.model_id
            GROUP BY m.id
        ),
        scheduling_series AS (
            SELECT
                mons_with_endtime.monitor_id as monitor_id,
                GENERATE_SERIES(info.last_scheduling, NOW(), info.frequency) AS timestamp
            FROM
                mons_with_endtime,
                LATERAL (
                    SELECT
                        (frequency || ' seconds')::INTERVAL AS frequency,
                        CASE
                            WHEN latest_schedule IS NULL THEN scheduling_start
                            ELSE latest_schedule
                        END AS last_scheduling
                ) as info(frequency, last_scheduling)
            WHERE (info.last_scheduling + info.frequency) <= NOW() AND
                  (info.last_scheduling + info.frequency) <= end_time
        ),
        latest_schedule AS (
            SELECT
                monitor_id,
                MAX(timestamp) AS timestamp
            FROM scheduling_series
            GROUP BY monitor_id
        ),
        updated_monitors AS (
            UPDATE monitors
            SET latest_schedule = latest_schedule.timestamp
            FROM latest_schedule
            WHERE latest_schedule.monitor_id = monitors.id
        ),
        enqueued_tasks AS (
            INSERT INTO tasks(name, executor, queue, params, priority, description, reference, execute_after)
                SELECT
                    'Monitor:' || monitor_id || ':ts:' || (select extract(epoch from timestamp)::int),
                    'execute_monitor',
                    'monitors',
                    JSONB_BUILD_OBJECT('monitor_id', monitor_id, 'timestamp', timestamp),
                    1,
                    'Monitor alert rules execution task',
                    'Monitor:' || monitor_id,
                    timestamp
                FROM scheduling_series
            ON CONFLICT ON CONSTRAINT name_uniqueness DO NOTHING
            RETURNING tasks.id, tasks.name, tasks.queue, tasks.executor, tasks.reference, tasks.priority
        )
    SELECT id, name, queue, reference, priority
    FROM enqueued_tasks
""")).columns(
    sa.Column("id", sa.Integer),
    sa.Column("name", sa.String),
    sa.Column("queue", sa.String),
    sa.Column("reference", sa.String),
    sa.Column("priority", sa.Integer)
)


class SchedulerSettings(DatabaseSettings):
    """Scheduler settings."""

    scheduler_sleep_seconds: int = 30
    scheduler_logfile: t.Optional[str] = None
    scheduler_loglevel: str = "INFO"
    scheduler_logfile_maxsize: int = 10000000  # 10MB
    scheduler_logfile_backup_count: int = 3
    uptrace_dsn: t.Optional[str] = None

    class Config:
        """Model config."""

        env_file = ".env"
        env_file_encoding = "utf-8"


def execute_alerts_scheduler(scheduler_implementation: t.Type[AlertsScheduler]):
    """Execute alrets scheduler."""
    async def main():
        settings = SchedulerSettings()  # type: ignore
        service_name = "alerts-scheduler"

        if settings.uptrace_dsn:
            import uptrace  # pylint: disable=import-outside-toplevel
            uptrace.configure_opentelemetry(
                dsn=settings.uptrace_dsn,
                service_name=service_name,
                service_version=__version__,
            )
            collect_telemetry(scheduler_implementation)

        logger = configure_logger(
            name=service_name,
            log_level=settings.scheduler_loglevel,
            logfile=settings.scheduler_logfile,
            logfile_backup_count=settings.scheduler_logfile_backup_count,
            uptrace_dsn=settings.uptrace_dsn,
        )

        async with ResourcesProvider(settings) as rp:
            async with anyio.create_task_group() as g:
                g.start_soon(scheduler_implementation(
                    rp.async_database_engine,
                    sleep_seconds=settings.scheduler_sleep_seconds,
                    logger=logger
                ).run)

    uvloop.install()
    anyio.run(main)


if __name__ == "__main__":
    # NOTE:
    # it looks weird but a problem is that python creates
    # a __main__ module by copying deepchecks_monitoring.bgtasks.scheduler
    # module as a result of this, we will have two types of alert scheduler:
    # 1. __main__.AlertsSchedulers
    # 2. deepchecks_monitoring.bgtasks.scheduler.AlertsSchedulers
    # this might cause 'execute_alerts_scheduler' to fail, therefore
    # we need to reimport AlertsScheduler type
    #
    from deepchecks_monitoring.bgtasks import scheduler
    execute_alerts_scheduler(scheduler.AlertsScheduler)
