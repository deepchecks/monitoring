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
from deepchecks_monitoring.schema_models.model import Model

import pendulum as pdl
import pytest
import sqlalchemy as sa
from deepchecks.tabular.checks import SingleDatasetPerformance
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_model_data_ingestion_task
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
async def test_model_executor(
    async_session: AsyncSession,
    classification_model: dict,
    user: User,
    resources_provider,
    test_api: TestAPI
):
    await async_session.execute(
        sa.update(Model).where(Model.id == classification_model["id"]).values({
            Model.data_ingestion_alert_label_count: 5,
            Model.data_ingestion_alert_label_ratio: 2,
            Model.data_ingestion_alert_sample_count: 3,
        }))
    await async_session.commit()

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

    result: t.List[Alert] = await execute_model_data_ingestion_task(
        model_id=classification_model["id"],
        start_time=str(day_before),
        end_time=str(now),
        session=async_session,
        organization_id=user.organization.id,
        organization_schema=user.organization.schema_name,
        resources_provider=resources_provider,
        logger=logging.Logger("test")
    )

    assert len(result) == 1, result
