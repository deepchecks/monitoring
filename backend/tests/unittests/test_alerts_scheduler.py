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
from deepchecks_monitoring.models.alert_rule import AlertRule, AlertSeverity


async def add_alert_rule(alert_rule: t.Dict, async_engine):
    async with async_engine.connect() as c:
        # dropping constraint to make testing easier
        await drop_alert_rules_constraint(c, "alert_rules_monitor_id_fkey")

        async with c.begin():
            return (await c.execute(sa.insert(AlertRule).values(alert_rule).returning(AlertRule))).first()


async def schedule_tasks(delay, async_engine) -> t.List[Task]:
    await anyio.sleep(delay)
    async with async_engine.connect() as c:
        async with c.begin():
            await c.execute(EnqueueTasks)

    async with async_engine.connect() as c:
        tasks_query = sa.select(Task).order_by(Task.execute_after.asc())
        return t.cast(t.List[Task], (await c.execute(tasks_query)).all())


@pytest.mark.asyncio
async def test_alert_rules_scheduler_query(async_engine: AsyncEngine):
    # == Prepare
    alert_rule = dict(
        name="Test alert",
        condition={"value": 1, "operator": "equals"},
        repeat_every=5,  # seconds
        alert_severity=AlertSeverity.CRITICAL,
        monitor_id=1,
        is_active=True
    )
    alert_rule = await add_alert_rule(alert_rule, async_engine)

    # == Act
    tasks = await schedule_tasks(11, async_engine)

    assert len(tasks) >= 2
    assert_tasks(tasks, alert_rule, TaskStatus.SCHEDULED)


@pytest.mark.asyncio
async def test_alert_rules_scheduler(async_engine: AsyncEngine):
    # == Prepare
    alert_rule = dict(
        id=111,
        name="Test alert",
        condition={"value": 1, "operator": "equals"},
        repeat_every=10,  # seconds
        alert_severity=AlertSeverity.CRITICAL,
        monitor_id=1
    )
    alert_rule = await add_alert_rule(alert_rule, async_engine)

    # == Act
    tasks = await schedule_tasks(35, async_engine)

    # == Assert
    assert len(tasks) == 4
    assert_tasks(t.cast(t.Sequence[Task], tasks), t.cast(AlertRule, alert_rule), TaskStatus.SCHEDULED)

    async with async_engine.connect() as c:
        last_run = (await c.execute(
            sa.select(AlertRule.last_run)
            .where(AlertRule.id == alert_rule.id)
        )).scalar_one()

        assert last_run == tasks[-1].execute_after


@pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(async_engine: AsyncEngine):
    # == Prepare
    alert_rule = dict(
        id=111,
        name="Test alert",
        condition={"value": 1, "operator": "equals"},
        repeat_every=5,  # seconds
        alert_severity=AlertSeverity.CRITICAL,
        monitor_id=1,
    )
    alert_rule = await add_alert_rule(alert_rule, async_engine)

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
        assert_tasks(t.cast(t.Sequence[Task], tasks), t.cast(AlertRule, alert_rule), TaskStatus.SCHEDULED)

        last_run = (await c.execute(
            sa.select(AlertRule.last_run)
            .where(AlertRule.id == 111)
        )).scalar_one()

        assert last_run == tasks[-1].execute_after


async def drop_alert_rules_constraint(connection, name):
    async with connection.begin():
        await connection.execute(sa.text(
            f"ALTER TABLE public.alert_rules DROP CONSTRAINT IF EXISTS {name}"
        ))


def assert_tasks(tasks: t.Sequence[Task], alert_rule: AlertRule, expected_status: TaskStatus):
    reference = f"AlertRule:{alert_rule.id}"
    priority = list(AlertSeverity).index(alert_rule.alert_severity) + 1
    prev_date = None

    for task in tasks:
        assert task.status == expected_status
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.queue == "alert-rules"
        assert task.priority == priority
        assert isinstance(task.params, dict)
        assert "alert_rule_id" in task.params and task.params["alert_rule_id"] == alert_rule.id
        assert "timestamp" in task.params and isinstance(task.params["timestamp"], str)
        assert pdl.parse(task.params["timestamp"]) == task.execute_after

        if prev_date is None:
            prev_date = task.execute_after
        else:
            assert (task.execute_after - prev_date) == timedelta(seconds=alert_rule.repeat_every)
            prev_date = task.execute_after


@pytest.mark.asyncio
async def test_alert_rules_scheduler_not_scheduling_unactive(async_engine: AsyncEngine):
    # == Prepare
    alert_rule = dict(
        id=111,
        name="Test alert",
        condition={"value": 1, "operator": "equals"},
        repeat_every=1,  # seconds
        alert_severity=AlertSeverity.CRITICAL,
        monitor_id=1,
        is_active=False
    )
    await add_alert_rule(alert_rule, async_engine)

    # == Act
    tasks = await schedule_tasks(8, async_engine)

    # == Assert
    assert len(tasks) == 0
