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
from collections import defaultdict
import logging
import typing as t
from deepchecks_monitoring.bgtasks.core import Task, TaskStatus, Worker
from deepchecks_monitoring.bgtasks.scheduler import AlertsScheduler
from deepchecks_monitoring.utils import database

import pendulum as pdl
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.bgtasks.actors import execute_model_data_ingestion_task
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import DataIngestionAlert
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.schema_models.monitor import Frequency
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
            Model.data_ingestion_alert_frequency: Frequency.HOUR,
            Model.data_ingestion_alert_label_count: 2,
            Model.data_ingestion_alert_label_ratio: 1,
            Model.data_ingestion_alert_sample_count: 3,
        }))
    await async_session.flush()
    await async_session.commit()

    versions = [
        test_api.create_model_version(classification_model["id"], dict(name="v1", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v2", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v3", classes=["0", "1", "2"])),
    ]

    now = pdl.datetime(2023, 1, 9, 10).set(minute=0, second=0, microsecond=0)
    day_before = now - pdl.duration(days=1)
    daterange = [day_before.add(hours=hours) for hours in [1, 3, 4, 5, 7]]
    no_label_daterange = [day_before.add(hours=hours) for hours in [3, 4]]
    extra_count_daterange = [day_before.add(hours=hours) for hours in [1, 3, 4, 5]]

    for version in versions[:2]:
        upload_classification_data(test_api, version["id"],
                                   daterange=daterange, model_id=classification_model["id"])
        upload_classification_data(test_api, version["id"],
                                   daterange=no_label_daterange, model_id=classification_model["id"],
                                   is_labeled=False,
                                   id_prefix='no_label')
        upload_classification_data(test_api, version["id"],
                                   daterange=extra_count_daterange, model_id=classification_model["id"],
                                   id_prefix='extra')

    result: t.List[DataIngestionAlert] = await execute_model_data_ingestion_task(
        model_id=classification_model["id"],
        start_time=str(day_before),
        end_time=str(now),
        session=async_session,
        organization_id=user.organization.id,
        organization_schema=user.organization.schema_name,
        resources_provider=resources_provider,
        logger=logging.Logger("test")
    )

    assert len(result) == 3, result

@pytest.mark.asyncio
async def test_alert_scheduling(
    async_session: AsyncSession,
    async_engine,
    classification_model: dict,
    user: User,
    resources_provider: ResourcesProvider,
    test_api: TestAPI,
):
    await async_session.execute(
        sa.update(Model).where(Model.id == classification_model["id"]).values({
            Model.data_ingestion_alert_frequency: Frequency.HOUR,
            Model.data_ingestion_alert_label_count: 2,
            Model.data_ingestion_alert_label_ratio: 1,
            Model.data_ingestion_alert_sample_count: 3,
        }))
    await async_session.flush()
    await async_session.commit()

    versions = [
        test_api.create_model_version(classification_model["id"], dict(name="v1", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v2", classes=["0", "1", "2"])),
        test_api.create_model_version(classification_model["id"], dict(name="v3", classes=["0", "1", "2"])),
    ]

    now = pdl.now("utc").set(minute=0, second=0, microsecond=0)
    day_before = now - pdl.duration(days=1, hours=-7)
    daterange = [day_before.add(hours=hours) for hours in [1, 3, 4, 5, 7]]
    no_label_daterange = [day_before.add(hours=hours) for hours in [3, 4]]
    extra_count_daterange = [day_before.add(hours=hours) for hours in [1, 3, 4, 5]]

    for version in versions[:2]:
        upload_classification_data(test_api, version["id"],
                                   daterange=daterange, model_id=classification_model["id"])
        upload_classification_data(test_api, version["id"],
                                   daterange=no_label_daterange, model_id=classification_model["id"],
                                   is_labeled=False,
                                   id_prefix='no_label')
        upload_classification_data(test_api, version["id"],
                                   daterange=extra_count_daterange, model_id=classification_model["id"],
                                   id_prefix='extra')

    # == Act
    await AlertsScheduler(engine=async_engine).run_all_organizations()

    schema_translate_map = {None: user.organization.schema_name}
    worker = Worker.create(
        engine=async_engine,
        actors=[execute_model_data_ingestion_task],
        additional_params={"resources_provider": resources_provider}
    )
    async with worker.create_database_session() as session:
        async for task in worker.tasks_broker._next_task(
            session=session,
            execution_options={"schema_translate_map": schema_translate_map}
        ):
            async with database.attach_schema_switcher(
                session=session,
                schema_search_path=[user.organization.schema_name, "public"]
            ):
                await worker.execute_task(session=session, task=task)

    # == Assert
    alerts = (await async_session.scalars(
        sa.select(DataIngestionAlert)
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    tasks = (await async_session.scalars(
        sa.select(Task)
        .execution_options(schema_translate_map=schema_translate_map)
    )).all()

    assert len(tasks) == 5
    assert len(alerts) == 3
    