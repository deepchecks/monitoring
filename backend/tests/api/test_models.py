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
import randomname
import sqlalchemy as sa
from deepdiff import DeepDiff
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models import AlertRule, Check, Model, ModelVersion, Monitor, TaskType
from deepchecks_monitoring.schema_models.alert_rule import AlertSeverity
from tests.conftest import add_alert, add_alert_rule, add_check, add_model, add_model_version, add_monitor


@pytest.mark.asyncio
async def test_add_model(client: TestClient):
    response = client.post("/api/v1/models",
                           json={"name": "44", "task_type": "multiclass", "alerts_delay_labels_ratio": 0.5,
                                 "alerts_delay_seconds": 60})
    assert response.status_code == 200
    assert response.json() == {"id": 1}

    response = client.get("/api/v1/models")
    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json[0] == {"id": 1, "name": "44", "task_type": "multiclass", "description": None,
                            "alerts_count": 0, "latest_time": None, "alerts_delay_labels_ratio": 0.5,
                            "alerts_delay_seconds": 60}


@pytest.mark.asyncio
@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
async def test_get_columns_model(
    classification_model_id: int,
    classification_model_version_id: int,
    client: TestClient,
    async_session: AsyncSession,
    identifier_kind: str
):
    if identifier_kind == "by-name":
        model = await async_session.get(Model, classification_model_id)
        response = client.get(f"/api/v1/models/{model.name}/columns", params={"identifier_kind": "name"})
    else:
        response = client.get(f"/api/v1/models/{classification_model_id}/columns")

    assert classification_model_version_id == 1
    assert response.status_code == 200

    diff = DeepDiff(
        ignore_order=True,
        t1=response.json(),
        t2={
            "a": {"type": "numeric", "stats": {"max": None, "min": None, "values": None}},
            "b": {"type": "categorical", "stats": {"max": None, "min": None, "values": []}},
            "c": {"type": "numeric", "stats": {"max": None, "min": None, "values": None}}
        }
    )

    assert not diff


@pytest.mark.asyncio
@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
async def test_get_columns_model_without_versions(
    classification_model_id: int,
    client: TestClient,
    async_session: AsyncSession,
    identifier_kind: str,
):
    if identifier_kind == "by-name":
        model = await async_session.get(Model, classification_model_id)
        response = client.get(f"/api/v1/models/{model.name}/columns", params={"identifier_kind": "name"})
    else:
        response = client.get(f"/api/v1/models/{classification_model_id}/columns")

    assert response.status_code == 200, (response.reason, response.json())
    assert response.json() == {}


@pytest.mark.asyncio
async def test_get_models(classification_model_check_id, regression_model_check_id, client: TestClient, async_session):
    # Arrange
    monitor_id = add_monitor(classification_model_check_id, client)
    monitor_id_2 = add_monitor(regression_model_check_id, client)

    alert_rule_id = add_alert_rule(monitor_id, client, name=randomname.get_name())
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session)
    add_alert(alert_rule_id, async_session, resolved=False)

    alert_rule_id = add_alert_rule(monitor_id_2, client, name=randomname.get_name())
    add_alert(alert_rule_id, async_session, resolved=False)
    add_alert(alert_rule_id, async_session, resolved=False)

    alert_rule_id = add_alert_rule(
        monitor_id_2,
        client,
        alert_severity=AlertSeverity.HIGH.value,
        name=randomname.get_name()
    )
    add_alert(alert_rule_id, async_session, resolved=False)

    await async_session.commit()
    # Act
    response = client.get("/api/v1/models")
    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "classification model", "description": "test", "task_type": "multiclass",
         "alerts_count": 1, "latest_time": None, "alerts_delay_labels_ratio": 0.0, "alerts_delay_seconds": 0},
        {"id": 2, "name": "regression model", "description": "test", "task_type": "regression",
         "alerts_count": 3, "latest_time": None, "alerts_delay_labels_ratio": 0.0, "alerts_delay_seconds": 0}
    ]


@pytest.mark.asyncio
async def test_get_models_latest_time(classification_model_id, client: TestClient, async_session):
    # Arrange
    time = pdl.now()
    async_session.add(ModelVersion(name="a", end_time=time.subtract(days=1), model_id=classification_model_id,))
    async_session.add(ModelVersion(name="b", end_time=time, model_id=classification_model_id))
    async_session.add(ModelVersion(name="c", end_time=time.subtract(days=2), model_id=classification_model_id))
    await async_session.commit()
    # Act
    response = client.get("/api/v1/models")
    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "classification model", "description": "test", "task_type": "multiclass",
         "alerts_count": 0, "latest_time": time.int_timestamp, "alerts_delay_labels_ratio": 0.0,
         "alerts_delay_seconds": 0},
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize("identifier_kind", ["by-id", "by-name"])
async def test_model_deletion(
    client: TestClient,
    async_session: AsyncSession,
    identifier_kind: str
):
    model_id = t.cast(int, add_model(client, task_type=TaskType.BINARY))
    version_id = t.cast(int, add_model_version(model_id, client))
    check_id = t.cast(int, add_check(model_id, client))
    monitor_id = t.cast(int, add_monitor(check_id, client))
    alert_rule_id = t.cast(int, add_alert_rule(monitor_id, client))

    monitor_table_name = f"model_{model_id}_monitor_data_{version_id}"
    reference_table_name = f"model_{model_id}_ref_data_{version_id}"

    assert (await async_session.scalar(TableExists, params={"name": monitor_table_name})) is True
    assert (await async_session.scalar(TableExists, params={"name": reference_table_name})) is True

    if identifier_kind == "by-name":
        model = await async_session.get(Model, model_id)
        response = client.delete(f"/api/v1/models/{model.name}", params={"identifier_kind": "name"})
    else:
        response = client.delete(f"/api/v1/models/{model_id}")

    assert response.status_code == 200, (response.reason, response.json())

    async_session.expire_all()
    assert (await async_session.get(Model, model_id)) is None
    assert (await async_session.get(ModelVersion, version_id)) is None
    assert (await async_session.get(Check, check_id)) is None
    assert (await async_session.get(Monitor, monitor_id)) is None
    assert (await async_session.get(AlertRule, alert_rule_id)) is None

    assert (await async_session.scalar(TableExists, params={"name": monitor_table_name})) is False
    assert (await async_session.scalar(TableExists, params={"name": reference_table_name})) is False


TableExists = sa.text(
    "SELECT EXISTS ("
        "SELECT true "
        "FROM information_schema.tables "
        "WHERE table_name = :name "
        "LIMIT 1"
    ")"
).bindparams(sa.bindparam(key="name", type_=sa.String))


@pytest.mark.asyncio
async def test_get_models_statistics_no_models(client: TestClient):
    # Act
    response = client.get("/api/v1/models/data-ingestion")
    # Assert
    assert response.status_code == 200
    assert response.json() == {}
