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
import fastjsonschema
import pandas as pd
import pendulum as pdl
import sqlalchemy.exc
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer, TopicPartition
from aiokafka.structs import ConsumerRecord
from sqlalchemy import Column, select, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import array_agg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from deepchecks_monitoring.bgtasks.model_version_cache_invalidation import insert_model_version_cache_invalidation_task
from deepchecks_monitoring.logic.kafka_consumer import consume_from_kafka
from deepchecks_monitoring.logic.keys import DATA_TOPIC_PREFIXES, data_topic_name_to_ids, get_data_topic_name
from deepchecks_monitoring.monitoring_utils import configure_logger
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model, ModelVersion
from deepchecks_monitoring.schema_models.column_type import (SAMPLE_ID_COL, SAMPLE_LABEL_COL, SAMPLE_LOGGED_TIME_COL,
                                                             SAMPLE_PRED_COL, SAMPLE_TS_COL)
from deepchecks_monitoring.schema_models.ingestion_errors import IngestionError
from deepchecks_monitoring.schema_models.model_version import get_monitor_table_name, update_statistics_from_sample
from deepchecks_monitoring.schema_models.task_type import TaskType
from deepchecks_monitoring.utils.database import sqlalchemy_exception_to_asyncpg_exception
from deepchecks_monitoring.utils.other import datetime_sample_formatter

__all__ = ["DataIngestionBackend", "log_data", "log_labels", "save_failures"]


QUERY_PARAM_LIMIT = 32765


async def log_data(
        model_version: ModelVersion,
        data: t.List[t.Dict[t.Any, t.Any]],
        session: AsyncSession,
        log_times: t.List["pdl.DateTime"],
        logger,
        org_id: int,
        cache_functions
):
    """Insert batch data samples.

    Parameters
    ----------
    model_version
    data
    session
    log_times
    logger
    org_id
    cache_functions
    """
    now = pdl.now()
    valid_data = {}
    errors = []
    validator = t.cast(t.Callable[..., t.Any], fastjsonschema.compile(model_version.monitor_json_schema))
    model: Model = model_version.model

    for index, sample in enumerate(data):
        # Samples can have different optional fields sent on them, so in order to save them in multi-insert we need
        # to make sure all samples have same set of fields.
        model_version.fill_optional_fields(sample)
        try:
            validator(sample)
        except fastjsonschema.JsonSchemaValueException as e:
            errors.append({
                "sample": str(sample),
                "sample_id": sample.get(SAMPLE_ID_COL),
                "error": f"Exception: {str(e)}, for id: {sample.get(SAMPLE_ID_COL)}",
                "model_id": model_version.model_id,
                "model_version_id": model_version.id
            })
        else:
            sample[SAMPLE_LOGGED_TIME_COL] = log_times[index]
            datetime_sample_formatter(sample, model_version)
            error = None
            # If got same index more than once, log it as error
            if sample[SAMPLE_ID_COL] in valid_data:
                error = f"Got duplicate sample id: {sample[SAMPLE_ID_COL]}"
            # If got future timestamp prevent save
            elif sample[SAMPLE_TS_COL] > now:
                error = f"Got future timestamp: {sample[SAMPLE_TS_COL]}, for sample id: {sample[SAMPLE_ID_COL]}"

            if error:
                errors.append({
                    "sample": str(sample),
                    "sample_id": sample.get(SAMPLE_ID_COL),
                    "error": error,
                    "model_id": model_version.model_id,
                    "model_version_id": model_version.id
                })
            else:
                valid_data[sample[SAMPLE_ID_COL]] = sample

    # Insert samples, and log samples which failed on existing index
    logged_ids = set()
    if valid_data:
        # Starting by adding to the version map
        versions_map = model.get_samples_versions_map_table(session)
        ids_to_log = [{SAMPLE_ID_COL: sample_id, "version_id": model_version.id} for sample_id in valid_data]
        ids_not_existing = set()
        max_messages_per_insert = QUERY_PARAM_LIMIT // 5
        for start_index in range(0, len(ids_to_log), max_messages_per_insert):
            statement = (postgresql.insert(versions_map)
                         .values(ids_to_log[start_index:start_index + max_messages_per_insert])
                         .on_conflict_do_nothing(index_elements=versions_map.primary_key.columns)
                         .returning(versions_map.c[SAMPLE_ID_COL]))
            ids_not_existing.update((await session.execute(statement)).scalars())
        # Filter from the data ids which weren't logged to the versions table
        data_list = [sample for id, sample in valid_data.items() if id in ids_not_existing]
        if data_list:
            # Postgres driver has a limit of 32767 query params, which for 1000 messages, limits us to 32 columns. In
            # order to solve that we can either pre-compile the statement with bind literals, or separate to batches
            num_columns = len(data_list[0])
            max_messages_per_insert = QUERY_PARAM_LIMIT // num_columns
            monitor_table = model_version.get_monitor_table(session)
            for start_index in range(0, len(data_list), max_messages_per_insert):
                batch = data_list[start_index:start_index + max_messages_per_insert]
                statement = (postgresql.insert(monitor_table).values(batch)
                             .on_conflict_do_nothing(index_elements=[SAMPLE_ID_COL])
                             .returning(monitor_table.c[SAMPLE_ID_COL]))
                results = (await session.execute(statement)).scalars()
                logged_ids.update(set(results))

    logged_samples = [v for k, v in valid_data.items() if k in logged_ids]
    not_logged_samples = [v for k, v in valid_data.items() if k not in logged_ids]
    for sample in not_logged_samples:
        errors.append(dict(sample=str(sample), sample_id=sample[SAMPLE_ID_COL],
                           error=f"Duplicate index on log for id {sample[SAMPLE_ID_COL]}",
                           model_id=model_version.model_id, model_version_id=model_version.id))

    if len(logged_samples) == 0:
        # If did not log any samples, only needs to save the errors. If did log samples, will save the errors later
        # after updating the model
        await save_failures(session, errors, logger)
        return []

    # Update statistics and timestamps, running only on samples which were logged successfully
    logged_timestamps = []
    updated_statistics = copy.deepcopy(model_version.statistics)
    for sample in logged_samples:
        update_statistics_from_sample(updated_statistics, sample)
        logged_timestamps.append(sample[SAMPLE_TS_COL])

    max_ts = max(logged_timestamps)
    min_ts = min(logged_timestamps)
    # IMPORTANT: In order to prevent deadlock in case of model deletion, we need to update the model first, because
    # we must acquire the locks on the model and model versions in the same order (model first, then model version).
    await model.update_timestamps(min_ts, max_ts)

    # Save errors only after updating model, since it also acquires a lock on the model version
    await save_failures(session, errors, logger)

    # Update model version statistics and timestamps
    if model_version.statistics != updated_statistics:
        await model_version.update_statistics(updated_statistics)
    await model_version.update_timestamps(min_ts, max_ts)
    await add_cache_invalidation(org_id, model_version.id, logged_timestamps, session, cache_functions)
    model_version.last_update_time = pdl.now()


