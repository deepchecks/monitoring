# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining the dynamic tables metadata for the monitoring package."""
import asyncio
import copy
import json
import logging
import typing as t

import asyncpg.exceptions
import fastapi
import jsonschema.exceptions
import pendulum as pdl
from aiokafka import AIOKafkaConsumer
from jsonschema.validators import validate
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.models.column_type import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models.ingestion_errors import IngestionError
from deepchecks_monitoring.models.model_version import update_statistics_from_sample

__all__ = ["DataIngestionBackend", "log_data", "update_data"]


async def log_data(
    model_version: ModelVersion,
    data: t.List[t.Dict[t.Any, t.Any]],
    session: AsyncSession
):
    """Insert batch data samples.

    Parameters
    ----------
    model_version
    data
    session
    """
    max_timestamp = None
    min_timestamp = None
    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in data:
        # Samples can have different optional fields sent on them, so in order to save them in multi-insert we need
        # to make sure all samples have same set of fields.
        model_version.fill_optional_fields(sample)
        validate(schema=model_version.monitor_json_schema, instance=sample)
        # Timestamp is passed as string, convert it to datetime
        sample[SAMPLE_TS_COL] = pdl.parse(sample[SAMPLE_TS_COL])
        max_timestamp = sample[SAMPLE_TS_COL] if max_timestamp is None else max(max_timestamp, sample[SAMPLE_TS_COL])
        min_timestamp = sample[SAMPLE_TS_COL] if min_timestamp is None else min(min_timestamp, sample[SAMPLE_TS_COL])
        update_statistics_from_sample(updated_statistics, sample)

    monitor_table = model_version.get_monitor_table(session)
    await session.execute(monitor_table.insert(), data)
    await model_version.update_timestamps(min_timestamp, max_timestamp, session)
    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)


async def update_data(
    model_version: ModelVersion,
    data: t.List[t.Dict[t.Any, t.Any]],
    session: AsyncSession
):
    """Update data samples.

    Parameters
    ----------
    model_version
    data
    session
    """
    json_schema = model_version.monitor_json_schema
    required_columns = set(json_schema["required"])
    # Create update schema, which contains only non-required columns and sample id
    optional_columns_schema = {
        "type": "object",
        "properties": {k: v for k, v in json_schema["properties"].items()
                       if k not in required_columns or k == SAMPLE_ID_COL},
        "required": [SAMPLE_ID_COL]
    }

    table = model_version.get_monitor_table(session)
    updated_statistics = copy.deepcopy(model_version.statistics)

    for sample in data:
        validate(schema=optional_columns_schema, instance=sample)
        sample_id = sample.pop(SAMPLE_ID_COL)
        update_statistics_from_sample(updated_statistics, sample)
        await session.execute(
            update(table).where(table.c[SAMPLE_ID_COL] == sample_id).values(sample)
        )

    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)


