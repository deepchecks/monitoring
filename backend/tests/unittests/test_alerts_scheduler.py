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
from random import random

import anyio
import pendulum as pdl
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine

from deepchecks_monitoring.bgtasks.core import Task, TaskStatus
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler, EnqueueTasks
from deepchecks_monitoring.models.monitor import Monitor
from tests.conftest import add_monitor
from tests.unittests.conftest import update_model_version_end


async def schedule_tasks(async_engine) -> t.List[Task]:
    async with async_engine.begin() as c:
        await c.execute(EnqueueTasks)

    async with async_engine.connect() as c:
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        return t.cast(t.List[Task], (await c.execute(tasks_query)).all())


UpdateMonitor = (
    sa.update(Monitor)
    .where(Monitor.id == sa.bindparam("monitor_id"))
    .values({Monitor.scheduling_start: sa.bindparam("start")})
    .returning(Monitor)
)


@pytest.mark.asyncio
async def test_alert_rules_scheduler_query(
    classification_model_check_id,
    classification_model_version_id,
    client: TestClient,
    async_engine: AsyncEngine
):
    # == Prepare
    await update_model_version_end(async_engine, classification_model_version_id)

    monitor_id = add_monitor(
        classification_model_check_id,
        client,
        lookback=3600 * 3,
        name="Test alert",
        frequency=600,  # 10mins
    )

    async with async_engine.begin() as c:
        monitor = (await c.execute(
            UpdateMonitor,
            parameters={
                "monitor_id": monitor_id,
                "start": pdl.now() - pdl.duration(hours=1)
            }
        )).first()

    # == Act
    tasks = await schedule_tasks(async_engine)

    # == Assert
    assert len(tasks) == 7
    assert_tasks(tasks, monitor, TaskStatus.SCHEDULED)


@ pytest.mark.asyncio
async def test_alert_rules_scheduler(
    classification_model_check_id: int,
    classification_model_version_id: int,
    client: TestClient,
    async_engine: AsyncEngine
):
    # TODO:
    # looks like this test was modified by someone in an improper way,
    # it should use `AlertsScheduler` directly and not `EnqueueTasks` query to
    # enqueue tasks

    # == Prepare
    await update_model_version_end(async_engine, classification_model_version_id)

    monitor_id = add_monitor(
        classification_model_check_id, client,
        lookback=3600 * 3,
        name="Test alert",
        frequency=600,  # 10mins
    )

    async with async_engine.begin() as c:
        monitor = (await c.execute(
            UpdateMonitor,
            parameters={
                "monitor_id": monitor_id,
                "start": pdl.now() - pdl.duration(hours=1)
            }
        )).first()

    async with async_engine.connect() as c:
        # == Act
        scheduler = AlertsScheduler(engine=async_engine)
        await scheduler.enqueue_tasks(c)

        # == Assert
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        tasks = t.cast(t.List[Task], (await c.execute(tasks_query)).all())
        latest_schedule_query = sa.select(Monitor.latest_schedule).where(Monitor.id == monitor_id)
        latest_schedule = (await c.execute(latest_schedule_query)).scalar_one()

    assert len(tasks) == 7

    assert_tasks(
        t.cast(t.Sequence[Task], tasks),
        t.cast(Monitor, monitor),
        TaskStatus.SCHEDULED
    )

    assert latest_schedule == tasks[-1].execute_after


@pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(
    classification_model_check_id: int,
    classification_model_version_id: int,
    client: TestClient,
    async_engine: AsyncEngine
):
    # == Prepare
    await update_model_version_end(async_engine, classification_model_version_id)

    monitor_id = add_monitor(
        classification_model_check_id,
        client,
        lookback=3600 * 3,
        name="Test alert",
        frequency=1,  # secs
    )

    async with async_engine.connect() as c:
        monitor = (await c.execute(
            sa.select(Monitor)
            .where(Monitor.id == monitor_id)
        )).first()

    async with anyio.create_task_group() as g:
        for _ in range(12):
            await anyio.sleep(random())
            g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=1).run)
        await anyio.sleep(10)
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