async def log_labels(
        model: Model,
        data: t.List[t.Dict[t.Any, t.Any]],
        session: AsyncSession,
        org_id,
        cache_functions,
        logger
):
    unbatched_valid_data = pd.Series()
    logged_ids = set()
    labels_table_columns = model.get_sample_labels_columns()
    labels_table_json_schema = {
        "type": "object",
        "properties": {
            name: data_type.to_json_schema_type(nullable=name != SAMPLE_ID_COL)
            for name, data_type in labels_table_columns.items()
        },
        "required": list(labels_table_columns.keys()),
        "additionalProperties": False
    }

    validator = t.cast(t.Callable[..., t.Any], fastjsonschema.compile(labels_table_json_schema))
    errors = []
    for sample in data:
        try:
            validator(sample)
        except fastjsonschema.JsonSchemaValueException as e:
            errors.append({
                "sample": str(sample),
                "sample_id": sample.get(SAMPLE_ID_COL),
                "error": f"Exception saving label: {str(e)}, for id: {sample.get(SAMPLE_ID_COL)}",
                "model_id": model.id,
            })
        else:
            # If got same index more than once, log it as error
            if sample[SAMPLE_ID_COL] in logged_ids:
                errors.append({
                    "sample": str(sample),
                    "sample_id": sample.get(SAMPLE_ID_COL),
                    "error": f"Got duplicate label for sample id: {sample[SAMPLE_ID_COL]}. "
                             f"{sample.get(SAMPLE_LABEL_COL)} vs "
                             f"{unbatched_valid_data[sample[SAMPLE_ID_COL]].get(SAMPLE_LABEL_COL)}",
                    "model_id": model.id,
                })
            else:
                unbatched_valid_data[sample[SAMPLE_ID_COL]] = sample
                logged_ids.add(sample[SAMPLE_ID_COL])

    await save_failures(session, errors, logger)

    if len(unbatched_valid_data) == 0:
        return
    max_messages_per_insert = QUERY_PARAM_LIMIT // 5
    ids_to_log = unbatched_valid_data.keys()
    for start_index in range(0, len(ids_to_log), max_messages_per_insert):
        valid_data = unbatched_valid_data[ids_to_log[start_index:start_index + max_messages_per_insert]]
        # Query from the ids mapping all the relevant versions per each version. This is needed in order to query
        # the timestamps to invalidate the monitors cache
        versions_table = model.get_samples_versions_map_table(session)
        versions_select = (
            select(
                versions_table.c["version_id"],
                array_agg(versions_table.c[SAMPLE_ID_COL])
            )
            .where(versions_table.c[SAMPLE_ID_COL].in_(list(valid_data.keys())))
            .group_by(versions_table.c["version_id"])
        )
        results = (await session.execute(versions_select)).all()

        # Validation of classes amount for binary tasks
        if model.task_type == TaskType.BINARY:
            errors = []
            for row in results:
                version_id = row[0]
                sample_ids = row[1]
                model_version: ModelVersion = \
                    (await session.execute(select(ModelVersion).where(ModelVersion.id == version_id))).scalars().first()
                classes = set(model_version.statistics.get(SAMPLE_LABEL_COL, {"values": []})["values"] +
                              model_version.statistics.get(SAMPLE_PRED_COL, {"values": []})["values"])
                for sample_id in sample_ids:
                    if len(classes) > 1 and valid_data[sample_id][SAMPLE_LABEL_COL] not in classes:
                        errors.append(dict(sample=str(valid_data[sample_id]),
                                           sample_id=valid_data[sample_id],
                                           error=f"More than 2 classes in binary model. {classes} present, " +
                                           f"""received: {valid_data[sample_id][SAMPLE_LABEL_COL]},
                                           sample id: {valid_data[sample_id]}""",
                                           model_id=model_version.model_id,
                                           model_version_id=model_version.id))
                        del valid_data[sample_id]
            await save_failures(session, errors, logger)

        if len(valid_data) > 0:
            # update label statistics
            for row in results:
                version_id = row[0]
                sample_ids = [sample_id for sample_id in row[1] if sample_id in valid_data]
                model_version: ModelVersion = \
                    (await session.execute(select(ModelVersion).where(ModelVersion.id == version_id))).scalars().first()
                updated_statistics = copy.deepcopy(model_version.statistics)
                for sample_id in sample_ids:
                    update_statistics_from_sample(updated_statistics, valid_data[sample_id])
                if model_version.statistics != updated_statistics:
                    await model_version.update_statistics(updated_statistics)

            # Insert or update all labels
            labels_table = model.get_sample_labels_table(session)
            insert_statement = postgresql.insert(labels_table)
            upsert_statement = insert_statement.on_conflict_do_update(
                index_elements=[SAMPLE_ID_COL],
                set_={SAMPLE_LABEL_COL: insert_statement.excluded[SAMPLE_LABEL_COL]}
            )
            await session.execute(upsert_statement, valid_data.tolist())

            for row in results:
                version_id = row[0]
                sample_ids = [sample_id for sample_id in row[1] if sample_id in valid_data]
                monitor_table_name = get_monitor_table_name(model.id, version_id)
                ts_select = (select(Column(SAMPLE_TS_COL))
                             .select_from(text(monitor_table_name))
                             .where(Column(SAMPLE_ID_COL).in_(sample_ids)))
                timestamps_affected = [pdl.instance(x) for x in (await session.execute(ts_select)).scalars()]
                await add_cache_invalidation(org_id, version_id, timestamps_affected, session, cache_functions)

            model.last_update_time = pdl.now()


