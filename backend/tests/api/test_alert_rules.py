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

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.schema_models.alert_rule import AlertSeverity
from tests.common import TestAPI, create_alert

as_dict = lambda v: t.cast(t.Dict[str, t.Any], v)


def test_alert_rule_creation(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any]
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(classification_model_check["id"]))

    # Act
    payload = test_api.data_generator.generate_random_alert_rule()
    rule = as_dict(test_api.create_alert_rule(monitor_id=monitor["id"], alert_rule=payload))

    # Assert
    assert rule == {"id": 1, "monitor_id": monitor["id"], **payload}


def test_alert_rule_deletion(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any]
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(classification_model_check["id"]))
    rule = as_dict(test_api.create_alert_rule(monitor_id=monitor["id"]))

    # Act
    test_api.delete_alert_rule(rule["id"])


def test_alert_rule_update(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(classification_model_check["id"]))
    rule = as_dict(test_api.create_alert_rule(monitor_id=monitor["id"]))

    # Act
    test_api.update_alert_rule(
        alert_rule_id=rule["id"],
        alert_rule={"condition": {"operator": "greater_than", "value": -0.1}}
    )


def test_alert_rules_count(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
    regression_model_check: t.Dict[str, t.Any],
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(classification_model_check["id"]))
    test_api.create_alert_rule(monitor_id=monitor["id"])
    test_api.create_alert_rule(monitor_id=monitor["id"])
    # ---
    monitor = as_dict(test_api.create_monitor(regression_model_check["id"]))
    test_api.create_alert_rule(monitor_id=monitor["id"])

    # Act
    data = as_dict(test_api.fetch_alert_rules_count())

    # Assert
    assert sum(data.values()) == 3


def test_alert_rules_count_for_single_model(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
    regression_model_check: t.Dict[str, t.Any],
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(
        classification_model_check["id"]
    ))
    test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.LOW.value}
    )
    test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.LOW.value}
    )
    # ---
    monitor = as_dict(test_api.create_monitor(
        regression_model_check["id"]
    ))
    test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.LOW.value}
    )

    # Act/Assert
    data = as_dict(test_api.fetch_alert_rules_count(classification_model_check["id"]))
    assert data[AlertSeverity.LOW.value] == 2
    data = as_dict(test_api.fetch_alert_rules_count(regression_model_check["id"]))
    assert data[AlertSeverity.LOW.value] == 1


@pytest.mark.asyncio
async def test_get_alert_rules(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
    async_session: AsyncSession
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(classification_model_check["id"]))

    alert_rule = as_dict(test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={
            "alert_severity": AlertSeverity.LOW.value,
            "condition": {"operator": "greater_than", "value": 100.0},
        }
    ))
    create_alert(alert_rule["id"], async_session)
    create_alert(alert_rule["id"], async_session)
    create_alert(alert_rule["id"], async_session, resolved=False)

    alert_rule = as_dict(test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={
            "alert_severity": AlertSeverity.MID.value,
            "condition": {"operator": "greater_than", "value": 100.0},
        }
    ))
    create_alert(alert_rule["id"], async_session)
    create_alert(alert_rule["id"], async_session, resolved=False)
    create_alert(alert_rule["id"], async_session, resolved=False)

    await async_session.commit()

    # Act
    rules = test_api.fetch_alert_rules()
    rules = t.cast(t.List[t.Dict[str, t.Any]], rules)

    # Assert
    assert rules == [
        {
            "id": 2,
            "monitor_id": 1,
            "condition": {"operator": "greater_than", "value": 100.0},
            "alert_severity": "mid",
            "model_id": 1,
            "alerts_count": 2,
            "max_end_time": "1970-01-19T12:26:40+00:00",
            "is_active": True
        },
        {
            "id": 1,
            "monitor_id": 1,
            "condition": {"operator": "greater_than", "value": 100.0},
            "alert_severity": "low",
            "model_id": 1,
            "alerts_count": 1,
            "max_end_time": "1970-01-19T12:26:40+00:00",
            "is_active": True
        }
    ]


@pytest.mark.asyncio
async def test_alerts_retrieval(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
    async_session: AsyncSession
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(check_id=classification_model_check["id"]))
    rule = as_dict(test_api.create_alert_rule(monitor_id=monitor["id"]))

    create_alert(rule["id"], async_session, resolved=False)
    create_alert(rule["id"], async_session, resolved=True)
    create_alert(rule["id"], async_session, resolved=False)
    await async_session.commit()

    # Act
    data = t.cast(t.List[t.Dict[str, t.Any]], test_api.fetch_alerts(rule["id"]))
    assert len(data) == 3, data

    data = t.cast(t.List[t.Dict[str, t.Any]], test_api.fetch_alerts(rule["id"], False))
    assert len(data) == 2, data

    data = t.cast(t.List[t.Dict[str, t.Any]], test_api.fetch_alerts(rule["id"], True))
    assert len(data) == 1, data


@pytest.mark.asyncio
async def test_alerts_resolution(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any],
    async_session: AsyncSession
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(check_id=classification_model_check["id"]))

    rule = as_dict(test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.LOW.value}
    ))

    for _ in range(3):
        create_alert(rule["id"], async_session, resolved=False)

    await async_session.commit()

    # Act/Assert
    test_api.resolve_alerts(alert_rule_id=rule["id"])


def test_alert_rule_activation(
    test_api: TestAPI,
    classification_model_check: t.Dict[str, t.Any]
):
    # Arrange
    monitor = as_dict(test_api.create_monitor(check_id=classification_model_check["id"]))

    rule = as_dict(test_api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"is_active": False}
    ))

    # Act
    updated_tule = as_dict(test_api.update_alert_rule(
        alert_rule_id=rule["id"],
        alert_rule={"is_active": True}
    ))

    # Assert
    assert updated_tule["is_active"] is True
