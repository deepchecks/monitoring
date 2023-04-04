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
import sqlalchemy as sa
from deepchecks_client import DeepchecksClient
from deepdiff import DeepDiff
from fastapi.testclient import TestClient
from hamcrest import assert_that, has_entries
from httpx import Response
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.config import Settings
from deepchecks_monitoring.schema_models import AlertRule, Check, Model, ModelVersion, Monitor, TaskType
from deepchecks_monitoring.schema_models.monitor import round_off_datetime
from tests.common import ModelIdentifiersPair, Payload, TestAPI, upload_classification_data


def test_model_creation(test_api: TestAPI):
    payload = test_api.data_generator.generate_random_model()
    notes = [{"title": "Super Important", "text": "something important about model"}]
    model = t.cast(Payload, test_api.create_model(model={**payload, "notes": notes}))
    assert model == {"id": 1, **payload}


def test_model_creation_above_limit(test_api: TestAPI, settings: Settings):
    for i in range(1, 10):
        payload = test_api.data_generator.generate_random_model()
        model = t.cast(Payload, test_api.create_model(model={**payload, }))
        assert model == {"id": i, **payload}
    # the 9th model out of subscription
    resp = t.cast(Response, test_api.create_model(expected_status=402))
    assert resp.json()["error_message"] == (
        "Subscription currently configured for 8 models. "
        "Current model amount is 9. "
        "please update your subscription if you wish to add more models. "
        f"Update through {settings.deployment_url}/workspace-settings"
    )


@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
def test_model_columns_retrieval_with_model_that_has_versions(
    test_api: TestAPI,
    classification_model: Payload,
    classification_model_version: Payload,  # pylint: disable=unused-argument
    identifier_kind: str
):
    columns = test_api.fetch_model_columns(
        model_identifier=t.cast(ModelIdentifiersPair, classification_model),
        identifier_kind=identifier_kind
    )
    diff = DeepDiff(
        ignore_order=False,
        t1=t.cast(Payload, columns),
        t2={
            "a": {"type": "numeric", "stats": {"max": None, "min": None, "values": None}},
            "b": {"type": "categorical", "stats": {"max": None, "min": None, "values": []}},
            "c": {"type": "numeric", "stats": {"max": None, "min": None, "values": None}}
        }
    )

    assert not diff


@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
def test_model_columns_retrieval_with_model_that_does_not_have_versions(
    test_api: TestAPI,
    classification_model: Payload,
    identifier_kind: str,
):
    columns = test_api.fetch_model_columns(
        model_identifier=t.cast(ModelIdentifiersPair, classification_model),
        identifier_kind=identifier_kind
    )
    assert len(t.cast(Payload, columns)) == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
async def test_model_deletion(
    test_api: TestAPI,
    async_session: AsyncSession,
    identifier_kind: str
):
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    version = t.cast(Payload, test_api.create_model_version(model_id=model["id"]))
    check = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    monitor = t.cast(Payload, test_api.create_monitor(check_id=check["id"]))
    alert_rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))

    monitor_table_name = f"model_{model['id']}_monitor_data_{version['id']}"
    reference_table_name = f"model_{model['id']}_ref_data_{version['id']}"

    assert (await async_session.scalar(TableExists, params={"name": monitor_table_name})) is True
    assert (await async_session.scalar(TableExists, params={"name": reference_table_name})) is True

    test_api.delete_model(
        model_identifier=t.cast(ModelIdentifiersPair, model),
        identifier_kind=identifier_kind
    )

    async_session.expire_all()
    assert (await async_session.get(Model, model["id"])) is None
    assert (await async_session.get(ModelVersion, version["id"])) is None
    assert (await async_session.get(Check, check["id"])) is None
    assert (await async_session.get(Monitor, monitor["id"])) is None
    assert (await async_session.get(AlertRule, alert_rule["id"])) is None

    # TODO: Find a way to test bgtasks, and when you find it, make a test for deletion of this tables
    # assert (await async_session.scalar(TableExists, params={"name": monitor_table_name})) is False
    # assert (await async_session.scalar(TableExists, params={"name": reference_table_name})) is False


@pytest.mark.asyncio
async def test_connected_models_api(
    client: TestClient,
    classification_model: Payload,
    async_session: AsyncSession
):
    # Arrange
    time = pdl.now().in_tz("UTC")
    user_id = 1
    async_session.add(ModelVersion(name="a", last_update_time=time.subtract(days=1),
                                   model_id=classification_model["id"],
                                   ingestion_offset=100, topic_end_offset=1000, created_by=user_id, updated_by=user_id))
    async_session.add(ModelVersion(name="b", last_update_time=time, model_id=classification_model["id"],
                                   ingestion_offset=100, topic_end_offset=100, created_by=user_id, updated_by=user_id))
    async_session.add(ModelVersion(name="c", last_update_time=time.subtract(days=2),
                                   model_id=classification_model["id"],
                                   ingestion_offset=200, topic_end_offset=150, created_by=user_id, updated_by=user_id))
    await async_session.commit()

    # Act
    response = client.get("/api/v1/connected-models")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{
        "id": 1,
        "latest_update": time.isoformat(),
        "name": "Classification Model",
        "description": "test",
        "task_type": "multiclass",
        "n_of_alerts": 0,
        "n_of_pending_rows": 900,
        "n_of_updating_versions": 1
    }]