async def add_cache_invalidation(organization_id, model_version_id, timestamps_updated, session, cache_functions):
    """Update model version update time, calling cache invalidation, and adding current model version to \
    redis process set. Use model version "-1" to run on all model versions"""
    if timestamps_updated:
        int_timestamps = {ts.set(minute=0, second=0, microsecond=0).int_timestamp for ts in timestamps_updated}
        cache_functions.add_invalidation_timestamps(organization_id, model_version_id, int_timestamps)
        await insert_model_version_cache_invalidation_task(organization_id, model_version_id, session)


async def save_failures(session: AsyncSession, errors, logger):
    """Save failed messages into ingestion errors table."""
    try:
        if not errors:
            return
        for i in range(0, len(errors), 1_000):
            batch = errors[i: i + 1_000]
            await session.execute(postgresql.insert(IngestionError).values(batch))
            await session.flush()
    except Exception as exception:   # pylint: disable=broad-except
        if isinstance(exception, sqlalchemy.exc.SQLAlchemyError):
            # SQLAlchemy wraps the original error in a weird way, so we need to extract it
            pg_exception = sqlalchemy_exception_to_asyncpg_exception(exception)
            if isinstance(pg_exception, asyncpg.exceptions.ForeignKeyViolationError):
                # In case model version was deleted, we will get foreign key violation, so we ignore it
                logger.info("Got %s probably due to model version being removed", " ".join(exception.args))
            else:
                logger.exception("Got unexpected sqlalchemy error while saving ingestion errors")
        else:
            logger.exception("Got unexpected error while saving ingestion errors")


