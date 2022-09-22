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
import sys
import typing as t
from textwrap import dedent

import anyio
import sqlalchemy as sa
import uvloop
from asyncpg.exceptions import SerializationError
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from sqlalchemy.sql import Executable

from deepchecks_monitoring.bgtasks.task import Task
from deepchecks_monitoring.config import DatabaseSettings
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.utils import TimeUnit

__all__ = ["AlertsScheduler"]


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
        try:
            while True:
                async with engine.connect() as connection:
                    await self.enqueue_tasks(connection)
                s = self.sleep_seconds
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
        await self.try_enqueue_tasks(
            connection=connection,
            statement=EnqueueTasks
        )

    async def try_enqueue_tasks(
        self,
        connection: AsyncConnection,
        statement: Executable,
        max_attempts: int = 3,
        delay: int = TimeUnit.SECOND * 2
    ) -> t.Optional[t.List[Task]]:
        """Try enqueue alert rule execution tasks."""
        attempts = 0
        max_attempts = 3
        delay = 2  # seconds
        while True:
            try:
                async with connection.begin():
                    self.logger.info("Looking for alert rules to enqueue for execution")
                    tasks = t.cast(t.List[Task], (await connection.execute(statement)).all())
                    self.logger.info(f"Enqueued {len(tasks)} new tasks")
                    return tasks
            except (SerializationError, DBAPIError) as error:
                # NOTE:
                # We use 'Repeatable Read Isolation Level' to run query
                # therefore transaction serialization error is possible.
                # If it occurs then we want to repeat query
                attempts += 1
                if isinstance(error, DBAPIError) and not is_serialization_error(error):
                    self.logger.exception("Alert rules enqueue failed")
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
# without this two points query below will corrupt 'alert_rules' table
# logical state and will create task duplicates
#
EnqueueTasks = sa.text(dedent("""
    WITH
        scheduling_series AS (
            SELECT
                id AS alert_rule_id,
                ARRAY_POSITION(ENUM_RANGE(alert_severity), alert_severity) AS severity,
                GENERATE_SERIES(info.last_scheduling, NOW(), info.frequency) AS timestamp
            FROM
                alert_rules as ar,
                LATERAL (
                    SELECT
                        (repeat_every || ' seconds')::INTERVAL AS frequency,
                        CASE
                            WHEN last_run IS NULL THEN scheduling_start
                            ELSE last_run
                        END AS last_scheduling
                ) as info(frequency, last_scheduling)
            WHERE (info.last_scheduling + info.frequency) <= NOW() AND ar.is_active = true
        ),
        latest_schedule AS (
            SELECT
                alert_rule_id,
                MAX(timestamp) AS timestamp
            FROM scheduling_series
            GROUP BY alert_rule_id
        ),
        updated_rules AS (
            UPDATE alert_rules
            SET last_run = latest_schedule.timestamp
            FROM latest_schedule
            WHERE latest_schedule.alert_rule_id = alert_rules.id
        ),
        enqueued_tasks AS (
            INSERT INTO tasks(name, executor, queue, params, priority, description, reference, execute_after)
                SELECT
                    'AlertRule:' || alert_rule_id || ':ts:' || (select extract(epoch from timestamp)::int),
                    'execute_alert_rule',
                    'alert-rules',
                    JSONB_BUILD_OBJECT('alert_rule_id', alert_rule_id, 'timestamp', timestamp),
                    severity,
                    'Alert rule execution task',
                    'AlertRule:' || alert_rule_id,
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


def execute_alerts_scheduler(scheduler_implementation: t.Type[AlertsScheduler]):
    """Execute alrets scheduler."""
    class Settings(DatabaseSettings):
        scheduler_sleep_seconds: int = 30
        scheduler_logfile: t.Optional[str] = None  # "scheduler.log"
        scheduler_loglevel: str = "INFO"
        scheduler_logfile_maxsize: int = 10000000  # 10MB
        scheduler_logfile_backup_count: int = 3

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"

    async def main():
        settings = Settings()  # type: ignore

        logger = logging.getLogger("alerts-scheduler")
        logger.setLevel(settings.scheduler_loglevel)
        logger.propagate = True

        h = logging.StreamHandler(sys.stdout)
        h.setLevel(settings.scheduler_loglevel)
        h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        logger.addHandler(h)

        if settings.scheduler_logfile:
            h = logging.handlers.RotatingFileHandler(
                filename=settings.scheduler_logfile,
                maxBytes=settings.scheduler_logfile_backup_count,
            )
            h.setLevel(settings.scheduler_loglevel)
            h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
            logger.addHandler(h)

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
    execute_alerts_scheduler(scheduler_implementation=AlertsScheduler)
