# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import typing as t
from datetime import timedelta

import anyio
import pendulum as pdl
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine

from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler, EnqueueTasks
from deepchecks_monitoring.bgtasks.task import Task, TaskStatus
from deepchecks_monitoring.models.monitor import Monitor
from tests.conftest import add_monitor


async def schedule_tasks(delay, async_engine) -> t.List[Task]:
    await anyio.sleep(delay)
    async with async_engine.connect() as c:
        async with c.begin():
            await c.execute(EnqueueTasks)

    async with async_engine.connect() as c:
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        return t.cast(t.List[Task], (await c.execute(tasks_query)).all())


@pytest.mark.asyncio
async def test_alert_rules_scheduler_query(classification_model_check_id, client, async_engine: AsyncEngine):
    # == Prepare
    monitor_id = add_monitor(classification_model_check_id, client, lookback=3600 * 3,
                             name="Test alert",
                             frequency=5,  # seconds
                             )
    async with async_engine.connect() as c:
        monitor = (await c.execute(
            sa.select(Monitor)
            .where(Monitor.id == monitor_id)
        )).first()

    # == Act
    tasks = await schedule_tasks(11, async_engine)

    assert len(tasks) >= 2
    assert_tasks(tasks, monitor, TaskStatus.SCHEDULED)


@ pytest.mark.asyncio
async def test_alert_rules_scheduler(classification_model_check_id, client, async_engine: AsyncEngine):
    # == Prepare
    monitor_id = add_monitor(classification_model_check_id, client, lookback=3600 * 3,
                             name="Test alert",
                             frequency=10,  # seconds
                             )
    async with async_engine.connect() as c:
        monitor = (await c.execute(
            sa.select(Monitor)
            .where(Monitor.id == monitor_id)
        )).first()

    # == Act
    tasks = await schedule_tasks(35, async_engine)

    # == Assert
    assert len(tasks) == 4
    assert_tasks(t.cast(t.Sequence[Task], tasks), t.cast(Monitor, monitor), TaskStatus.SCHEDULED)

    async with async_engine.connect() as c:
        latest_schedule = (await c.execute(
            sa.select(Monitor.latest_schedule)
            .where(Monitor.id == monitor_id)
        )).scalar_one()

        assert latest_schedule == tasks[-1].execute_after


@ pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(classification_model_check_id, client,
                                                                       async_engine: AsyncEngine):
    # == Prepare
    monitor_id = add_monitor(classification_model_check_id, client, lookback=3600 * 3,
                             name="Test alert",
                             frequency=5,  # seconds
                             )
    async with async_engine.connect() as c:
        monitor = (await c.execute(
            sa.select(Monitor)
            .where(Monitor.id == monitor_id)
        )).first()

    # == Act
    async with anyio.create_task_group() as g:
        for _ in range(30):
            g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=2).run)
        await anyio.sleep(40)
        g.cancel_scope.cancel()

    # == Assert
    async with async_engine.connect() as c:
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        tasks = t.cast(t.List[Task], (await c.execute(tasks_query)).all())

        # The number will vary from run to run depending on number of
        # occurred serialization errors
        assert len(tasks) > 0
        assert_tasks(t.cast(t.Sequence[Task], tasks), t.cast(Monitor, monitor), TaskStatus.SCHEDULED)

        latest_schedule = (await c.execute(
            sa.select(Monitor.latest_schedule)
            .where(Monitor.id == monitor_id)
        )).scalar_one()

        assert latest_schedule == tasks[-1].execute_after


async def drop_alert_rules_constraint(connection, name):
    async with connection.begin():
        await connection.execute(sa.text(
            f"ALTER TABLE public.alert_rules DROP CONSTRAINT IF EXISTS {name}"
        ))


def assert_tasks(tasks: t.Sequence[Task], monitor: Monitor, expected_status: TaskStatus):
    reference = f"Monitor:{monitor.id}"
    prev_date = None

    for task in tasks:
        assert task.status == expected_status
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.queue == "monitors"
        assert isinstance(task.params, dict)
        assert "monitor_id" in task.params and task.params["monitor_id"] == monitor.id
        assert "timestamp" in task.params and isinstance(task.params["timestamp"], str)
        assert pdl.parse(task.params["timestamp"]) == task.execute_after

        if prev_date is None:
            prev_date = task.execute_after
        else:
            assert (task.execute_after - prev_date) == timedelta(seconds=monitor.frequency)
            prev_date = task.execute_after
