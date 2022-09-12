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
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine

from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler, EnqueueTasks
from deepchecks_monitoring.bgtasks.task import Task, TaskStatus
from deepchecks_monitoring.models.alert_rule import AlertRule, AlertSeverity


@pytest.mark.asyncio
async def test_alert_rules_scheduler_query(async_engine: AsyncEngine):
    async with async_engine.connect() as c:
        # droping contraint to make testing easier
        async with c.begin():
            await c.execute(sa.text(
                "ALTER TABLE public.alert_rules "
                "DROP CONSTRAINT alert_rules_monitor_id_fkey"
            ))
        async with c.begin():
            task_id = await c.scalar(
                sa.insert(AlertRule).values(
                    name="Test alert",
                    condition={"value": 1, "operator": "equals"},
                    repeat_every=10,  # seconds
                    alert_severity=AlertSeverity.CRITICAL,
                    monitor_id=1,
                ).returning(AlertRule.id)
            )

        await anyio.sleep(20)

        tasks = (await c.execute(EnqueueTasks)).all()

    reference = f"AlertRule:{task_id}"
    priority = list(AlertSeverity).index(AlertSeverity.CRITICAL) + 1

    assert len(tasks) >= 2

    for task in tasks:
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.queue == "alert-rules"
        assert task.priority == priority


@pytest.mark.asyncio
async def test_alert_rules_scheduler(async_engine: AsyncEngine):
    async with async_engine.connect() as c:
        # droping contraint to make testing easier
        async with c.begin():
            await c.execute(sa.text(
                "ALTER TABLE public.alert_rules "
                "DROP CONSTRAINT alert_rules_monitor_id_fkey"
            ))
        async with c.begin():
            task_id = await c.scalar(
                sa.insert(AlertRule).values(
                    id=111,
                    name="Test alert",
                    condition={"value": 1, "operator": "equals"},
                    repeat_every=10,  # seconds
                    alert_severity=AlertSeverity.CRITICAL,
                    monitor_id=1,
                ).returning(AlertRule.id)
            )

    async with anyio.create_task_group() as g:
        g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=10).run)
        await anyio.sleep(35)
        g.cancel_scope.cancel()

    async with async_engine.connect() as c:
        tasks = (await c.execute(sa.select(Task))).all()

    reference = f"AlertRule:{task_id}"
    priority = list(AlertSeverity).index(AlertSeverity.CRITICAL) + 1

    assert len(tasks) == 4

    for task in tasks:
        assert task.status == TaskStatus.SCHEDULED
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.priority == priority

    async with async_engine.connect() as c:
        last_run = (await c.execute(
            sa.select(AlertRule.last_run)
            .where(AlertRule.id == 111)
        )).scalar_one()

    assert last_run == tasks[-1].execute_after


@pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(async_engine: AsyncEngine):
    async with async_engine.connect() as c:
        # droping contraint to make testing easier
        async with c.begin():
            await c.execute(sa.text(
                "ALTER TABLE public.alert_rules "
                "DROP CONSTRAINT alert_rules_monitor_id_fkey"
            ))
        async with c.begin():
            task_id = await c.scalar(
                sa.insert(AlertRule).values(
                    id=111,
                    name="Test alert",
                    condition={"value": 1, "operator": "equals"},
                    repeat_every=5,  # seconds
                    alert_severity=AlertSeverity.CRITICAL,
                    monitor_id=1,
                ).returning(AlertRule.id)
            )

    async with anyio.create_task_group() as g:
        for _ in range(30):
            g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=2).run)
        await anyio.sleep(40)
        g.cancel_scope.cancel()

    async with async_engine.connect() as c:
        tasks = t.cast(t.List[Task], (await c.execute(
            sa.select(Task).order_by(Task.execute_after.asc())
        )).all())

    reference = f"AlertRule:{task_id}"
    priority = list(AlertSeverity).index(AlertSeverity.CRITICAL) + 1
    prev_date = None

    # The number will vary from run to run depending on number of
    # occurred serialization errors
    assert len(tasks) > 0

    for task in tasks:
        assert task.status == TaskStatus.SCHEDULED
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.priority == priority
        if prev_date is None:
            prev_date = task.execute_after
        else:
            assert (task.execute_after - prev_date) == timedelta(seconds=5)
            prev_date = task.execute_after

    async with async_engine.connect() as c:
        last_run = (await c.execute(
            sa.select(AlertRule.last_run)
            .where(AlertRule.id == 111)
        )).scalar_one()

    assert last_run == tasks[-1].execute_after



