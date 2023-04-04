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
import logging
import typing as t
from collections import defaultdict

import pendulum as pdl
import pytest
import sqlalchemy as sa
from deepchecks.tabular.checks import SingleDatasetPerformance
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_monitor
from deepchecks_monitoring.bgtasks.core import Task, TaskStatus, Worker
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.monitoring_utils import TimeUnit
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert
from deepchecks_monitoring.schema_models.monitor import (Frequency, calculate_initial_latest_schedule,
                                                         monitor_execution_range, round_off_datetime)
from deepchecks_monitoring.utils import database
from tests.common import Payload, TestAPI, upload_classification_data


def as_payload(v):
    return t.cast(Payload, v)


@pytest.mark.asyncio
async def test_monitor_executor(
    async_session: AsyncSession,
    classification_model: dict,
    user: User,
    resources_provider,
    test_api: TestAPI
):
    check = as_payload(test_api.create_check(
        classification_model["id"],
        {"config": SingleDatasetPerformance().config(include_version=False)}
    ))
    monitor = as_payload(test_api.create_monitor(
        check["id"],
        monitor=dict(
            lookback=TimeUnit.DAY * 24,
            frequency=Frequency.DAY.value,
            aggregation_window=1,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={
                "filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]
            }
        )
    ))

    rule_that_should_raise = as_payload(test_api.create_alert_rule(
        monitor["id"],
        dict(condition={"operator": "less_than", "value": 0.7})
    ))

    # Rule that does nothing
    test_api.create_alert_rule(monitor["id"], dict(condition={"operator": "less_than", "value": 0}))

    versions = [
        test_api.create_model_version(classification_model["id"], dict(name="v1", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v2", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v3", classes=["0", "1", "2"])),
    ]

    now = pdl.datetime(2023, 1, 9, 10).set(minute=0, second=0, microsecond=0)
    day_before = now - pdl.duration(days=1)
    daterange = [day_before.add(hours=hours) for hours in [1, 3, 4, 5, 7]]

    for version in versions[:2]:
        upload_classification_data(test_api, version["id"], daterange=daterange, model_id=classification_model["id"])

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
    assert alert.failed_values == {"1": {"accuracy": 0.2}, "2": {"accuracy": 0.2}}, alert.failed_values

    # Assert cache was saved
    # window_end = round_off_datetime(now, Frequency.DAY)
    window_end = now
    window_start = window_end - Frequency.DAY.to_pendulum_duration()

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
    classification_model: dict,
    user: User,
    resources_provider: ResourcesProvider,
    test_api: TestAPI,
):
    # TODO: add description to the test
    # == Prepare
    model_version = as_payload(test_api.create_model_version(
        classification_model["id"],
        dict(name="v1", classes=["0", "1", "2"])
    ))

    past_date = pdl.now("utc") - pdl.duration(days=1)
    daterange = [past_date.add(hours=h) for h in range(1, 24, 2)]

    upload_classification_data(
        test_api,
        model_version["id"],
        daterange=daterange,
        with_proba=False,
        model_id=classification_model["id"]
    )

    check = as_payload(test_api.create_check(
        classification_model["id"],
        {"config": SingleDatasetPerformance().config(include_version=False)}
    ))

    monitors = [
        as_payload(test_api.create_monitor(
            check["id"],
            monitor=dict(
                lookback=TimeUnit.DAY * 3,
                frequency=Frequency.HOUR,
                aggregation_window=24,
                additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
                data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
            )
        )),
        as_payload(test_api.create_monitor(
            check["id"],
            monitor=dict(
                lookback=TimeUnit.HOUR * 2,
                frequency=Frequency.HOUR,
                aggregation_window=2,
                additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
                data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
            )
        ))
    ]
    rules = [
        as_payload(test_api.create_alert_rule(
            monitors[0]["id"],
            dict(condition={"operator": "less_than", "value": 0.7})
        )),
        as_payload(test_api.create_alert_rule(
            monitors[1]["id"],
            dict(condition={"operator": "less_than", "value": 0.7})
        )),
    ]

    # == Act
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    schema_translate_map = {None: user.organization.schema_name}
    worker = Worker.create(
        engine=async_engine,
        actors=[execute_monitor],
        additional_params={"resources_provider": resources_provider}
    )
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

    alert_per_rule = defaultdict(list)

    for it in alerts:
        alert_per_rule[it.alert_rule_id].append(it)

    for monitor in monitors:
        reference = f"Monitor:{monitor['id']}"
        monitor_frequency = Frequency(monitor["frequency"])

        initial_latest_schedule = calculate_initial_latest_schedule(
            frequency=monitor_frequency,
            model_start_time=daterange[0],
            model_end_time=daterange[-1],
        )
        expected_tasks_timestamps = list(monitor_execution_range(
            frequency=monitor_frequency,
            latest_schedule=initial_latest_schedule,
            until=daterange[-1]
        ))
        tasks_timestamps = [
            pdl.instance(it.execute_after)
            for it in tasks
            if it.reference == reference
        ]
        assert sorted(expected_tasks_timestamps) == sorted(tasks_timestamps)


    # assert all(len(v) == 14 for v in tasks_per_monitor.values())
    assert all(it.status == TaskStatus.COMPLETED for it in tasks)
    assert len(alert_per_rule[rules[0]["id"]]) == 13
    assert len(alert_per_rule[rules[1]["id"]]) == 7

    for alert in alert_per_rule[rules[0]["id"]]:
        assert alert.failed_values["1"]["accuracy"] < 0.7

    for alert in alert_per_rule[rules[1]["id"]]:
        assert alert.failed_values == {"1": {"accuracy": 0.0}}, alert.failed_values


