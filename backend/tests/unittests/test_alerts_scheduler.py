# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import asyncio
import typing as t
from datetime import timedelta

import pendulum as pdl
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker

from deepchecks_monitoring.bgtasks.core import Task, TaskStatus
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import ModelVersion, Monitor, TaskType
from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_LOGGED_TIME_COL
from deepchecks_monitoring.schema_models.model_version import get_monitor_table_name
from deepchecks_monitoring.schema_models.monitor import NUM_WINDOWS_TO_START
from tests.common import TestAPI, upload_classification_data

LABEL_CHECK_CONFIG = {
    "class_name": "SingleDatasetPerformance",
    "params": {"scorers": ["accuracy", "f1_macro"]},
    "module_name": "deepchecks.tabular.checks"
}

NON_LABEL_CHECK_CONFIG = {
    "class_name": "FeatureDrift",
    "module_name": "deepchecks.tabular.checks",
    "params": {}
}

async def get_tasks_and_latest_schedule(async_engine, user, monitor):
    async with async_engine.begin() as c:
        schema_translate_map = {None: user.organization.schema_name}

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
    return tasks, latest_schedule


@ pytest.mark.asyncio
async def test_scheduler_on_non_label_check(
    async_engine: AsyncEngine,
    user: User,
    test_api: TestAPI,
):
    # == Prepare
    # alerts delay should have no affect on the monitor since it is not a label check
    model = test_api.create_model(model={"task_type":TaskType.MULTICLASS.value, "alerts_delay_labels_ratio": 1,
                                            "alerts_delay_seconds": 3600 * 24})
    model_version = test_api.create_model_version(model["id"], model_version={"classes": ["0", "1", "2"]})
    check = test_api.create_check(model["id"], check={"config": NON_LABEL_CHECK_CONFIG})
    upload_classification_data(test_api, model_version["id"], is_labeled=False)

    frequency = 3600
    monitor = test_api.create_monitor(
        check["id"], monitor=dict(
            lookback=frequency * 3,
            name="Test alert",
            frequency=frequency,
            aggregation_window=frequency
        )
    )

    # == Act
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # == Assert
    tasks, latest_schedule = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    # last window of data is not scheduled since it schedule time didn't pass yet the model end time
    assert len(tasks) == 6

    assert_tasks(
        t.cast(t.Sequence[Task], tasks),
        monitor,
        TaskStatus.SCHEDULED
    )

    assert latest_schedule == tasks[-1].execute_after


@ pytest.mark.asyncio
async def test_scheduler_monitor_update(
    test_api: TestAPI,
    async_engine: AsyncEngine,
    user: User,
    client: TestClient
):
    # == Prepare
    model = test_api.create_model(model={"task_type":TaskType.MULTICLASS.value, "alerts_delay_labels_ratio": 1,
                                            "alerts_delay_seconds": 3600 * 24})
    model_version = test_api.create_model_version(model["id"], model_version={"classes": ["0", "1", "2"]})
    check = test_api.create_check(model["id"], check={"config": NON_LABEL_CHECK_CONFIG})
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    frequency = 3600
    # Create data for 2 windows, with first being 20 windows back to test:
    # A. new monitor is running only on last 14
    # B. there are tasks also on the empty windows
    date_range = [curr_time.subtract(seconds=frequency * 20), curr_time.subtract(seconds=frequency)]
    upload_classification_data(test_api, model_version["id"], is_labeled=False, daterange=date_range)

    monitor = test_api.create_monitor(
        check["id"], monitor=dict(
            lookback=frequency * 3,
            name="Test alert",
            frequency=frequency,
            aggregation_window=frequency
        )
    )

    # == Act
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == NUM_WINDOWS_TO_START
    assert pdl.instance(tasks[0].execute_after) == curr_time.subtract(seconds=NUM_WINDOWS_TO_START * frequency)
    assert pdl.instance(tasks[-1].execute_after) == curr_time.subtract(seconds=frequency)

   # update monitor - Should remove the current tasks defined
    request = {
        "data_filters": {"filters": [{
            "operator": "in",
            "value": ["a", "ff"],
            "column": "meta_col"
        }]}
    }
    response = client.put(f"/api/v1/monitors/{monitor['id']}", json=request)
    assert response.status_code == 200

    # test that tasks are removed
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == 0

    # == Act - Should recreate the removed tasks
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # test that new tasks were scheduled
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == NUM_WINDOWS_TO_START


@pytest.mark.asyncio
async def test_alert_rule_scheduling_with_multiple_concurrent_updaters(
    async_engine: AsyncEngine,
    user: User,
    test_api: TestAPI,
):
    # == Prepare
    # alerts delay should have no affect on the monitor since it is not a label check
    model = test_api.create_model(model={"task_type":TaskType.MULTICLASS.value, "alerts_delay_labels_ratio": 1,
                                            "alerts_delay_seconds": 3600 * 24})
    model_version = test_api.create_model_version(model["id"], model_version={"classes": ["0", "1", "2"]})
    check = test_api.create_check(model["id"], check={"config": NON_LABEL_CHECK_CONFIG})
    frequency = 3600 * 3
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    date_range = [curr_time.subtract(seconds=frequency * 5), curr_time.subtract(seconds=frequency)]
    upload_classification_data(test_api, model_version["id"], is_labeled=False, daterange=date_range)
    monitor = test_api.create_monitor(
        check["id"], monitor=dict(
            lookback=frequency * 3,
            name="Test alert",
            frequency=frequency,
            aggregation_window=frequency
        )
    )

    # Run 10 parallel schedulers
    scheduler = AlertsScheduler(engine=async_engine, sleep_seconds=1)
    await asyncio.gather(*[scheduler.run_all_organizations() for _ in range(1)])

    # == Assert
    tasks, latest_schedule = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    # last window of data is not scheduled since it schedule time didn't pass yet the model end time
    assert len(tasks) == 4
    assert_tasks(t.cast(t.Sequence[Task], tasks), monitor, TaskStatus.SCHEDULED)
    assert latest_schedule == tasks[-1].execute_after


