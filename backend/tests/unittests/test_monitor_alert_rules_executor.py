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

import anyio
import pendulum as pdl
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_monitor
from deepchecks_monitoring.bgtasks.core import Task, TaskStatus, Worker
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.models import Alert
from deepchecks_monitoring.utils import TimeUnit
from tests.conftest import add_alert_rule, add_check, add_classification_data, add_model_version, add_monitor
from tests.unittests.conftest import update_model_version_end


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
            frequency=TimeUnit.SECOND * 3,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        ),
        add_monitor(
            check_id,
            client,
            lookback=TimeUnit.HOUR * 2,
            aggregation_window=TimeUnit.HOUR * 2,
            frequency=TimeUnit.SECOND * 3,
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

    async with anyio.create_task_group() as g:
        g.start_soon(AlertsScheduler(engine=async_engine, sleep_seconds=1).run)
        await anyio.sleep(5)  # give scheduler time to enqueue tasks
        g.cancel_scope.cancel()

    async with anyio.create_task_group() as g:
        g.start_soon(Worker.create(engine=async_engine, actors=[execute_monitor]).start)
        await anyio.sleep(10)  # give worker time to execute tasks
        g.cancel_scope.cancel()

    alerts: t.List[Alert] = (await async_session.scalars(sa.select(Alert))).all()
    tasks = (await async_session.scalars(sa.select(Task))).all()

    # number will vary from run to run
    # therefore just lets check that it
    # is bigger than zero
    assert len(tasks) > 0
    assert len(alerts) > 0
    assert len([it for it in tasks if it.status == TaskStatus.COMPLETED]) > 0

    for alert in alerts:
        assert alert.failed_values == {"v1": {"accuracy": 0.6666666666666666}}, alert.failed_values
        assert alert.alert_rule_id == 1


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