class DataIngestionBackend:
    """Holds the logic for the data ingestion. Can be override to alter the logic and sent in `create_app`."""

    def __init__(
        self,
        settings,
        resources_provider,
        logger=None
    ):
        self.settings = settings
        self.resources_provider = resources_provider
        self.logger = logger or logging.getLogger("data-ingestion")
        self.use_kafka = self.settings.kafka_host is not None

    def generate_topic_name(
        self,
        model_version: ModelVersion,
        request: fastapi.Request  # pylint: disable=unused-argument
    ):
        """Get name of kafka topic.

        Parameters
        ----------
        model_version: ModelVersion
        request: fastapi.Request
            used to be able to get more info when overriding this function

        Returns
        -------
        str
            Name of kafka topic to be used for given model version entity.
        """
        return f"data-{model_version.id}"

    async def get_session(
        self,
        topic  # pylint: disable=unused-argument
    ) -> AsyncSession:
        """Get session object based on the given topic.

        Parameters
        ----------
        topic
            used to be able to get more info when overriding this function

        Returns
        -------
        AsyncSession
        """
        return await self.resources_provider.create_async_database_session()

    async def log(
        self,
        model_version: ModelVersion,
        data: t.List[t.Dict[str, t.Any]],
        session: AsyncSession,
        request: fastapi.Request  # pylint: disable=unused-argument
    ):
        """Log new data.

        Parameters
        ----------
        model_version: ModelVersion
        data: t.List[t.Dict[str, t.Any]
        session: AsyncSession
        request: fastapi.Request
            used to be able to get more info when overriding this function
        """
        if self.use_kafka:
            topic_name = self.generate_topic_name(model_version, request)
            producer = await self.resources_provider.kafka_producer
            send_future = None
            for sample in data:
                message = json.dumps({"type": "log", "data": sample}).encode("utf-8")
                send_future = await producer.send(topic_name, value=message)
            # Waiting on the last future since the messages are sent in order anyway
            await send_future
        else:
            await log_data(model_version, data, session)

    async def update(
        self,
        model_version: ModelVersion,
        data: t.List[t.Dict[str, t.Any]],
        session: AsyncSession,
        request: fastapi.Request  # pylint: disable=unused-argument
    ):
        """Update existing data.

        Parameters
        ----------
        model_version: ModelVersion
        data: t.List[t.Dict[str, t.Any]
        session: AsyncSession
        request: fastapi.Request
            used to be able to get more info when overriding this function
        """
        if self.use_kafka:
            topic_name = self.generate_topic_name(model_version, request)
            send_future = None
            for sample in data:
                message = json.dumps({"type": "update", "data": sample}).encode("utf-8")
                send_future = await self.resources_provider.kafka_producer.send(topic_name, message)
            # Waiting on the last future since the messages are sent in order anyway
            await send_future
        else:
            await update_data(model_version, data, session)

    async def consume_from_kafka(self):
        """Create an endless-loop of consuming messages from kafka."""
        while True:
            try:
                consumer = AIOKafkaConsumer(
                    **self.settings.kafka_params,
                    group_id="data_group",  # Consumer must be in a group to commit
                    enable_auto_commit=False,  # Will disable autocommit
                    auto_offset_reset="earliest",  # If committed offset not found, start from beginning,
                    max_poll_records=100,
                    metadata_max_age_ms=60 * 1000
                )
                await consumer.start()
                consumer.subscribe(pattern=r"^data\-.*$")
                while True:
                    result = await consumer.getmany(timeout_ms=10 * 1000)
                    for tp, messages in result.items():
                        if messages:
                            try:
                                await self.handle_messages(tp, messages)
                                # Commit progress only for this partition
                                await consumer.commit({tp: messages[-1].offset + 1})
                            except asyncpg.exceptions.PostgresConnectionError as e:
                                # In case of connection error does not commit the kafka messages, in order to try again
                                self.logger.exception(e)
                            except (asyncpg.exceptions.PostgresError, jsonschema.exceptions.ValidationError) as e:
                                # In case of postgres error (which is not connection) or json validation error,
                                # commit the messages and saves the error to db
                                self.logger.exception(e)
                                await self.save_failed_messages(tp, messages, e)
                                await consumer.commit({tp: messages[-1].offset + 1})
            except Exception as e:  # pylint: disable=broad-except
                self.logger.exception(e)
            # If consumer fails sleep 30 seconds and tried again
            await asyncio.sleep(30)

    async def handle_messages(self, tp, messages):
        """Handle messages consumed from kafka."""
        topic = tp.topic
        model_version_id = int(topic[topic.rfind("-") + 1:])
        messages_data = [json.loads(m.value) for m in messages]
        log_samples = [m["data"] for m in messages_data if m["type"] == "log"]
        update_samples = [m["data"] for m in messages_data if m["type"] == "update"]
        session = await self.get_session(tp)
        if session is None:
            return
        model_version = await session.get(ModelVersion, model_version_id)
        if model_version is None:
            return
        if log_samples:
            await log_data(model_version, log_samples, session)
        if update_samples:
            await update_data(model_version, update_samples, session)
        await session.commit()
        await session.close()

    async def save_failed_messages(self, tp, messages, exception):
        """Handle messages failed to be saved to the database."""
        session = await self.get_session(tp)
        topic = tp.topic
        model_version_id = int(topic[topic.rfind("-") + 1:])
        messages_data = [json.loads(m.value)["data"] for m in messages]
        ids = [m.get(SAMPLE_ID_COL) for m in messages_data]
        session.add(IngestionError(samples_ids=ids, samples=messages_data[:5], error=str(exception),
                                   model_version_id=model_version_id))
        # Save error to db
        await session.commit()
        await session.close()
