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
from datetime import datetime, timedelta, timezone
from random import random

import anyio
import pendulum as pdl
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine

from deepchecks_monitoring.bgtasks.core import Task, TaskStatus
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler, create_task_enqueueing_query
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models.monitor import Monitor
from tests.common import Payload, TestAPI
from tests.unittests.conftest import update_model_version_end


async def schedule_tasks(async_engine, organization) -> t.List[Task]:
    query = create_task_enqueueing_query(organization.id, organization.schema_name)

    async with async_engine.begin() as c:
        await c.execute(query)

    async with async_engine.connect() as c:
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        tasks_query = tasks_query.execution_options(schema_translate_map={None: organization.schema_name})
        return t.cast(t.List[Task], (await c.execute(tasks_query)).all())


UpdateMonitor = (
    sa.update(Monitor)
    .where(Monitor.id == sa.bindparam("monitor_id"))
    .values({Monitor.scheduling_start: sa.bindparam("start")})
    .returning(Monitor)
)


@pytest.mark.asyncio
async def test_alert_rules_scheduler_query(
    classification_model_check: Payload,
    classification_model_version: Payload,
    test_api: TestAPI,
    async_engine: AsyncEngine,
    user: User
):
    # == Prepare
    await update_model_version_end(
        async_engine,
        classification_model_version["id"],
        user.organization,
    )
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "lookback": 3600 * 3,
            "name": "Test alert",
            "frequency": 600,  # 10mins
        }
    ))

    async with async_engine.begin() as c:
        schema_translate_map = {None: user.organization.schema_name}
        monitor = (await c.execute(
            UpdateMonitor.execution_options(schema_translate_map=schema_translate_map),
            parameters={"monitor_id": monitor["id"], "start": pdl.now() - pdl.duration(hours=1)}
        )).first()

    # == Act
    tasks = await schedule_tasks(async_engine, user.organization)

    # == Assert
    assert len(tasks) == 7
    assert_tasks(tasks, monitor, TaskStatus.SCHEDULED)


@ pytest.mark.asyncio
async def test_alert_rules_scheduler(
    classification_model_check: Payload,
    classification_model_version: Payload,
    test_api: TestAPI,
    async_engine: AsyncEngine,
    user: User
):
    # == Prepare
    schema_translate_map = {None: user.organization.schema_name}

    await update_model_version_end(
        async_engine,
        classification_model_version["id"],
        user.organization
    )
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "lookback": 3600 * 3,
            "name": "Test alert",
            "frequency": 600,  # 10mins
        }
    ))

    async with async_engine.begin() as c:
        monitor = (await c.execute(
            UpdateMonitor.execution_options(schema_translate_map=schema_translate_map),
            parameters={"monitor_id": monitor["id"], "start": pdl.now() - pdl.duration(hours=1)}
        )).first()

    async with async_engine.connect() as c:
        # == Act
        await AlertsScheduler(engine=None).enqueue_tasks(c)

        # == Assert
        tasks = t.cast(t.List[Task], (await c.execute(
            sa.select(Task)
            .order_by(Task.execute_after.asc())
            .execution_options(schema_translate_map=schema_translate_map)
        )).all())

        latest_schedule = (await c.execute(
            sa.select(Monitor.latest_schedule)
            .where(Monitor.id == monitor["id"])
            .execution_options(schema_translate_map=schema_translate_map)
        )).scalar_one()

    assert len(tasks) == 7

    assert_tasks(
        t.cast(t.Sequence[Task], tasks),
        t.cast(Monitor, monitor),
        TaskStatus.SCHEDULED
    )

    assert latest_schedule == tasks[-1].execute_after


@ pytest.mark.asyncio
async def test_alert_rules_scheduler_monitor_update(
    classification_model_check: Payload,
    classification_model_version: Payload,
    test_api: TestAPI,
    async_engine: AsyncEngine,
    user: User
):
    # == Prepare
    schema_translate_map = {None: user.organization.schema_name}

    await update_model_version_end(
        async_engine,
        classification_model_version["id"],
        user.organization,
        end_time=datetime.now(timezone.utc)
    )
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "lookback": 3600 * 3,
            "name": "Test alert",
            "frequency": 3600,  # 1 hour
        }
    ))

    async with async_engine.connect() as c:
        # == Act
        await AlertsScheduler(engine=async_engine).enqueue_tasks(c)

        # == Assert
        tasks = dict((await c.execute(
            sa.select(Task.id, Task.name)
            .order_by(Task.execute_after.asc())
            .execution_options(schema_translate_map=schema_translate_map)
        )).all())

    assert len(tasks) == 11

    # update monitor
    test_api.update_monitor(
        monitor_id=monitor["id"],
        monitor={
            "data_filters": {"filters": [{
                "operator": "contains",
                "value": ["a", "ff"],
                "column": "meta_col"
            }]}
        }
    )

    # test that 10 new alerts were scheduled
    async with async_engine.connect() as c:
        # == Act
        await AlertsScheduler(engine=None).enqueue_tasks(c)

        # == Assert
        updated_tasks = dict((await c.execute(
            sa.select(Task.id, Task.name)
            .order_by(Task.execute_after.asc())
            .execution_options(schema_translate_map=schema_translate_map)
        )).all())

    assert len(updated_tasks) == 11  # should be the same as 10 were deleted

    # assert that 10 new tasks were really created
    updated_tasks.update(tasks)
    assert len(updated_tasks) == 21


@pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(
    classification_model_check: Payload,
    classification_model_version: Payload,
    test_api: TestAPI,
    async_engine: AsyncEngine,
    user: User
):
    # == Prepare
    schema_translate_map = {None: user.organization.schema_name}

    await update_model_version_end(
        async_engine,
        classification_model_version["id"],
        user.organization
    )
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "lookback": 3600 * 3,
            "name": "Test alert",
            "frequency": 1,  # secs
        }
    ))

    async with async_engine.begin() as c:
        monitor = (await c.execute(
            sa.select(Monitor)
            .where(Monitor.id == monitor["id"])
            .execution_options(schema_translate_map=schema_translate_map)
        )).first()

    async with anyio.create_task_group() as g:
        for _ in range(8):
            await anyio.sleep(random())
            g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=1).run)
        await anyio.sleep(15)
        g.cancel_scope.cancel()

    # == Assert
    async with async_engine.connect() as c:
        tasks = t.cast(t.List[Task], (await c.execute(
            sa.select(Task)
            .order_by(Task.execute_after.asc())
            .execution_options(schema_translate_map=schema_translate_map)
        )).all())

        # The number will vary from run to run depending on number of
        # occurred serialization errors
        assert len(tasks) > 0
        assert_tasks(t.cast(t.Sequence[Task], tasks), t.cast(Monitor, monitor), TaskStatus.SCHEDULED)

        latest_schedule = (await c.execute(
            sa.select(Monitor.latest_schedule)
            .where(Monitor.id == monitor["id"])
            .execution_options(schema_translate_map=schema_translate_map)
        )).scalar_one()

        assert latest_schedule == tasks[-1].execute_after


def assert_tasks(tasks: t.Sequence[Task], monitor: Monitor, expected_status: TaskStatus):
    reference = f"Monitor:{monitor.id}"
    prev_date = None

    for task in tasks:
        task = t.cast(Task, task)
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
