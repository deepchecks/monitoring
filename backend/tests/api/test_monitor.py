# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import datetime
import typing as t

import pendulum as pdl
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.monitor_alert_logic import floor_window_for_time
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.monitor import NUM_WINDOWS_TO_START, Monitor
from tests.api.test_check import upload_multiclass_reference_data
from tests.common import Payload, TestAPI, upload_classification_data


def test_monitor_creation_without_filter(
    test_api: TestAPI,
    classification_model_check: Payload,
):
    # NOTE: 'test_api' will assert the response status and whether monitor was created
    test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 86400 * 30,
            "frequency": 86400,
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
            "aggregation_window": 86400 * 30,
            "frequency": 86400 * 30,
        }
    ))
    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0


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
            "aggregation_window": 86400 * 30,
            "frequency": 86400 * 2,
        }
    ))
    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0


# TODO: give better name or add description
@pytest.mark.asyncio
async def test_add_monitor_day_schedule_from_version(
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model_check: Payload,
    async_session: AsyncSession
):
    # Arrange
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
    )
    # Act
    monitor = t.cast(Payload, test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 86400 * 30,
            "frequency": 86400 * 2,
        }
    ))
    # Assert
    monitor = await async_session.get(Monitor, monitor["id"])
    # model version data was day before
    now = datetime.datetime.now() - datetime.timedelta(days=1)
    assert pdl.instance(monitor.latest_schedule) < pdl.instance(now)
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0


# TODO:
# - I think it duplicates "test_monitor_creation_with_data_filter", remove it
# - monitor creation schema does not have 'monitor_rule' field
#
# def test_add_monitor_with_feature(
#     test_api: TestAPI,
#     classification_model_check: Payload,
# ):
#     # NOTE: 'test_api' will assert the response status and whether monitor was created
#     test_api.create_monitor(
#         check_id=classification_model_check["id"],
#         monitor={
#             "name": "monitory",
#             "lookback": 86400 * 7,
#             "aggregation_window": 86400 * 30,
#             "frequency": 86400,
#             "monitor_rule": {
#                 "operator": "greater_than",
#                 "value": 100,
#                 "feature": "some_feature"
#             }
#         }
#     )


def test_monitor_creation_with_data_filter(
    test_api: TestAPI,
    classification_model_check: Payload
):
    # NOTE: 'test_api' will assert the response status and whether monitor was created
    test_api.create_monitor(
        check_id=classification_model_check["id"],
        monitor={
            "name": "monitory",
            "lookback": 86400 * 7,
            "aggregation_window": 86400 * 30,
            "frequency": 86400,
            "data_filters": {"filters": [{
                "operator": "contains",
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
    # NOTE: 'test_api' will assert the response status and whether monitor was created/deleted
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
        samples_per_date=50
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
    assert notebook.startswith("import")


@pytest.mark.asyncio
async def test_monitor_update_with_data(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
    async_session: AsyncSession
):
    # Arrange
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"]
    )
    monitor = test_api.create_monitor(check_id=classification_model_check["id"])
    monitor = await async_session.get(Monitor, monitor["id"])
    model_version = await async_session.get(ModelVersion, classification_model_version["id"])

    # Taking latest schedule forward to last schedule
    latest_schedule = monitor.latest_schedule = floor_window_for_time(pdl.instance(model_version.end_time),
                                                                      monitor.frequency)
    await async_session.commit()

    # Act
    test_api.update_monitor(
        monitor_id=monitor.id,
        monitor={
            "data_filters": {"filters": [{
                "operator": "contains",
                "value": ["a", "ff"],
                "column": "meta_col"
            }]}
        }
    )

    await async_session.refresh(monitor)
    # assert latest_schedule after update is "num windows to start" windows earlier
    assert latest_schedule - pdl.instance(monitor.latest_schedule) == \
           pdl.duration(seconds=monitor.frequency * NUM_WINDOWS_TO_START)


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
                "operator": "contains",
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
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"]
    )
    frequency = 3600 * 24
    monitor = test_api.create_monitor(check_id=classification_model_check["id"], monitor={"frequency": frequency})
    monitor = t.cast(Payload, monitor)
    monitor = await async_session.get(Monitor, monitor["id"])

    # Assert the latest schedule is by defined frequency
    assert monitor.frequency == frequency
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0

    # Act
    frequency = 3600 * 12
    test_api.update_monitor(monitor_id=monitor.id, monitor={"frequency": frequency})

    await async_session.refresh(monitor)
    assert monitor.frequency == frequency
    assert pdl.instance(monitor.latest_schedule).int_timestamp % monitor.frequency == 0


def test_monitor_execution(
    test_api: TestAPI,
    classification_model_check: Payload,
    classification_model_version: Payload,
):
    # Arrange
    monitor = t.cast(Payload, test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "lookback": 86400 * 7,
            "aggregation_window": 86400 * 30,
            "frequency": 86400,
            "data_filters": {"filters": [{
                "column": "c",
                "operator": "greater_than",
                "value": 10
            }]}
        }
    ))
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"]
    )
    # Act
    result = test_api.execute_monitor(
        monitor_id=monitor["id"],
        options={"end_time": pdl.now().isoformat()}
    )
    result = t.cast(Payload, result)
    # TODO: assert result


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
async def test_monitor_run_filter(classification_model_check, classification_model_version,
                                  client, test_api: TestAPI):
    response, start_time, end_time = upload_classification_data(test_api,
                                                                classification_model_version["id"],
                                                                samples_per_date=50)
    assert response.status_code == 200, response.json()
    start_time = start_time.isoformat()
    end_time = end_time.add(hours=1).isoformat()

    assert upload_multiclass_reference_data(
        test_api, classification_model_version).status_code == 200, response.json()

    # without filter
    monitor_id = test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}},
            "name": "monitory",
            "lookback": 86400,
            "aggregation_window": 3600,
            "frequency": 3600,
        }
    )["id"]
    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": end_time})

    json_rsp = response.json()
    assert "output" in json_rsp, json_rsp
    assert json_rsp["output"] == {"v1": [None, None, None, None, None, None, None, None,
                                         None, None, None, None, None, None, None, None, None,
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0}, None,
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 1.0}, None,
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         None]}

    # with filter
    monitor_id = test_api.create_monitor(
        classification_model_check["id"],
        monitor={
            "additional_kwargs": {"check_conf": {"scorer": ["F1 Per Class"]}},
            "name": "monitory",
            "lookback": 86400,
            "aggregation_window": 3600,
            "frequency": 3600,
            "data_filters": {
                "filters": [{"column": "a", "operator": "greater_than", "value": 12},
                            {"column": "b", "operator": "contains", "value": "ppppp"}]
            }
        }
    )["id"]

    response = client.post(f"/api/v1/monitors/{monitor_id}/run", json={"end_time": end_time})

    json_rsp = response.json()
    assert json_rsp["output"] == {"v1": [None, None, None, None, None, None, None, None, None,
                                         None, None, None, None, None, None, None, None, None, None,
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 1.0},
                                         None,
                                         {"F1 Per Class 0": 0.0, "F1 Per Class 1": 0.0, "F1 Per Class 2": 0.0},
                                         None]}