@pytest.mark.asyncio
async def test_connected_models_api_missing_version_data(
    client: TestClient,
    classification_model: Payload,
    async_session: AsyncSession
):
    # Arrange
    time = pdl.now().in_tz("UTC")
    user_id = 1
    async_session.add(ModelVersion(name="a",
                                   model_id=classification_model["id"],
                                   last_update_time=time,
                                   ingestion_offset=100, created_by=user_id, updated_by=user_id))
    async_session.add(ModelVersion(name="b",
                                   last_update_time=time,
                                   model_id=classification_model["id"], topic_end_offset=250,
                                   created_by=user_id, updated_by=user_id))
    async_session.add(ModelVersion(name="c",
                                   model_id=classification_model["id"],
                                   last_update_time=time,
                                   ingestion_offset=200, topic_end_offset=250, created_by=user_id, updated_by=user_id))
    await async_session.commit()

    # Act
    response = client.get("/api/v1/connected-models")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{
        "id": 1,
        "latest_update": time.isoformat(),
        "name": "Classification Model",
        "description": "test",
        "task_type": "multiclass",
        "n_of_alerts": 0,
        "n_of_pending_rows": 301,
        "n_of_updating_versions": 2
    }]


@pytest.mark.asyncio
async def test_connected_models_api_missing_all_version_data(
    client: TestClient,
    classification_model: Payload,
    async_session: AsyncSession
):
    # Arrange
    user_id = 1
    async_session.add(ModelVersion(name="a",
                                   model_id=classification_model["id"], created_by=user_id, updated_by=user_id))
    async_session.add(ModelVersion(name="b",
                                   model_id=classification_model["id"], created_by=user_id, updated_by=user_id))
    await async_session.commit()

    # Act
    response = client.get("/api/v1/connected-models")

    # Assert
    assert response.status_code == 200
    assert_that(response.json()[0], has_entries({
        "id": 1,
        "name": "Classification Model",
        "description": "test",
        "task_type": "multiclass",
        "n_of_alerts": 0,
        "n_of_pending_rows": 0,
        "n_of_updating_versions": 0
    }))


def test_get_models_ingestion_no_models(client: TestClient):
    # Act
    response = client.get("/api/v1/models/data-ingestion")
    # Assert
    assert response.status_code == 200
    assert response.json() == {}


def test_get_models_ingestion_no_end_time(
    client: TestClient,
    test_api: TestAPI,
    classification_model_version: Payload,
    classification_model: Payload,
):
    # Arrange
    upload_classification_data(
        api=test_api,
        model_version_id=classification_model_version["id"],
        samples_per_date=2,
        daterange=[pdl.now().subtract(years=2)],
        model_id=classification_model["id"],
    )

    # Act
    response = client.get("/api/v1/models/data-ingestion")
    # Assert
    assert response.status_code == 200
    resp = response.json()["1"][0]
    assert resp["count"] == 2
    assert resp["label_count"] == 2


TableExists = sa.text(
    "SELECT EXISTS ("
    "SELECT true "
    "FROM information_schema.tables "
    "WHERE table_name = :name "
    "LIMIT 1"
    ")"
).bindparams(sa.bindparam(key="name", type_=sa.String))


@pytest.mark.asyncio
async def test_model_set_monitors_time(
    test_api: TestAPI,
    deepchecks_sdk: DeepchecksClient,
    async_session: AsyncSession,
):
    # Arrange
    model = t.cast(Payload, test_api.create_model(model={"task_type": TaskType.BINARY.value}))
    check1 = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    check2 = t.cast(Payload, test_api.create_check(model_id=model["id"]))
    test_api.create_monitor(check_id=check1["id"])
    test_api.create_monitor(check_id=check1["id"])
    test_api.create_monitor(check_id=check2["id"])
    test_api.create_monitor(check_id=check2["id"])

    # Act
    new_date = pdl.now("utc").subtract(years=1)

    model = deepchecks_sdk.get_or_create_model(name=model["name"], task_type="binary")
    response = model.set_schedule_time(timestamp=new_date.isoformat(), model_id=model.model["id"])
    assert response.status_code == 200

    # Assert
    monitors = (await async_session.execute(
        sa.select(
            Monitor.id,
            Monitor.latest_schedule,
            Monitor.frequency
        )
    )).all()

    for monitor in monitors:
        assert pdl.instance(monitor.latest_schedule) == round_off_datetime(new_date, monitor.frequency)


def test_model_note_creation(
    test_api: TestAPI,
    classification_model: Payload,
):
    note = {"title": "Super Important", "text": "BlaBlaBla"}
    created_notes = test_api.create_model_notes(model_id=classification_model["id"], notes=[note])
    created_notes = t.cast(t.List[Payload], created_notes)
    assert len(created_notes) == 1
    for k, v in note.items():
        assert created_notes[0][k] == v


def test_model_note_deletion(
    test_api: TestAPI,
    classification_model: Payload,
):
    created_notes = test_api.create_model_notes(model_id=classification_model["id"])
    created_notes = t.cast(t.List[Payload], created_notes)
    test_api.delete_model_note(model_id=classification_model["id"], note_id=created_notes[0]["id"])


def test_available_models_retrieval(test_api: TestAPI, classification_model: Payload):
    available_models = t.cast(t.List[Payload], test_api.fetch_available_models())
    assert len(available_models) == 1
    assert available_models[0]["name"] == classification_model["name"]
