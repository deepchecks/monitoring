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
# pylint: disable=protected-access,
import logging
import typing as t
from collections import defaultdict

import pendulum as pdl
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_monitor
from deepchecks_monitoring.bgtasks.core import Task, TaskStatus, Worker
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
from deepchecks_monitoring.monitoring_utils import TimeUnit
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, Monitor
from deepchecks_monitoring.utils import database
from tests.common import Payload, TestAPI, upload_classification_data
from tests.unittests.conftest import update_model_version_end
from tests.unittests.test_alerts_scheduler import UpdateMonitor


@pytest.mark.asyncio
async def test_monitor_executor(
    async_session: AsyncSession,
    test_api: TestAPI,
    classification_model: Payload,
    user: User,
    resources_provider: ResourcesProvider
):
    check = t.cast(Payload, test_api.create_check(
        model_id=classification_model["id"],
        check={"config": {
            "class_name": "SingleDatasetPerformance",
            "params": {},
            "module_name": "deepchecks.tabular.checks"
        }}
    ))

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=check["id"],
        monitor={
            "lookback": TimeUnit.DAY * 24,
            "frequency": TimeUnit.SECOND * 2,
            "additional_kwargs": {"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            "data_filters": {"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        }
    ))
    rule_that_should_raise = t.cast(Payload, test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"condition": {"operator": "less_than", "value": 0.7}}
    ))
    rule_that_does_nothing = t.cast(Payload, test_api.create_alert_rule(  # pylint: disable=unused-variable
        monitor_id=monitor["id"],
        alert_rule={"condition": {"operator": "less_than", "value": 0}}
    ))

    versions = t.cast(t.List[Payload], [
        test_api.create_model_version(
            model_id=classification_model["id"],
            model_version={"name": "v1", "classes": ["0", "1", "2"]}
        ),
        test_api.create_model_version(
            model_id=classification_model["id"],
            model_version={"name": "v2", "classes": ["0", "1", "2"]}
        ),
        test_api.create_model_version(
            model_id=classification_model["id"],
            model_version={"name": "v3", "classes": ["0", "1", "2"]}
        )
    ])

    for version in versions[:2]:
        upload_classification_data(model_version_id=version["id"], api=test_api)

    now = pdl.now()

    result: t.List[Alert] = await execute_monitor(
        monitor_id=monitor["id"],
        timestamp=str(now),
        session=async_session,
        organization_id=user.organization.id,
        organization_schema=user.organization.schema_name,
        resources_provider=resources_provider,
        logger=logging.Logger("test")
    )

    assert len(result) == 1, result
    alert = result[0]

    assert isinstance(alert, Alert), alert
    assert alert.alert_rule_id == rule_that_should_raise["id"]
    assert isinstance(alert.failed_values, dict), alert.failed_values
    assert alert.failed_values == {"v1": {"accuracy": 0.2}, "v2": {"accuracy": 0.2}}, alert.failed_values

    # Assert cache was saved
    window_end = floor_window_for_time(now, TimeUnit.SECOND * 2)
    window_start = window_end.subtract(seconds=TimeUnit.DAY * 2)
    cache_value = resources_provider.cache_functions.get_monitor_cache(
        user.organization.id,
        versions[0]["id"],
        monitor["id"],
        window_start,
        window_end
    )

    assert cache_value.found is True
    assert cache_value.value == {"accuracy": 0.2}