@pytest.mark.asyncio
async def test_scheduling_with_seconds_delay(
    async_engine: AsyncEngine,
    user: User,
    test_api: TestAPI,
):
    # == Prepare
    # alerts delay should have no affect on the monitor since it is not a label check
    model = test_api.create_model(model={"task_type":TaskType.MULTICLASS.value, "alerts_delay_labels_ratio": 1,
                                            "alerts_delay_seconds": 3600 * 24})
    model_version = test_api.create_model_version(model["id"], model_version={"classes": ["0", "1", "2"]})
    check = test_api.create_check(model["id"], check={"config": LABEL_CHECK_CONFIG})
    frequency = 3600 * 3
    upload_classification_data(test_api, model_version["id"], is_labeled=False)
    monitor = test_api.create_monitor(
        check["id"], monitor=dict(
            lookback=frequency * 3,
            name="Test alert",
            frequency=frequency,
            aggregation_window=frequency
        )
    )

    # == Act - Should not schedule tasks since we have delay of 24 hours
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # == Assert
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == 0

    # == Act - Change logged timestamp of the data
    session_factory = sessionmaker(async_engine, class_=AsyncSession)
    async with session_factory.begin() as session:
        schema_translate_map = {None: user.organization.schema_name}

        model_version = t.cast(ModelVersion, (await session.execute(
            sa.select(ModelVersion).execution_options(schema_translate_map=schema_translate_map)
        )).first()[0])

        new_log_time = pdl.now().subtract(seconds=3600 * 25).to_iso8601_string()
        table = user.organization.schema_name + "." + model_version.get_monitor_table_name()
        update_sql = f"update {table} set {SAMPLE_LOGGED_TIME_COL} = '{new_log_time}'::timestamptz"
        await session.execute(text(update_sql))

    # Should schedule tasks since we now passed the delay of 24 hours
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # == Assert
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == 2


@pytest.mark.asyncio
async def test_scheduling_with_labels_ratio_delay(
    async_engine: AsyncEngine,
    user: User,
    test_api: TestAPI
):
    # == Prepare
    # alerts delay should have no affect on the monitor since it is not a label check
    model = test_api.create_model(model={"task_type": TaskType.MULTICLASS.value, "alerts_delay_labels_ratio": 1,
                                         "alerts_delay_seconds": 3600 * 24})
    model_version = test_api.create_model_version(model["id"], model_version={"classes": ["0", "1", "2"]})
    check = test_api.create_check(model["id"], check={"config": LABEL_CHECK_CONFIG})
    frequency = 3600 * 3
    upload_classification_data(test_api, model_version["id"], is_labeled=False)
    monitor = test_api.create_monitor(
        check["id"], monitor=dict(
            lookback=frequency * 3,
            name="Test alert",
            frequency=frequency,
            aggregation_window=frequency
        )
    )

    # == Act - Should not schedule tasks since we have delay of 24 hours
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # == Assert
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == 0

    # == Act - Add labels to all data
    session_factory = sessionmaker(async_engine, class_=AsyncSession)
    async with session_factory.begin() as session:
        samples_table = f"{user.organization.schema_name}.{get_monitor_table_name(model['id'], model_version['id'])}"
        labels_table = f"{user.organization.schema_name}.model_{model['id']}_sample_labels"
        update_sql = f"""
            insert into {labels_table} select "{SAMPLE_ID_COL}", '1' from {samples_table} 
        """
        await session.execute(text(update_sql))

    # Should schedule tasks since we now passed the delay of 24 hours
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    # == Assert
    tasks, _ = await get_tasks_and_latest_schedule(async_engine, user, monitor)
    assert len(tasks) == 2


def assert_tasks(tasks: t.Sequence[Task], monitor, expected_status: TaskStatus):
    reference = f"Monitor:{monitor['id']}"
    prev_date = None

    for task in tasks:
        task = t.cast(Task, task)
        assert task.status == expected_status
        assert task.reference == reference
        assert task.name.startswith(reference)
        assert task.queue == "monitors"
        assert isinstance(task.params, dict)
        assert "monitor_id" in task.params and task.params["monitor_id"] == monitor["id"]
        assert "timestamp" in task.params and isinstance(task.params["timestamp"], str)
        assert pdl.parse(task.params["timestamp"]) == task.execute_after

        if prev_date is None:
            prev_date = task.execute_after
        else:
            assert (task.execute_after - prev_date) == timedelta(seconds=monitor["frequency"])
            prev_date = task.execute_after
