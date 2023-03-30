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

import pendulum as pdl
import pytest
from fakeredis import FakeRedis
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.keys import build_monitor_cache_key
from deepchecks_monitoring.schema_models.monitor import NUM_WINDOWS_TO_START, Frequency, Monitor, round_off_datetime
from deepchecks_monitoring.utils.typing import as_pendulum_datetime
from tests.api.test_check import upload_multiclass_reference_data
from tests.common import Payload, TestAPI, upload_classification_data


def default_latest_schedule_for(frequency):
    lookback = pdl.now("utc") - (frequency.to_pendulum_duration() * NUM_WINDOWS_TO_START)
    return round_off_datetime(lookback, frequency)


def test_monitor_creation_without_filter(
    test_api: TestAPI,
    classification_model_check: Payload,
):
    # NOTE: "test_api" will assert the response status and whether monitor was created
    test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 30,
            "frequency": "DAY",
        }
    )


@pytest.mark.asyncio
async def test_add_monitor_month_schedule(
    test_api: TestAPI,
    classification_model_check: Payload,
    async_session: AsyncSession
):
    # Act
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 1,
            "frequency": "MONTH",
        }
    ))
    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    latest_schedule = pdl.instance(monitor.latest_schedule)
    assert latest_schedule == default_latest_schedule_for(Frequency.MONTH)


@pytest.mark.asyncio
async def test_add_monitor_day_schedule(
    test_api: TestAPI,
    classification_model_check: Payload,
    async_session: AsyncSession
):
    # Act
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 30,
            "frequency": "DAY",
        }
    ))
    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    latest_schedule = pdl.instance(monitor.latest_schedule)
    assert latest_schedule == default_latest_schedule_for(Frequency.DAY)


# TODO: give better name or add description
@pytest.mark.asyncio
async def test_add_monitor_day_schedule_from_version(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    async_session: AsyncSession
):
    # Arrange
    now = pdl.now("utc")
    day_before = as_pendulum_datetime(now - pdl.duration(days=1))
    datarange = list(pdl.period(day_before, day_before + pdl.duration(hours=5)).range(unit="hours", amount=1))

    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False,
        daterange=datarange
    )
    # Act
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 30,
            "frequency": "DAY",
        }
    ))

    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    # model version data was day before
    latest_schedule = pdl.instance(monitor.latest_schedule)
    assert latest_schedule == now.start_of("day")


def test_monitor_creation_with_data_filter(
    test_api: TestAPI,
    classification_model_check: Payload
):
    # NOTE: "test_api" will assert the response status and whether monitor was created
    test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 30,
            "frequency": "DAY",
            "data_filters": {"filters": [{
                "operator": "in",
                "value": ["a", "ff"],
                "column": "meta_col"
            }]}
        }
    )


def test_monitor_creation_and_retrieval(
    test_api: TestAPI,
    classification_model_check: Payload,
):
    # Arrange
    # create dashboard, the same endpoint creates and retrieves the dashboard
    dashboard = t.cast(Payload, test_api.fetch_dashboard())

    monitor_payload = test_api.data_generator.generate_random_monitor()

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={**monitor_payload, "dashboard_id": dashboard["id"]}
    ))

    alert_rule = test_api.create_alert_rule(monitor_id=monitor["id"])
    alert_rule = t.cast(Payload, alert_rule)

    # Act
    monitor = t.cast(Payload, test_api.fetch_monitor(monitor_id=monitor["id"]))

    assert monitor["id"] == 1
    assert monitor["name"] == monitor_payload["name"]
    assert monitor["dashboard_id"] == dashboard["id"]
    assert monitor["lookback"] == monitor_payload["lookback"]
    assert monitor["frequency"] == monitor_payload["frequency"]
    assert monitor["aggregation_window"] == monitor_payload["aggregation_window"]
    assert monitor["data_filters"] == monitor_payload["data_filters"]
    assert monitor["check"] == classification_model_check
    assert monitor["check"]["docs_link"] == \
        "https://docs.deepchecks.com/stable/checks_gallery/tabular/" \
        "model_evaluation/plot_single_dataset_performance.html"
    assert monitor["alert_rules"][0] == {"id": 1, **alert_rule}