@pytest.mark.asyncio
async def test_alert_scheduling(
    async_session: AsyncSession,
    async_engine: AsyncEngine,
    test_api: TestAPI,
    classification_model: Payload,
    classification_model_version: Payload,
    user: User,
    resources_provider: ResourcesProvider
):
    # TODO: add description to the test
    # == Prepare
    schema_translate_map = {None: user.organization.schema_name}

    await update_model_version_end(
        async_engine,
        classification_model_version["id"],
        organization=user.organization
    )

    check = t.cast(Payload, test_api.create_check(
        model_id=classification_model["id"],
        check={"config": {
            "class_name": "SingleDatasetPerformance",
            "params": {},
            "module_name": "deepchecks.tabular.checks"
        }}
    ))
    monitors = t.cast(t.List[Payload], [
        test_api.create_monitor(
            check_id=check["id"],
            monitor={
                "lookback": TimeUnit.DAY * 3,
                "aggregation_window": (TimeUnit.DAY * 3) / 12,
                "frequency": TimeUnit.SECOND * 600,
                "additional_kwargs": {"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
                "data_filters": {"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
            }
        ),
        test_api.create_monitor(
            check_id=check["id"],
            monitor={
                "lookback": TimeUnit.HOUR * 2,
                "aggregation_window": TimeUnit.HOUR * 2,
                "frequency": TimeUnit.SECOND * 600,
                "additional_kwargs": {"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
                "data_filters": {"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
            }
        )
    ])
    rules = t.cast(t.List[Payload], [
        test_api.create_alert_rule(
            monitor_id=monitors[0]["id"],
            alert_rule={"condition": {"operator": "less_than", "value": 0.7}}
        ),
        test_api.create_alert_rule(
            monitor_id=monitors[1]["id"],
            alert_rule={"condition": {"operator": "less_than", "value": 0.7}}
        ),
    ])
    model_version = t.cast(Payload, test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={"name": "v1"}
    ))

    past_date = pdl.now() - pdl.duration(days=1)
    daterange = [past_date.add(hours=h) for h in range(1, 24, 2)]
    upload_classification_data(api=test_api, model_version_id=model_version["id"], daterange=daterange)

    for monitor in monitors:
        async with async_engine.begin() as c:
            await c.execute(
                UpdateMonitor.execution_options(
                    schema_translate_map=schema_translate_map
                ),
                parameters={
                    "monitor_id": monitor["id"],
                    "start": pdl.now() - pdl.duration(hours=1)
                }
            )

    # == Act
    worker = Worker.create(
        engine=async_engine,
        actors=[execute_monitor],
        additional_params={"resources_provider": resources_provider}
    )
    scheduler = AlertsScheduler(engine=None)

    async with async_engine.connect() as c:
        await scheduler.enqueue_tasks(c)

    async with worker.create_database_session() as session:
        async for task in worker.tasks_broker._next_task(
            session=session,
            execution_options={"schema_translate_map": schema_translate_map}
        ):
            async with database.attach_schema_switcher(
                session=session,
                schema_search_path=[user.organization.schema_name, "public"]
            ):
                await worker.execute_task(session=session, task=task)

    # == Assert
    alerts = (await async_session.scalars(
        sa.select(Alert)
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    tasks = (await async_session.scalars(
        sa.select(Task)
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    monitors = (await async_session.scalars(
        sa.select(Monitor)
        .where(Monitor.id.in_([it["id"] for it in monitors]))
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    alert_per_rule = defaultdict(list)
    tasks_per_monitor = defaultdict(list)

    for it in tasks:
        tasks_per_monitor[it.reference].append(it)

    for it in alerts:
        alert_per_rule[it.alert_rule_id].append(it)

    assert all(len(v) == 7 for v in tasks_per_monitor.values())
    assert all(it.status == TaskStatus.COMPLETED for it in tasks)
    assert len(alert_per_rule[rules[0]["id"]]) == 7
    assert len(alert_per_rule[rules[1]["id"]]) == 1

    for alert in alert_per_rule[rules[0]["id"]]:
        assert alert.failed_values["v1"]["accuracy"] in (0.6666666666666666, 0.3333333333333333)

    for alert in alert_per_rule[rules[1]["id"]]:
        assert alert.failed_values == {"v1": {"accuracy": 0.0}}, alert.failed_values


@pytest.mark.asyncio
async def test_monitor_executor_with_unactive_alert_rules(
    async_session: AsyncSession,
    test_api: TestAPI,
    classification_model: Payload,
    user: User,
    resources_provider: ResourcesProvider
):
    check = t.cast(Payload, test_api.create_check(model_id=classification_model["id"]))

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=check["id"],
        monitor={
            "lookback": TimeUnit.DAY * 3,
            "frequency": TimeUnit.DAY * 2,
            "additional_kwargs": {"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            "data_filters": {"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        }
    ))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(  # pylint: disable=unused-variable
        monitor_id=monitor["id"],
        alert_rule={
            "condition": {"operator": "less_than", "value": 0.7},
            "is_active": False
        }
    ))

    now = pdl.now()
    logger = logging.Logger("test")

    result: t.List[Alert] = await execute_monitor(
        monitor_id=monitor["id"],
        timestamp=str(now),
        session=async_session,
        organization_id=user.organization.id,
        organization_schema=user.organization.schema_name,
        resources_provider=resources_provider,
        logger=logger
    )

    assert not result


@pytest.mark.asyncio
async def test_monitor_executor_is_using_cache(
    async_session: AsyncSession,
    test_api: TestAPI,
    classification_model: Payload,
    user: User,
    resources_provider: ResourcesProvider
):
    # Arrange
    check = t.cast(Payload, test_api.create_check(model_id=classification_model["id"]))

    frequency = TimeUnit.DAY
    aggregation_window = TimeUnit.DAY * 3

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=check["id"],
        monitor={
            "lookback": TimeUnit.DAY * 7,
            "frequency": frequency,
            "aggregation_window": aggregation_window
        }
    ))

    rule_that_should_raise = t.cast(Payload, test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"condition": {"operator": "greater_than", "value": 0.7}}
    ))
    model_version = t.cast(Payload, test_api.create_model_version(
        model_id=classification_model["id"],
        model_version={"name": "v1", "classes": ["0", "1", "2"]}
    ))
    upload_classification_data(
        api=test_api,
        model_version_id=model_version["id"],
    )

    now = pdl.now()
    organization_id = user.organization.id

    # Act - Set monitor cache
    window_end = floor_window_for_time(now, frequency)
    window_start = window_end.subtract(seconds=aggregation_window)
    cache_value = {"my special key": 1}

    resources_provider.cache_functions.set_monitor_cache(
        organization_id,
        model_version["id"],
        monitor["id"],
        window_start,
        window_end,
        cache_value
    )
    result: t.List[Alert] = await execute_monitor(
        monitor_id=monitor["id"],
        timestamp=str(now),
        session=async_session,
        organization_id=organization_id,
        organization_schema=user.organization.schema_name,
        resources_provider=resources_provider,
        logger=logging.Logger("test")
    )

    assert len(result) == 1, result
    alert = result[0]

    assert isinstance(alert, Alert), alert
    assert alert.alert_rule_id == rule_that_should_raise["id"]
    assert isinstance(alert.failed_values, dict), alert.failed_values
    assert alert.failed_values == {"v1": {"my special key": 1}}, alert.failed_values
