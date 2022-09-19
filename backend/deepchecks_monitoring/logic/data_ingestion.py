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
from contextlib import asynccontextmanager

import asyncpg.exceptions
import fastapi
import jsonschema.exceptions
import pendulum as pdl
import sqlalchemy.exc
from aiokafka import AIOKafkaConsumer
from jsonschema.validators import validate
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.models import ModelVersion
from deepchecks_monitoring.models.cache_invalidations import CacheInvalidation
from deepchecks_monitoring.models.column_type import SAMPLE_ID_COL, SAMPLE_TS_COL
from deepchecks_monitoring.models.ingestion_errors import IngestionError
from deepchecks_monitoring.models.model_version import update_statistics_from_sample

__all__ = ["DataIngestionBackend", "log_data", "update_data"]

from deepchecks_monitoring.utils import ExtendedAsyncSession


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
    valid_data = {}
    errors = []

    for sample in data:
        # Samples can have different optional fields sent on them, so in order to save them in multi-insert we need
        # to make sure all samples have same set of fields.
        model_version.fill_optional_fields(sample)
        try:
            validate(schema=model_version.monitor_json_schema, instance=sample)
        except jsonschema.exceptions.ValidationError as e:
            errors.append(dict(sample=str(sample), sample_id=sample.get(SAMPLE_ID_COL), error=str(e),
                               model_version_id=model_version.id))
            continue
        # Timestamp is passed as string, convert it to datetime
        sample[SAMPLE_TS_COL] = pdl.parse(sample[SAMPLE_TS_COL])
        # If getting an index more then once, it will be override here and the last one will be used in arbitrary
        valid_data[sample[SAMPLE_ID_COL]] = sample

    # Insert samples, and log samples which failed on existing index
    if valid_data:
        monitor_table = model_version.get_monitor_table(session)
        statement = (insert(monitor_table).values(list(valid_data.values()))
                     .on_conflict_do_nothing(index_elements=[SAMPLE_ID_COL]).returning(monitor_table.c[SAMPLE_ID_COL]))
        results = (await session.execute(statement)).scalars()
        logged_ids = set(results)
    else:
        logged_ids = set()
    logged_samples = [v for k, v in valid_data.items() if k in logged_ids]
    not_logged_samples = [v for k, v in valid_data.items() if k not in logged_ids]
    for sample in not_logged_samples:
        errors.append(dict(sample=str(sample), sample_id=sample[SAMPLE_ID_COL], error="Duplicate index on log",
                           model_version_id=model_version.id))
    # Save errors
    if errors:
        await session.execute(insert(IngestionError).values(errors))

    # Update statistics, timestamps, and cache invalidations, running only on samples which were logged successfully
    if len(logged_samples) == 0:
        return
    all_timestamps = []
    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in logged_samples:
        update_statistics_from_sample(updated_statistics, sample)
        all_timestamps.append(sample[SAMPLE_TS_COL])

    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)
    await model_version.update_timestamps(all_timestamps, session)
    await CacheInvalidation.insert_or_update(model_version, all_timestamps, session)


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

    results = []
    errors = []
    valid_data = {}
    for sample in data:
        try:
            validate(schema=optional_columns_schema, instance=sample)
        except jsonschema.exceptions.ValidationError as e:
            errors.append(dict(sample=str(sample), sample_id=sample.get(SAMPLE_ID_COL), error=str(e),
                               model_version_id=model_version.id))
            continue
        valid_data[sample[SAMPLE_ID_COL]] = sample
        results.append(session.execute(
            update(table).where(table.c[SAMPLE_ID_COL] == sample[SAMPLE_ID_COL]).values(sample)
            .returning(table.c[SAMPLE_ID_COL], table.c[SAMPLE_TS_COL])
        ))

    # Gather results, if got an update on non-existing id, then result will be empty
    results = [(await r).first() for r in results]
    logged_ids = [row[0] for row in results if row]
    logged_timestsamps = [pdl.instance(row[1]) for row in results if row]

    # Save as errors the ids that weren't exists
    logged_samples = [v for k, v in valid_data.items() if k in logged_ids]
    not_logged_samples = [v for k, v in valid_data.items() if k not in logged_ids]
    for sample in not_logged_samples:
        errors.append(dict(sample=str(sample), sample_id=sample[SAMPLE_ID_COL], error="Index not found on update",
                           model_version_id=model_version.id))
    # Save errors
    if errors:
        await session.execute(insert(IngestionError).values(errors))

    if len(logged_samples) == 0:
        return

    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in logged_samples:
        update_statistics_from_sample(updated_statistics, sample)
    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)

    await CacheInvalidation.insert_or_update(model_version, logged_timestsamps, session)


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

    @asynccontextmanager
    async def get_session(
            self,
            topic  # pylint: disable=unused-argument
    ) -> t.AsyncIterator[ExtendedAsyncSession]:
        """Get session object based on the given topic.

        Parameters
        ----------
        topic
            used to be able to get more info when overriding this function

        Returns
        -------
        AsyncSession
        """
        async with self.resources_provider.create_async_database_session() as s:
            yield s

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
                            except sqlalchemy.exc.SQLAlchemyError as e:
                                self.logger.exception(e)
                                # Sqlalchemy wraps the asyncpg exceptions in orig field
                                if hasattr(e, "orig"):
                                    e = e.orig

                                if isinstance(e, asyncpg.exceptions.PostgresConnectionError):
                                    # In case of connection error does not commit the kafka messages, in order to try
                                    # again
                                    continue
                                else:
                                    # In case of postgres error (which is not connection)
                                    # commit the messages and saves the error to db
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
        async with self.get_session(tp) as session:
            if session is None:
                return
            model_version = await session.get(ModelVersion, model_version_id)
            if model_version is None:
                return
            if log_samples:
                await log_data(model_version, log_samples, session)
            if update_samples:
                await update_data(model_version, update_samples, session)

    async def save_failed_messages(self, tp, messages, exception):
        """Handle messages failed to be saved to the database."""
        async with self.get_session(tp) as session:
            topic = tp.topic
            model_version_id = int(topic[topic.rfind("-") + 1:])
            messages_data = [m.value.decode() for m in messages[:5]]
            samples = [json.loads(m)["data"] for m in messages_data]
            values = [{"sample_id": s.get(SAMPLE_ID_COL), "sample": s, "error": str(exception),
                       "model_version_id": model_version_id}
                      for s in samples]
            await session.execute(insert(IngestionError).values(values))