class DataIngestionBackend(object):
    """Holds the logic for the data ingestion."""

    def __init__(
            self,
            resources_provider,
            logger=None
    ):
        self.resources_provider: ResourcesProvider = resources_provider
        self.logger = logger or configure_logger(name="data-ingestion")
        self.use_kafka = self.resources_provider.kafka_settings.kafka_host is not None

    async def _send_with_retry(
            self,
            producer: AIOKafkaProducer,
            topic_name: str,
            messages: list[tuple],
            total_msgs: int,
            max_retries=3
    ):
        """Send messages to Kafka with asynchronous retry logic."""
        retry_count = 0
        while messages and retry_count < max_retries:
            send_futures = [
                await producer.send(topic_name, value=message, key=key)
                for key, message in messages
            ]

            results = await asyncio.gather(*send_futures, return_exceptions=True)

            failed_messages = [
                ((key, message), result) for ((key, message), result) in zip(messages, results)
                if isinstance(result, Exception)
            ]

            exception_types = {type(result).__name__ for _, result in failed_messages}
            if len(exception_types) == 1:
                self.logger.warning(f"All messages failed with the same error: {list(exception_types)[0]}")
            else:
                for ((key, _), result) in failed_messages:
                    self.logger.warning(
                        f"Failed message key: {key.decode() if key else 'None'} with error: {str(result)}"
                    )

            if failed_messages:
                self.logger.warning(f"Retry {retry_count + 1}: {len(failed_messages)} messages failed to send.")
                messages = [msg for msg, _ in failed_messages]
                retry_count += 1

                if retry_count < max_retries:
                    await asyncio.sleep(retry_count)
            else:
                break

        if failed_messages:
            self.logger.error(
                f"Failed to send {len(failed_messages)} "
                f"messages after {max_retries} retries out of original {total_msgs}."
            )

    async def log_samples(
        self,
        model_version: ModelVersion,
        data: t.List[t.Dict[str, t.Any]] | pd.DataFrame,
        session: AsyncSession,
        organization_id: int,
        log_time: "pdl.DateTime",
    ):
        if isinstance(data, pd.DataFrame):
            data = data.to_dict(orient="records")

        if self.use_kafka:
            entity = "model-version"
            topic_name = get_data_topic_name(organization_id, model_version.id, entity)
            topic_existed = self.resources_provider.ensure_kafka_topic(topic_name)

            # If topic was created, resetting the offsets and adding a task to delete it when data upload is done
            if not topic_existed:
                model_version.ingestion_offset = -1
                model_version.topic_end_offset = -1
                # await insert_model_version_topic_delete_task(organization_id, model_version.id, entity, session)

            async with self.resources_provider.get_kafka_producer() as producer:
                messages = [
                    (sample.get(SAMPLE_ID_COL, "").encode(),
                     json.dumps({"data": sample, "log_time": log_time.to_iso8601_string()}).encode("utf-8"))
                    for sample in data
                ]

                await self._send_with_retry(producer, topic_name, messages, len(messages))
        else:
            await log_data(model_version, data, session, [log_time] * len(data), self.logger,
                           organization_id, self.resources_provider.cache_functions)

    async def log_labels(
        self,
        model: Model,
        data: t.List[t.Dict[str, t.Any]] | pd.DataFrame,
        session: AsyncSession,
        organization_id: int,
    ):
        if isinstance(data, pd.DataFrame):
            data = data.to_dict(orient="records")

        if self.use_kafka:
            entity = "model"
            topic_name = get_data_topic_name(organization_id, model.id, entity)
            topic_existed = self.resources_provider.ensure_kafka_topic(topic_name)

            # If topic was created, resetting the offsets and adding a task to delete it when data upload is done
            if not topic_existed:
                model.ingestion_offset = -1
                model.topic_end_offset = -1
                # await insert_model_version_topic_delete_task(organization_id, model.id, entity, session)

            async with self.resources_provider.get_kafka_producer() as producer:
                messages = [
                    (sample.get(SAMPLE_ID_COL, "").encode(),
                     json.dumps({"data": sample}).encode("utf-8"))
                    for sample in data
                ]

                await self._send_with_retry(producer, topic_name, messages, len(messages))
        else:
            await log_labels(model, data, session, organization_id,
                             self.resources_provider.cache_functions, self.logger)

    async def run_data_consumer(self):
        """Create an endless-loop of consuming messages from kafka."""
        regex_pattern = "^" + "|".join((rf"({prefix}\-.*)" for prefix in DATA_TOPIC_PREFIXES.values()))
        await consume_from_kafka(self.resources_provider.kafka_settings, self._handle_data_messages,
                                 regex_pattern, self.logger)

    async def _handle_data_messages(self,
                                    consumer: AIOKafkaConsumer,
                                    tp: TopicPartition,
                                    messages: list[ConsumerRecord]) -> bool:
        """Handle messages consumed from kafka."""
        organization_id, entity_id, entity = data_topic_name_to_ids(tp.topic)
        try:
            topic_offset = (await consumer.end_offsets([tp]))[tp] - 1
            async with self.resources_provider.create_async_database_session(organization_id) as session:
                # If session is none, it means the organization was removed, so no need to do anything
                if session is None:
                    return True
                if entity == "model-version":
                    model_version: ModelVersion = (await session.execute(
                        select(ModelVersion)
                        .options(joinedload(ModelVersion.model))
                        .where(ModelVersion.id == entity_id))
                    ).scalars().first()
                    # If model version is none it was deleted, so no need to do anything
                    if model_version is None:
                        return True
                    model_version.topic_end_offset = topic_offset
                    # If kafka commit failed we might rerun on same messages, so using the ingestion offset to forward
                    # already ingested messages
                    messages_data = [json.loads(m.value) for m in messages if m.offset > model_version.ingestion_offset]
                    samples = [m["data"] for m in messages_data]
                    log_times = [pdl.parse(m["log_time"]) for m in messages_data]
                    await log_data(model_version, samples, session, log_times, self.logger, organization_id,
                                   self.resources_provider.cache_functions)
                    model_version.ingestion_offset = messages[-1].offset
                if entity == "model":
                    model: Model = (await session.execute(select(Model).where(Model.id == entity_id))).scalar()
                    # If model is none it was deleted, so no need to do anything
                    if model is None:
                        return True
                    model.topic_end_offset = topic_offset
                    # If kafka commit failed we might rerun on same messages, so using the ingestion offset to forward
                    # already ingested messages
                    messages_data = [json.loads(m.value) for m in messages if m.offset > model.ingestion_offset]
                    samples = [m["data"] for m in messages_data]
                    await log_labels(model, samples, session, organization_id,
                                     self.resources_provider.cache_functions, self.logger)
                    model.ingestion_offset = messages[-1].offset

            return True
        except Exception as exception:  # pylint: disable=broad-except
            if isinstance(exception, sqlalchemy.exc.SQLAlchemyError):
                # SQLAlchemy wraps the original error in a weird way, so we need to extract it
                pg_exception = sqlalchemy_exception_to_asyncpg_exception(exception)
                if isinstance(pg_exception, asyncpg.exceptions.PostgresConnectionError):
                    # In case of connection error does not commit the kafka messages, in order to try
                    # again
                    self.logger.info("Got %s, does not commit kafka messages", " ".join(exception.args))
                    await session.rollback()
                    return False
                if isinstance(pg_exception, (asyncpg.exceptions.UndefinedTableError,
                                             sqlalchemy.orm.exc.StaleDataError)):
                    self.logger.info("Got %s probably due to entity being removed, "
                                     "committing kafka messages anyway", " ".join(exception.args))
                    await session.rollback()
                    return True

            self.logger.exception("Got unexpected error, saving errors and committing kafka messages anyway")
            if entity == "model-version":
                errors = [{"sample_id": json.loads(m.value.decode())["data"].get(SAMPLE_ID_COL),
                           "sample": m.value.decode(),
                           "error": f'''{str(exception)},
                           sample id: {json.loads(m.value.decode())["data"].get(SAMPLE_ID_COL)}'''}
                          for m in messages]
                async with self.resources_provider.create_async_database_session(organization_id) as session:
                    await save_failures(session, errors, self.logger)
            return True
