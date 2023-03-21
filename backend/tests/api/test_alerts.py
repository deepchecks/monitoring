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
from tests.common import Payload, TestAPI, create_alert


@pytest.mark.asyncio
async def test_count_active_alerts(
    classification_model_check: Payload,
    test_api: TestAPI,
    async_session: AsyncSession
):
    # Arrange
    await generate_monitor_with_alert_rules(
        classification_model_check["id"],
        test_api,
        async_session
    )
    # Act/Assert
    data = test_api.fetch_number_of_unresolved_alerts()
    assert data == {"low": 1, "medium": 2}


@pytest.mark.asyncio
async def test_alert_resolution(
    classification_model_check: Payload,
    test_api: TestAPI,
    async_session: AsyncSession
):
    # Arrange
    monitor = t.cast(Payload, test_api.create_monitor(check_id=classification_model_check["id"]))
    rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    alert = create_alert(rule["id"], async_session, resolved=False)
    await async_session.commit()
    await async_session.refresh(alert)
    # Act
    test_api.resolve_alert(t.cast(int, alert.id))
    # Assert
    alert = t.cast(Payload, test_api.fetch_alert(t.cast(int, alert.id)))
    assert alert["resolved"] is True


@pytest.mark.asyncio
async def test_alert_reactivation(
    classification_model_check: Payload,
    test_api: TestAPI,
    async_session: AsyncSession
):
    # Arrange
    monitor = t.cast(Payload, test_api.create_monitor(check_id=classification_model_check["id"]))
    rule = t.cast(Payload, test_api.create_alert_rule(monitor_id=monitor["id"]))
    alert = create_alert(rule["id"], async_session, resolved=True)
    await async_session.commit()
    await async_session.refresh(alert)
    # Act/Assert
    alert_id = t.cast(int, alert.id)
    alert = t.cast(Payload, test_api.fetch_alert(alert_id=alert_id))
    assert alert["resolved"] is True
    # TestAPI will assert that 'resolved' flag is eq to False
    test_api.reactivate_alert(alert_id=alert_id)


async def generate_monitor_with_alert_rules(
    check_id: int,
    api: TestAPI,
    session: AsyncSession
) -> Payload:
    monitor = t.cast(Payload, api.create_monitor(check_id=check_id))

    rule = t.cast(Payload, api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.LOW.value}
    ))
    create_alert(rule["id"], session)
    create_alert(rule["id"], session)
    create_alert(rule["id"], session, resolved=False)

    rule = t.cast(Payload, api.create_alert_rule(
        monitor_id=monitor["id"],
        alert_rule={"alert_severity": AlertSeverity.MEDIUM.value}
    ))
    create_alert(rule["id"], session)
    create_alert(rule["id"], session, resolved=False)
    create_alert(rule["id"], session, resolved=False)

    await session.commit()
    return monitor