def test_monitor_filter_reset(
    test_api: TestAPI,
    classification_model_check: Payload
):
    # Arrange
    # create dashboard, the same endpoint creates and retrieves the dashboard
    dashboard = t.cast(Payload, test_api.fetch_dashboard())
    monitor_payload = test_api.data_generator.generate_random_monitor()

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={**monitor_payload, "dashboard_id": dashboard["id"]}
    ))

    # just change name and make sure filter is there
    updated_monitor = test_api.update_monitor(monitor_id=monitor["id"], monitor={"name": "moni"})
    updated_monitor = t.cast(Payload, updated_monitor)

    assert updated_monitor["id"] == 1
    assert updated_monitor["name"] == "moni"
    assert updated_monitor["dashboard_id"] == dashboard["id"]
    assert updated_monitor["lookback"] == monitor_payload["lookback"]
    assert updated_monitor["aggregation_window"] == monitor_payload["aggregation_window"]
    assert updated_monitor["data_filters"] == monitor_payload["data_filters"]
    assert updated_monitor["frequency"] == monitor_payload["frequency"]
    assert updated_monitor["alert_rules"] == []
    assert updated_monitor["check"] == classification_model_check
    assert updated_monitor["additional_kwargs"] is None

    # now reset the filter
    updated_monitor = test_api.update_monitor(monitor_id=monitor["id"], monitor={"data_filters": None})
    updated_monitor = t.cast(Payload, updated_monitor)

    assert updated_monitor["id"] == 1
    assert updated_monitor["name"] == "moni"
    assert updated_monitor["dashboard_id"] == dashboard["id"]
    assert updated_monitor["lookback"] == monitor_payload["lookback"]
    assert updated_monitor["aggregation_window"] == monitor_payload["aggregation_window"]
    assert updated_monitor["data_filters"] is None
    assert updated_monitor["frequency"] == monitor_payload["frequency"]
    assert updated_monitor["alert_rules"] == []
    assert updated_monitor["check"] == classification_model_check
    assert updated_monitor["additional_kwargs"] is None


def test_monitor_deletion(
    test_api: TestAPI,
    classification_model_check: Payload,
):
    # NOTE: "test_api" will assert the response status and whether monitor was created/deleted
    monitor = test_api.create_monitor(check_id=classification_model_check["id"])
    test_api.delete_monitor(t.cast(Payload, monitor)["id"])


def test_monitor_notebook_retrieval(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    # Arrange
    _, start_time, end_time = upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=50,
        is_labeled=False
    )

    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    monitor = test_api.create_monitor(check_id=classification_model_check["id"])
    monitor = t.cast(Payload, monitor)

    # Act
    notebook = t.cast(str, test_api.download_monitor_notebook(
        monitor_id=monitor["id"],
        options={"start_time": start_time, "end_time": end_time}
    ))
    assert notebook.startswith('{\n "cells": [\n')

    notebook = t.cast(str, test_api.download_monitor_notebook(
        monitor_id=monitor["id"],
        options={
            "start_time": start_time,
            "end_time": end_time,
            "as_script": True,
            "model_version_id": 1
        }
    ))
    assert notebook.startswith("# # Data Review")


@pytest.mark.asyncio
async def test_monitor_update_with_data(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    now = pdl.now("utc")
    past_date = as_pendulum_datetime(now - pdl.duration(days=7))
    daterange = list(pdl.period(past_date, past_date + pdl.duration(days=4)).range(unit="days", amount=1))
    monitor_frequency = Frequency.DAY

    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False,
        daterange=daterange
    )

    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "frequency": monitor_frequency.value,
            "aggregation_window": 1
        }
    ))
    monitor = await async_session.get(Monitor, monitor["id"])

    assert pdl.instance(monitor.latest_schedule) == round_off_datetime(daterange[0], monitor_frequency)

    # Act - Update only monitor name, and rest of the fields should be the same
    latest_schedule_before_update = monitor.latest_schedule
    test_api.update_monitor(
        monitor_id=monitor.id,
        monitor={"name": "new name"}
    )

    # Assert - should not change the last schedule
    await async_session.refresh(monitor)
    assert monitor.latest_schedule == latest_schedule_before_update

    # # Arrange - Forward latest schedule to latest data time
    monitor.latest_schedule = round_off_datetime(
        daterange[-1],
        monitor.frequency
    )

    await async_session.commit()

    # Act - Should update the latest schedule
    test_api.update_monitor(
        monitor_id=monitor.id,
        monitor={
            "data_filters": {"filters": [{
                "operator": "in",
                "value": ["a", "ff"],
                "column": "meta_col"
            }]}
        }
    )

    # # Assert
    await async_session.refresh(monitor)
    # assert latest_schedule after update is "num windows to start" windows earlier
    assert pdl.instance(monitor.latest_schedule) == round_off_datetime(daterange[0], monitor_frequency)
    # assert latest_schedule_before_update - pdl.instance(monitor.latest_schedule) == \
    #     monitor.frequency.to_pendulum_duration() * NUM_WINDOWS_TO_START


@pytest.mark.asyncio
async def test_monitor_update_without_data(
    test_api: TestAPI,
    classification_model_check: Payload,
    async_session: AsyncSession
):
    # Arrange
    monitor = test_api.create_monitor(check_id=classification_model_check["id"])
    monitor = await async_session.get(Monitor, monitor["id"])
    latest_schedule = monitor.latest_schedule
    # Act
    test_api.update_monitor(
        monitor_id=monitor.id,
        monitor={
            "data_filters": {"filters": [{
                "operator": "in",
                "value": ["a", "ff"],
                "column": "meta_col"
            }]}
        }
    )

    await async_session.refresh(monitor)
    assert monitor.latest_schedule == latest_schedule


