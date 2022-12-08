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
import boto3
import jsonschema.exceptions
import pendulum as pdl
import sqlalchemy.exc
from jsonschema import FormatChecker
from jsonschema.validators import validator_for
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.logic.cache_invalidation import CacheInvalidator
from deepchecks_monitoring.logic.kafka_consumer import consume_from_kafka
from deepchecks_monitoring.logic.keys import get_data_topic_name, topic_name_to_ids
from deepchecks_monitoring.logic.s3_image_utils import base64_image_data_to_s3
from deepchecks_monitoring.public_models import User
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.schema_models.column_type import SAMPLE_ID_COL, SAMPLE_S3_IMAGE_COL, SAMPLE_TS_COL
from deepchecks_monitoring.schema_models.ingestion_errors import IngestionError
from deepchecks_monitoring.schema_models.model import Model
from deepchecks_monitoring.schema_models.model_version import update_statistics_from_sample

__all__ = ["DataIngestionBackend", "log_data", "update_data"]


async def log_data(
        model_version: ModelVersion,
        data: t.List[t.Dict[t.Any, t.Any]],
        s3_bucket: str,
        org_id: int,
        session: AsyncSession,
):
    """Insert batch data samples.

    Parameters
    ----------
    model_version
    data
    session
    """
    now = pdl.now()
    valid_data = {}
    errors = []

    validator_class = validator_for(model_version.monitor_json_schema)
    val_instance = validator_class(model_version.monitor_json_schema, format_checker=FormatChecker())

    s3_client = boto3.client("s3") if s3_bucket and SAMPLE_S3_IMAGE_COL in model_version.model_columns else None

    for sample in data:
        # Samples can have different optional fields sent on them, so in order to save them in multi-insert we need
        # to make sure all samples have same set of fields.
        model_version.fill_optional_fields(sample)
        try:
            val_instance.validate(sample)
        except jsonschema.exceptions.ValidationError as e:
            errors.append({
                "sample": str(sample),
                "sample_id": sample.get(SAMPLE_ID_COL),
                "error": str(e),
                "model_version_id": model_version.id
            })
        else:
            if sample.get(SAMPLE_S3_IMAGE_COL):
                if s3_bucket:
                    sample[SAMPLE_S3_IMAGE_COL] = base64_image_data_to_s3(sample[SAMPLE_S3_IMAGE_COL],
                                                                          sample[SAMPLE_ID_COL],
                                                                          model_version,
                                                                          org_id,
                                                                          s3_bucket,
                                                                          s3_client)
                else:
                    sample[SAMPLE_S3_IMAGE_COL] = None
            # Timestamp is passed as string, convert it to datetime
            sample_timestamp = pdl.parse(sample[SAMPLE_TS_COL])
            if sample_timestamp <= now:
                sample[SAMPLE_TS_COL] = sample_timestamp
                # If getting an index more then once,
                # it will be override here and the last one will be used in arbitrary
                valid_data[sample[SAMPLE_ID_COL]] = sample
            else:
                errors.append({
                    "sample": str(sample),
                    "sample_id": sample.get(SAMPLE_ID_COL),
                    "error": "Deepchecks disallow uploading of future data (timestamp > now)",
                    "model_version_id": model_version.id
                })

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

    # Update statistics and timestamps, running only on samples which were logged successfully

    if len(logged_samples) == 0:
        return []
    all_timestamps = []

    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in logged_samples:
        update_statistics_from_sample(updated_statistics, sample, model_version.model.task_type)
        all_timestamps.append(sample[SAMPLE_TS_COL])

    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)
    await model_version.update_timestamps(all_timestamps, session)
    return all_timestamps


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

    optional_columns_schema = {
        "type": "object",
        "properties": json_schema["properties"],
        "required": [SAMPLE_ID_COL],
        "additionalProperties": False
    }

    table = model_version.get_monitor_table(session)

    results = []
    errors = []
    valid_data = {}
    validator_class = validator_for(optional_columns_schema)
    val_instance = validator_class(optional_columns_schema, format_checker=FormatChecker())

    for sample in data:
        try:
            val_instance.validate(sample)
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
        return []

    # Update statistics if needed
    updated_statistics = copy.deepcopy(model_version.statistics)

    for sample in logged_samples:
        update_statistics_from_sample(updated_statistics, sample, model_version.model.task_type)
    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics, session)

    return logged_timestsamps


