import random
import string
import threading
from typing import Optional

import aiokafka
from kafka.errors import KafkaError
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.keys import get_data_topic_name
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task
from deepchecks_monitoring.schema_models import ModelVersion
from deepchecks_monitoring.utils import database

__all__ = ['ModelVersionOffsetUpdate', 'insert_model_version_offset_update_task']


QUEUE_NAME = 'model version offset update'


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
        return 30

    async def run(self, task: 'Task', session: AsyncSession, resources_provider):
        if self.consumer is None:
            with self.lock:
                if self.consumer is None:
                    self.consumer = aiokafka.AIOKafkaConsumer(**resources_provider.kafka_settings.kafka_params)
                    await self.consumer.start()

        model_version_id = task.params['model_version_id']
        org_id = task.params['organization_id']
        succeeded = await _read_offset_from_kafka(org_id, model_version_id, session, self.consumer)
        # Deleting the task
        params_from_db = await session.scalar(delete(Task).where(Task.id == task.id).returning(Task.params))
        # If params hash changed from when we queried the task, reinsert it
        if not succeeded or params_from_db['hash'] != task.params['hash']:
            await insert_model_version_offset_update_task(org_id, model_version_id, session)


async def _read_offset_from_kafka(org_id, model_version_id, session, consumer):
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

    model_version: ModelVersion = (await session.execute(
        select(ModelVersion).where(ModelVersion.id == model_version_id)
    )).scalar_one_or_none()

    # Model version was deleted, doesn't need to do anything
    if model_version is None:
        return True

    # Get kafka topic offset
    try:
        topic = get_data_topic_name(org_id, model_version_id)
        topics = (await consumer.topics())
        if topic in topics:
            topic_partition = aiokafka.TopicPartition(get_data_topic_name(org_id, model_version_id), 0)
            # The end_offset returned is the next offset (end + 1)
            assignment = list(consumer.assignment())
            assignment.append(topic_partition)
            consumer.assign(list(assignment))
            model_version.topic_end_offset = await consumer.position(topic_partition) - 1
            return True
    except KafkaError:
        # Return False in order to not delete the task, so it will be retried again
        return False


async def insert_model_version_offset_update_task(organization_id, model_version_id, session):
    """Insert task to update kafka offset.

    We call this every time data is logged.
    """
    random_hash = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    params = {'organization_id': organization_id, 'model_version_id': model_version_id, 'hash': random_hash}
    values = dict(name=f'{organization_id}:{model_version_id}', bg_worker_task=QUEUE_NAME,
                  params=params)

    # In case of conflict update the params in order to update the random hash
    await session.execute(insert(Task).values(values).
                          on_conflict_do_update(constraint=UNIQUE_NAME_TASK_CONSTRAINT, set_={Task.params: params}))
