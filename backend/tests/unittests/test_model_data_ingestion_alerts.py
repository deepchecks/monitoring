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
import typing as t

import pendulum as pdl
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.bgtasks.model_data_ingestion_alerter import ModelDataIngestionAlerter
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.public_models.task import Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import DataIngestionAlert
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.schema_models.monitor import Frequency
from tests.common import Payload, TestAPI, upload_classification_data


def as_payload(v):
    return t.cast(Payload, v)


@pytest.mark.asyncio
async def test_data_ingestion_scheduling(
    async_session: AsyncSession,
    async_engine,
    classification_model: dict,
    user: User,
    resources_provider: ResourcesProvider,
    test_api: TestAPI
):
    now = pdl.now().set(minute=0, second=0, microsecond=0)
    start = now - pdl.duration(hours=10)

    await async_session.execute(
        sa.update(Model).where(Model.id == classification_model["id"]).values({
            Model.data_ingestion_alert_frequency: Frequency.HOUR,
            Model.data_ingestion_alert_label_count: 2,
            Model.data_ingestion_alert_label_ratio: 1,
            Model.data_ingestion_alert_sample_count: 3,
            Model.data_ingestion_alert_latest_schedule: start,
        }))
    await async_session.flush()
    await async_session.commit()

    versions = [
        test_api.create_model_version(classification_model["id"], dict(name="v1", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v2", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v3", classes=["0", "1", "2"])),
    ]

    daterange = [start.add(hours=hours) for hours in [1, 3, 4, 5, 7]]
    no_label_daterange = [start.add(hours=hours) for hours in [3, 4]]
    extra_count_daterange = [start.add(hours=hours) for hours in [1, 3, 4, 5]]

    for version in versions[:2]:
        upload_classification_data(test_api, version["id"],
                                   daterange=daterange, model_id=classification_model["id"])
        upload_classification_data(test_api, version["id"],
                                   daterange=no_label_daterange, model_id=classification_model["id"],
                                   is_labeled=False,
                                   id_prefix="no_label")
        upload_classification_data(test_api, version["id"],
                                   daterange=extra_count_daterange, model_id=classification_model["id"],
                                   id_prefix="extra")

    # == Act
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    tasks = (await async_session.scalars(
        sa.select(Task).where(Task.bg_worker_task == ModelDataIngestionAlerter.queue_name())
    )).all()

    assert len(tasks) == 7

    worker = ModelDataIngestionAlerter()
    for task in tasks:
        await worker.run(task, async_session, resources_provider)

    schema_translate_map = {None: user.organization.schema_name}

    alerts = (await async_session.scalars(
        sa.select(DataIngestionAlert)
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    assert len(alerts) == 3