@pytest.mark.asyncio
async def test_update_monitor_freq(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    now = pdl.now("utc")
    day_before = as_pendulum_datetime(now - pdl.duration(days=1))
    daterange = list(pdl.period(day_before, day_before + pdl.duration(hours=5)).range(unit="hours", amount=1))

    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        is_labeled=False,
        daterange=daterange
    )
    frequency = Frequency.DAY
    monitor = test_api.create_monitor(check_id=classification_model_check["id"], monitor={"frequency": frequency.value})
    monitor = t.cast(Payload, monitor)
    monitor = await async_session.get(Monitor, monitor["id"])

    # Assert the latest schedule is by defined frequency
    latest_schedule = pdl.instance(monitor.latest_schedule)
    assert monitor.frequency == frequency
    assert latest_schedule == round_off_datetime(daterange[-1], frequency)

    # Act
    frequency = Frequency.HOUR
    test_api.update_monitor(monitor_id=monitor.id, monitor={"frequency": frequency.value})

    await async_session.refresh(monitor)

    latest_schedule = pdl.instance(monitor.latest_schedule)
    assert monitor.frequency == frequency
    assert latest_schedule == round_off_datetime(daterange[0], frequency)


def test_monitor_execution(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    classification_model: Payload,
    redis: FakeRedis,
    user
):
    # Arrange
    now = pdl.now("utc")
    past_date = as_pendulum_datetime(now - pdl.duration(days=6))
    daterange = list(pdl.period(past_date, past_date + pdl.duration(days=3)).range(unit="days", amount=1))

    monitor = t.cast(Payload, test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "lookback": (Frequency.DAY.to_pendulum_duration() * 7).total_seconds(),
            "aggregation_window": 1,
            "frequency": Frequency.DAY.value,
            "data_filters": {"filters": [{
                "column": "c",
                "operator": "greater_than",
                "value": 10
            }]}
        }
    ))
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        model_id=classification_model["id"],
        daterange=daterange
    )
    # Act
    result_without_cache = test_api.execute_monitor(
        monitor_id=monitor["id"],
        options={"end_time": pdl.now().isoformat()}
    )
    # TODO: assert result
    result_without_cache = t.cast(Payload, result_without_cache)

    # Assert cache is populated
    count_cache = 0
    monitor_key = build_monitor_cache_key(user.organization_id, classification_model_version["id"], monitor["id"],
                                          None, None)
    for _ in redis.scan_iter(monitor_key):
        count_cache += 1

    assert count_cache == 8

    # Assert result is same with cache
    result_with_cache = test_api.execute_monitor(
        monitor_id=monitor["id"],
        options={"end_time": pdl.now().isoformat()}
    )
    assert result_with_cache == result_without_cache


def test_monitor_execution_with_invalid_end_time(
    test_api: TestAPI,
    classification_model_check: Payload
):
    # Arrange
    monitor = test_api.create_monitor(check_id=classification_model_check["id"])
    monitor = t.cast(Payload, monitor)
    # Act
    response = test_api.execute_monitor(
        expected_status=422,
        monitor_id=monitor["id"],
        options={"end_time": "13000000"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_monitor_run_filter(
    classification_model_check,
    classification_model_version,
    classification_model,
    client, test_api: TestAPI
):
    response, start_time, end_time = upload_classification_data(
        test_api,
        classification_model_version["id"],
        samples_per_date=50,
        model_id=classification_model["id"]
    )
    assert response.status_code == 200, response.json()
    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    assert upload_multiclass_reference_data(
        test_api,
        classification_model_version
    ).status_code == 200, response.json()

    # without filter
    monitor_id = t.cast(Payload, test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}},
            "name": "monitory",
            "lookback": Frequency.DAY.to_pendulum_duration().total_seconds(),
            "aggregation_window": 1,
            "frequency": Frequency.HOUR.value,
        }
    ))["id"]

    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": end_time})
    json_rsp = response.json()

    expected_output = {
        "v1": [
            None, None, None, None, None, None, None, None, None,
            None, None, None, None, None, None, None, None,
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            None,
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 1.0},
            None,
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            None,
        ]
    }

    assert "output" in json_rsp, json_rsp
    assert json_rsp["output"] == expected_output

    # with filter
    monitor_id = t.cast(Payload, test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}},
            "name": "monitory",
            "lookback": Frequency.DAY.to_pendulum_duration().total_seconds(),
            "aggregation_window": 1,
            "frequency": Frequency.HOUR.value,
            "data_filters": {
                "filters": [
                    {"column": "a", "operator": "greater_than", "value": 12},
                    {"column": "b", "operator": "equals", "value": "ppppp"}
                ]
            }
        }
    ))["id"]

    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": end_time})

    json_rsp = response.json()
    assert json_rsp["output"] == {
        "v1": [
            None, None, None, None, None, None, None, None, None, None,
            None, None, None, None, None, None, None, None, None,
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 1.0},
            None,
            {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
            None,
        ]
    }
