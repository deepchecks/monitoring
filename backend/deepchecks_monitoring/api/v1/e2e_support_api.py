# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Apis for support in e2e test. The apis are NOT meant to change state of the application, just to provide \
information."""
import asyncio
from time import perf_counter
from typing import Union

from fastapi import Depends
from kafka import KafkaConsumer, TopicPartition
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.dependencies import AsyncSessionDep, ResourcesProviderDep, SettingsDep
from deepchecks_monitoring.logic.keys import get_data_topic_name
from deepchecks_monitoring.monitoring_utils import exists_or_404, fetch_or_404
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Alert, AlertRule, ModelVersion
from deepchecks_monitoring.utils import auth

from .router import router


@router.get("/wait-for-queue/{model_version_id}", include_in_schema=False)
async def wait_for_queue(
    model_version_id: int,
    session: AsyncSession = AsyncSessionDep,
    user: User = Depends(auth.CurrentActiveUser()),
    resources_provider: ResourcesProvider = ResourcesProviderDep,
    settings=SettingsDep
):
    """Wait for queue to be empty. This api is used only to speed up e2e tests."""
    if resources_provider.kafka_settings.kafka_host is None or settings.debug_mode is False:
        return
    model_version: ModelVersion = await fetch_or_404(session, ModelVersion, id=model_version_id)
    consumer = KafkaConsumer(**resources_provider.kafka_settings.kafka_params)
    topic_partition = TopicPartition(get_data_topic_name(user.organization.id, model_version_id, "model-version"), 0)
    # The end_offset returned is the next offset (end + 1)
    topic_end_offset = consumer.end_offsets([topic_partition])[topic_partition] - 1

    start_time = perf_counter()

    while topic_end_offset != model_version.ingestion_offset and perf_counter() - start_time < 30:
        # Commit before refresh save topic_offset and load ingestion_offset
        await session.commit()
        await session.refresh(model_version)
        await asyncio.sleep(0.1)


@router.get("/wait-for-alerts/{alert_rule_id}", include_in_schema=False)
async def wait_for_alerts(
    alert_rule_id: int,
    session: AsyncSession = AsyncSessionDep,
    settings=SettingsDep,
    amount: Union[int, None] = None
):
    """wait for alerts of given alert rule."""
    if settings.debug_mode is False:
        return

    await exists_or_404(session, AlertRule, id=alert_rule_id)
    alerts_count = 0
    start_time = perf_counter()
    amount = amount or 1

    while alerts_count < amount and perf_counter() - start_time < 30:
        alerts_count = (await session.execute(select(func.count()).where(Alert.alert_rule_id == alert_rule_id)))\
            .scalar()
        await asyncio.sleep(0.1)