class DataIngestionBackend(object):
    """Holds the logic for the data ingestion."""

    def __init__(
            self,
            resources_provider,
            s3_bucket: str,
            logger=None
    ):
        self.resources_provider = resources_provider
        self.cache_invalidator = CacheInvalidator(resources_provider)
        self.s3_bucket = s3_bucket
        self.logger = logger or logging.getLogger("data-ingestion")
        self.use_kafka = self.resources_provider.kafka_settings.kafka_host is not None
        self._producer = None

    async def log(
            self,
            model_version: ModelVersion,
            data: t.List[t.Dict[str, t.Any]],
            session: AsyncSession,
            user: User
    ):
        """Log new data.

        Parameters
        ----------
        model_version: ModelVersion
        data: t.List[t.Dict[str, t.Any]
        session: AsyncSession
        user: User
        """
        self.resources_provider.cache_functions.add_to_process_set(user.organization_id, model_version.id)
        if self.use_kafka:
            topic_name = get_data_topic_name(user.organization_id, model_version.id)
            topic_existed = self.resources_provider.ensure_kafka_topic(topic_name)
            # If topic was created, resetting the offsets
            if not topic_existed:
                model_version.ingestion_offset = 0
                model_version.topic_end_offset = 0

            if self._producer is None:
                self._producer = await self.resources_provider.kafka_producer

            send_futures = []
            for sample in data:
                message = json.dumps({"type": "log", "data": sample}).encode("utf-8")
                send_futures.append(await self._producer.send(topic_name, value=message))
            await asyncio.gather(*send_futures)
        else:
            timestamps = await log_data(model_version, data, self.s3_bucket, user.organization_id, session)
            await self.after_data_update(user.organization_id, model_version.id, timestamps, session)

    async def update(
            self,
            model_version: ModelVersion,
            data: t.List[t.Dict[str, t.Any]],
            session: AsyncSession,
            user: User
    ):
        """Update existing data.

        Parameters
        ----------
        model_version: ModelVersion
        data: t.List[t.Dict[str, t.Any]
        session: AsyncSession
        user: User
        """
        self.resources_provider.cache_functions.add_to_process_set(user.organization_id, model_version.id)
        if self.use_kafka:
            topic_name = get_data_topic_name(user.organization_id, model_version.id)
            topic_existed = self.resources_provider.ensure_kafka_topic(topic_name)
            # If topic was created, resetting the offsets
            if not topic_existed:
                model_version.ingestion_offset = 0
                model_version.topic_end_offset = 0

            if self._producer is None:
                self._producer = await self.resources_provider.kafka_producer

            send_futures = []
            for sample in data:
                message = json.dumps({"type": "update", "data": sample}).encode("utf-8")
                send_futures.append(await self._producer.send(topic_name, value=message))
            # Waiting on the last future since the messages are sent in order anyway
            await asyncio.gather(*send_futures)
        else:
            timestamps = await update_data(model_version, data, session)
            await self.after_data_update(user.organization_id, model_version.id, timestamps, session)

    async def run_data_consumer(self):
        """Create an endless-loop of consuming messages from kafka."""
        await consume_from_kafka(self.resources_provider.kafka_settings, self.handle_data_messages,
                                 r"^data\-.*$", self.logger)

    async def handle_data_messages(self, tp, messages) -> bool:
        """Handle messages consumed from kafka."""
        organization_id, model_version_id = topic_name_to_ids(tp.topic)
        try:
            messages_data = [json.loads(m.value) for m in messages]
            log_samples = [m["data"] for m in messages_data if m["type"] == "log"]
            update_samples = [m["data"] for m in messages_data if m["type"] == "update"]
            timestamps = []
            async with self.resources_provider.create_async_database_session(organization_id) as session:
                # If session is none, it means the organization was removed, so no need to do anything
                if session is None:
                    return True
                model_version = await session.execute(
                    select(ModelVersion)
                    .options(joinedload(ModelVersion.model).load_only(Model.task_type))
                    .where(ModelVersion.id == model_version_id))
                # If model version is none it was deleted, so no need to do anything
                if model_version is None:
                    return True
                model_version.ingestion_offset = messages[-1].offset
                if log_samples:
                    timestamps += await log_data(model_version, log_samples, self.s3_bucket, organization_id, session)
                if update_samples:
                    timestamps += await update_data(model_version, update_samples, session)
                await self.after_data_update(organization_id, model_version_id, timestamps, session)
            return True
        except sqlalchemy.exc.SQLAlchemyError as exception:
            self.logger.exception(exception)
            # Sqlalchemy wraps the asyncpg exceptions in orig field
            if hasattr(exception, "orig"):
                exception = exception.orig
            if isinstance(exception, asyncpg.exceptions.PostgresConnectionError):
                # In case of connection error does not commit the kafka messages, in order to try
                # again
                return False
            await self.save_failures(organization_id, model_version_id, messages, exception)
            return True
        except Exception as exception:  # pylint: disable=broad-except
            self.logger.exception(exception)
            # If it's not a db exception, we commit anyway to not get stuck
            await self.save_failures(organization_id, model_version_id, messages, exception)
            return True

    async def save_failures(self, organization_id, model_version_id, messages, exception):
        """Save failed messages into ingestion errors table."""
        async with self.resources_provider.create_async_database_session(organization_id) as session:
            samples = [json.loads(m.value.decode())["data"] for m in messages]
            values = [{"sample_id": sample.get(SAMPLE_ID_COL),
                       "sample": json.dumps(sample),
                       "error": str(exception),
                       "model_version_id": model_version_id}
                      for sample in samples]
            await session.execute(insert(IngestionError).values(values))

    async def after_data_update(self, organization_id, model_version_id, timestamps_updated, session):
        """Update model version update time, calling cache invalidation, and adding current model version to \
        redis process set."""
        if timestamps_updated:
            # Only in case data was logged/updated we update model version last update time.
            await session.execute(update(ModelVersion).where(ModelVersion.id == model_version_id).values(
                {ModelVersion.last_update_time: pdl.now()}))
            if self.use_kafka:
                await self.cache_invalidator.send_invalidation(organization_id, model_version_id, timestamps_updated)
            else:
                # In case we don't have a running kafka call the cache invalidation directly
                self.cache_invalidator.clear_monitor_cache_by_ids(organization_id, model_version_id, timestamps_updated)

        # Always add to process set since we use it to calculate the queue offset, so even if we didn't log any new
        # data we still want to update the queue size.
        self.resources_provider.cache_functions.add_to_process_set(organization_id, model_version_id)
