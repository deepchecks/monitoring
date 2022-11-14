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
# pylint: disable=protected-access
import typing as t
from collections import defaultdict

import pendulum as pdl
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_monitor
from deepchecks_monitoring.bgtasks.core import Task, TaskStatus, Worker
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.models import Alert, Monitor
from deepchecks_monitoring.utils import TimeUnit
from tests.conftest import add_alert_rule, add_check, add_classification_data, add_model_version, add_monitor
from tests.unittests.conftest import update_model_version_end
from tests.unittests.test_alerts_scheduler import UpdateMonitor


@pytest.mark.asyncio
async def test_monitor_executor(
    async_session: AsyncSession,
    client: TestClient,
    classification_model_id: int,
):
    check_id = t.cast(int, add_check(
        classification_model_id,
        client=client
    ))

    monitor_id = add_monitor(
        check_id,
        client,
        lookback=TimeUnit.DAY * 24,
        frequency=TimeUnit.SECOND * 2,
        additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
        data_filters={
            "filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]
        }
    )
    rule_that_should_raise_id = t.cast(int, add_alert_rule(
        monitor_id,
        client,
        condition={"operator": "less_than", "value": 0.7}
    ))

    rule_that_does_nothing_id = t.cast(int, add_alert_rule(  # pylint: disable=unused-variable
        monitor_id,
        client,
        condition={"operator": "less_than", "value": 0}
    ))
    versions = [
        t.cast(int, add_model_version(classification_model_id, client, name="v1", classes=["0", "1", "2"])),
        t.cast(int, add_model_version(classification_model_id, client, name="v2", classes=["0", "1", "2"])),
        t.cast(int, add_model_version(classification_model_id, client, name="v3", classes=["0", "1", "2"])),
    ]

    for version_id in versions[:2]:
        add_classification_data(version_id, client)

    now = pdl.now()

    result: t.List[Alert] = await execute_monitor(monitor_id=monitor_id, timestamp=str(now), session=async_session)

    assert len(result) == 1, result
    alert = result[0]

    assert isinstance(alert, Alert), alert
    assert alert.alert_rule_id == rule_that_should_raise_id
    assert isinstance(alert.failed_values, dict), alert.failed_values
    assert alert.failed_values == {"v1": {"accuracy": 0.2}, "v2": {"accuracy": 0.2}}, alert.failed_values


@pytest.mark.asyncio
async def test_alert_scheduling(
    async_session: AsyncSession,
    async_engine: AsyncEngine,
    client: TestClient,
    classification_model_id: int,
    classification_model_version_id: int,
):
    # TODO: add description to the test
    # == Prepare
    await update_model_version_end(async_engine, classification_model_version_id)

    check_id = t.cast(int, add_check(
        classification_model_id,
        client=client
    ))

    monitors = [
        add_monitor(
            check_id,
            client,
            lookback=TimeUnit.DAY * 3,
            frequency=TimeUnit.SECOND * 600,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        ),
        add_monitor(
            check_id,
            client,
            lookback=TimeUnit.HOUR * 2,
            aggregation_window=TimeUnit.HOUR * 2,
            frequency=TimeUnit.SECOND * 600,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        )
    ]
    rules = [  # pylint: disable=unused-variable
        t.cast(int, add_alert_rule(
            monitors[0],
            client,
            condition={"operator": "less_than", "value": 0.7}
        )),
        t.cast(int, add_alert_rule(
            monitors[1],
            client,
            condition={"operator": "less_than", "value": 0.7}
        )),
    ]

    model_version_id = t.cast(int, add_model_version(
        classification_model_id,
        client,
        name="v1"
    ))

    past_date = pdl.now() - pdl.duration(days=1)
    daterange = [past_date.add(hours=h) for h in range(1, 24, 2)]
    add_classification_data(model_version_id, client, daterange=daterange)

    for monitor_id in monitors:
        async with async_engine.begin() as c:
            (await c.execute(
                UpdateMonitor,
                parameters={
                    "monitor_id": monitor_id,
                    "start": pdl.now() - pdl.duration(hours=1)
                }
            )).first()

    # == Act
    worker = Worker.create(engine=async_engine, actors=[execute_monitor])
    scheduler = AlertsScheduler(engine=None)

    async with async_engine.connect() as c:
        await scheduler.enqueue_tasks(c)

    async with worker.create_database_session() as s:
        async for task in worker.tasks_broker._next_task(s):
            await worker.execute_task(s, task)

    # == Assert
    alerts = (await async_session.scalars(sa.select(Alert))).all()
    tasks = (await async_session.scalars(sa.select(Task))).all()

    monitors = (await async_session.scalars(
        sa.select(Monitor).where(Monitor.id.in_(monitors))
    )).all()

    alert_per_rule = defaultdict(list)
    tasks_per_monitor = defaultdict(list)

    for it in tasks:
        tasks_per_monitor[it.reference].append(it)

    for it in alerts:
        alert_per_rule[it.alert_rule_id].append(it)

    assert all(len(v) == 7 for v in tasks_per_monitor.values())
    assert all(it.status == TaskStatus.COMPLETED for it in tasks)
    assert len(alert_per_rule[rules[0]]) == 7
    assert len(alert_per_rule[rules[1]]) == 1

    for alert in alert_per_rule[rules[0]]:
        assert alert.failed_values["v1"]["accuracy"] in (0.6666666666666666, 0.3333333333333333)

    for alert in alert_per_rule[rules[1]]:
        assert alert.failed_values == {"v1": {"accuracy": 0.0}}, alert.failed_values


@pytest.mark.asyncio
async def test_monitor_executor_with_unactive_alert_rules(
    async_session: AsyncSession,
    client: TestClient,
    classification_model_id: int,
):
    check_id = t.cast(int, add_check(
        classification_model_id,
        client=client
    ))

    monitor_id = add_monitor(
        check_id,
        client,
        lookback=TimeUnit.DAY * 3,
        frequency=TimeUnit.DAY * 2,
        additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
        data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
    )
    rule_id = t.cast(int, add_alert_rule(  # pylint: disable=unused-variable
        monitor_id,
        client,
        condition={"operator": "less_than", "value": 0.7},
        is_active=False
    ))

    now = pdl.now()

    result = await execute_monitor(monitor_id=monitor_id, timestamp=str(now), session=async_session)
    assert not result
