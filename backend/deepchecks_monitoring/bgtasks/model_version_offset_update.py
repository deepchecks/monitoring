import threading
from typing import Optional

import aiokafka
import pendulum as pdl
from kafka.errors import KafkaError
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.keys import get_data_topic_name
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task
from deepchecks_monitoring.schema_models import Model, ModelVersion
from deepchecks_monitoring.utils import database

__all__ = ['ModelVersionOffsetUpdate', 'insert_model_version_offset_update_task']


QUEUE_NAME = 'model version offset update'
DELAY = 30


class ModelVersionOffsetUpdate(BackgroundWorker):
    """Worker to read kafka offsets for model versions.

    NOTE:
    In this worker we are doing actions on 2 external services, kafka and postgres. This action can never be atomic.
    Therefore, we can have a case where we first query the offset, (task is still in the db), than user sends data,
    the task won't be created since the insert will see the task is already exist.
    For this case we are using the hash in the params. In case of conflict we update the hash, and then if it was
    updated during the worker run than we know to recreate the task, so it will be run again later.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.consumer: Optional[aiokafka.AIOKafkaConsumer] = None

    def queue_name(self) -> str:
        return QUEUE_NAME

    def delay_seconds(self) -> int:
        return DELAY

    async def run(self, task: 'Task', session: AsyncSession, resources_provider):
        if self.consumer is None:
            with self.lock:
                if self.consumer is None:
                    self.consumer = aiokafka.AIOKafkaConsumer(**resources_provider.kafka_settings.kafka_params)
                    await self.consumer.start()

        # Backward compatibility, remove in next release and replace with:
        # entity_id = task.params['id']
        # entity = task.params['entity']
        entity_id = task.params.get('id') or task.params['model_version_id']
        entity = task.params.get('entity', 'model-version')
        #####
        org_id = task.params['organization_id']
        succeeded = await _read_offset_from_kafka(org_id, entity_id, entity, session, self.consumer)
        # Deleting the task
        await session.execute(delete(Task).where(Task.id == task.id))
        # If failed to read offset, scheduling task to run again
        if not succeeded:
            await insert_model_version_offset_update_task(org_id, entity_id, entity, session)


async def _read_offset_from_kafka(org_id, entity_id, entity, session, consumer):
    """Read offset from kafka, return True if succeeded."""
    organization_schema = (await session.execute(
        select(Organization.schema_name).where(Organization.id == org_id)
    )).scalar_one_or_none()

    # If organization was removed doing nothing
    if organization_schema is None:
        return True

    await database.attach_schema_switcher_listener(
        session=session,
        schema_search_path=[organization_schema, 'public']
    )

    if entity == 'model-version':
        ingested_entity = await session.scalar(select(ModelVersion).where(ModelVersion.id == entity_id))
    elif entity == 'model':
        ingested_entity = await session.scalar(select(Model).where(Model.id == entity_id))
    else:
        raise ValueError(f'Unknown entity {entity}')

    # entity was deleted, doesn't need to do anything
    if ingested_entity is None:
        return True

    # Get kafka topic offset
    try:
        topic = get_data_topic_name(org_id, entity_id, entity)
        topic_partition = aiokafka.TopicPartition(topic, 0)
        if topic not in (await consumer.topics()):
            assignment = list(consumer.assignment())
            assignment.append(topic_partition)
            consumer.assign(list(assignment))
        # The end_offset returned is the next offset (end + 1)
        ingested_entity.topic_end_offset = await consumer.position(topic_partition) - 1
        return True
    except KafkaError:
        # Return False in order to not delete the task, so it will be retried again
        return False


async def insert_model_version_offset_update_task(organization_id, entity_id, entity, session):
    """Insert task to update kafka offset.

    We call this every time data is logged.
    """
    now = pdl.now().int_timestamp
    # To avoid edge case where we:
    # 1. worker: read offset
    # 2. server: ingest data + create task
    # 3. worker: delete task
    # By adding the floored timestamp the "created task" in server will have different name than the task being deleted
    # by the worker
    floored_now = now - now % DELAY
    params = {'organization_id': organization_id, 'id': entity_id, 'entity': entity}
    values = dict(name=f'{organization_id}:{entity}:{entity_id}:{floored_now}', bg_worker_task=QUEUE_NAME,
                  params=params)

    await session.execute(insert(Task).values(values).on_conflict_do_nothing(constraint=UNIQUE_NAME_TASK_CONSTRAINT))
