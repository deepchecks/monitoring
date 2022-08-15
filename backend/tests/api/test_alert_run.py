# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import pendulum as pdl
import pytest
from fastapi.testclient import TestClient

from deepchecks_monitoring.logic.check_logic import AlertCheckOptions, run_rules_of_monitor
from deepchecks_monitoring.models.alert import Alert
from tests.conftest import add_alert_rule, add_classification_data, add_monitor


@pytest.mark.asyncio
async def test_run_alert(classification_model_id, classification_model_version_id, client: TestClient, async_session):
    # Arrange
    # add check
    request = {
        "name": "checky",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"scorers": ["accuracy", "f1_macro"]},
                   "module_name": "deepchecks.tabular.checks"
                   },
    }
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    check_id = response.json()["id"]
    # add monitor
    monitor_id = add_monitor(check_id, client, lookback=3600 * 3, filter_key="accuracy", data_filters={
        "filters": [{
            "operator": "equals",
            "value": "ppppp",
            "column": "b"
        }]},
    )
    add_alert_rule(monitor_id, client, repeat_every=3600 * 2, condition={
            "operator": "less_than",
            "value": 0.7,
        }
    )
    # Add data
    add_classification_data(classification_model_version_id, client)

    day_before_curr_time = pdl.now().set(minute=0, second=0, microsecond=0) - pdl.duration(days=1)
    ress = await run_rules_of_monitor(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=4).isoformat()),
                                      async_session)
    assert ress == {1: {"failed_values": {"1": ["accuracy"]}, "alert_id": 1}}

    # test re-run same value
    ress = await run_rules_of_monitor(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=4).isoformat()),
                                      async_session)
    assert ress == {1: {"failed_values": {"1": ["accuracy"]}, "alert_id": 1}}

    # test re-run bad hour value
    ress = await run_rules_of_monitor(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=5).isoformat()),
                                      async_session)
    assert ress == {}

    # test re-run good hour value
    ress = await run_rules_of_monitor(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=6).isoformat()),
                                      async_session)
    assert ress == {1: {"alert_id": 2, "failed_values": {"1": ["accuracy"]}}}

    # test alert update re-run
    await Alert.update(async_session, 2, {"failed_values": {"2": ["accuracy"]}})

    ress = await run_rules_of_monitor(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=6).isoformat()),
                                      async_session)
    assert ress == {1: {"alert_id": 2, "failed_values": {"1": ["accuracy"], "2": ["accuracy"]}}}
