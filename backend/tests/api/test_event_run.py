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

from deepchecks_monitoring.api.v1.alert import AlertCheckOptions
from deepchecks_monitoring.logic.check_logic import run_check_alert
from deepchecks_monitoring.models.event import Event


@pytest.mark.asyncio
async def test_run_event(classification_model_id, classification_model_version_id, client: TestClient, async_session):
    request = {
        "name": "checky",
        "config": {"class_name": "SingleDatasetPerformance",
                   "params": {"scorers": ["accuracy", "f1_macro"]},
                   "module_name": "deepchecks.tabular.checks"
                   },
    }
    # Act
    response = client.post(f"/api/v1/models/{classification_model_id}/checks", json=request)
    assert response.status_code == 200
    times = []
    curr_time: pdl.DateTime = pdl.now().set(minute=0, second=0, microsecond=0)
    day_before_curr_time: pdl.DateTime = curr_time - pdl.duration(days=1)
    for i, hours in enumerate([1, 3, 4, 5, 7]):
        time = day_before_curr_time.add(hours=hours).isoformat()
        times.append(time)
        request = {
            "_dc_sample_id": str(i),
            "_dc_time": time,
            "_dc_prediction_value": [0.1, 0.3, 0.6] if i % 2 else [0.1, 0.6, 0.3],
            "_dc_prediction_label": "2" if i % 2 else "1",
            "_dc_label": "2",
            "a": 10 + i,
            "b": "ppppp",
        }
        response = client.post(f"/api/v1/model-versions/{classification_model_version_id}/data", json=request)
        assert response.status_code == 201

    request = {
        "name": "alerty",
        "lookback": 3600 * 3,
        "repeat_every": 3600,
        "alert_rule": {
            "operator": "less_than",
            "value": 0.7,
            "feature": "accuracy"
        },
        "data_filters": {"filters": [{
            "operator": "equals",
            "value": "ppppp",
            "column": "b"
        }]}
    }
    response = client.post(f"/api/v1/checks/{1}/alerts", json=request)
    assert response.status_code == 200
    assert response.json()["id"] == 1

    ress = await run_check_alert(1, AlertCheckOptions(end_time=times[2]), async_session)
    assert ress == {1: {"failed_values": {"1": ["accuracy"]}, "event_id": 1}}

    # test re-run same value
    ress = await run_check_alert(1, AlertCheckOptions(end_time=times[2]), async_session)
    assert ress == {1: {"failed_values": {"1": ["accuracy"]}, "event_id": 1}}

    # test re-run bad hour value
    ress = await run_check_alert(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=5).isoformat()),
                                 async_session)
    assert ress == {}

    # test re-run good hour value
    ress = await run_check_alert(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=8).isoformat()),
                                 async_session)
    assert ress == {1: {"event_id": 2, "failed_values": {"1": ["accuracy"]}}}

    # test alert update re-run
    await Event.update(async_session, 2,  {"failed_values": {"2": ["accuracy"]}})

    ress = await run_check_alert(1, AlertCheckOptions(end_time=day_before_curr_time.add(hours=8).isoformat()),
                                 async_session)
    assert ress == {1: {"event_id": 2, "failed_values": {"1": ["accuracy"], "2": ["accuracy"]}}}