@pytest.mark.asyncio
async def test_monitor_executor_with_unactive_alert_rules(
    async_session: AsyncSession,
    classification_model: dict,
    user: User,
    resources_provider,
    test_api: TestAPI,
):
    check = as_payload(test_api.create_check(
        classification_model["id"],
        {"config": SingleDatasetPerformance().config(include_version=False)}
    ))

    monitor = as_payload(test_api.create_monitor(
        check["id"],
        monitor=dict(
            lookback=TimeUnit.DAY * 3,
            frequency=Frequency.DAY.value,
            aggregation_window=2,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        )
    ))

    test_api.create_alert_rule(
        monitor["id"],
        dict(condition={"operator": "less_than", "value": 0.7},
        is_active=False)
    )

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
    classification_model: dict,
    user: User,
    resources_provider,
    test_api: TestAPI,
):
    # Arrange
    check = as_payload(test_api.create_check(
        classification_model["id"],
        {"config": SingleDatasetPerformance().config(include_version=False)}
    ))

    monitor_frequency = Frequency.DAY

    monitor = as_payload(test_api.create_monitor(
        check["id"],
        monitor=dict(
            lookback=TimeUnit.DAY * 7,
            frequency=monitor_frequency.value,
            aggregation_window=3,
            additional_kwargs={"check_conf": {"scorer": ["accuracy"]}, "res_conf": None},
            data_filters={"filters": [{"operator": "equals", "value": "ppppp", "column": "b"}]}
        )
    ))

    rule_that_should_raise = as_payload(test_api.create_alert_rule(
        monitor["id"],
        dict(condition={"operator": "greater_than", "value": 0.7})
    ))

    model_version = as_payload(test_api.create_model_version(
        classification_model["id"],
        dict(name="v1", classes=["0", "1", "2"])
    ))

    upload_classification_data(
        test_api,
        model_version["id"],
        model_id=classification_model["id"],
    )

    now = pdl.now()
    organization_id = user.organization.id

    # Act - Set monitor cache
    window_end = round_off_datetime(now, monitor_frequency)
    window_start = window_end - (monitor_frequency.to_pendulum_duration() * monitor["aggregation_window"])
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
        timestamp=str(window_end),
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
    assert alert.failed_values == {"1": {"my special key": 1}}, alert.failed_values
