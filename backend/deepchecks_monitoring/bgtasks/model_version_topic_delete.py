import threading
from typing import Optional

import pendulum as pdl
from kafka.errors import KafkaError, UnknownTopicOrPartitionError
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.keys import get_data_topic_name
from deepchecks_monitoring.monitoring_utils import TimeUnit
from deepchecks_monitoring.public_models import Organization
from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task
from deepchecks_monitoring.resources import ResourcesProvider
from deepchecks_monitoring.schema_models import Model, ModelVersion
from deepchecks_monitoring.utils import database
from deepchecks_monitoring.utils.other import ExtendedAIOKafkaAdminClient

__all__ = ['ModelVersionTopicDeletionWorker', 'insert_model_version_topic_delete_task']


QUEUE_NAME = 'model version topic delete'
DELAY = TimeUnit.HOUR.value * 3


class ModelVersionTopicDeletionWorker(BackgroundWorker):
    """Worker to delete kafka topics when they are no longer in use.

    NOTE:
    In this worker we are doing actions on 2 external services, kafka and postgres. This action can never be atomic.
    Therefore, we can have a case where we first delete the topics, (task is still in the db), than user sends data,
    topics are re-created but the task won't be created since the insert will see task already exists. For this case
    we are using the hash in the params. In case of conflict we update the hash, and then if it was updated during the
    worker run than we know to recreate the task, so it will be run again later.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.kafka_admin: Optional[ExtendedAIOKafkaAdminClient] = None

    def queue_name(self) -> str:
        return QUEUE_NAME

    def delay_seconds(self) -> int:
        return DELAY

    async def run(self, task: 'Task', session: AsyncSession, resources_provider: ResourcesProvider):
        if self.kafka_admin is None:
            with self.lock:
                if self.kafka_admin is None:
                    self.kafka_admin = ExtendedAIOKafkaAdminClient(**resources_provider.kafka_settings.kafka_params)
                    await self.kafka_admin.start()

        # Backward compatibility, remove in next release and replace with:
        # model_version_id = task.params['id']
        # entity = task.params['entity']
        entity_id = task.params.get('id') or task.params['model_version_id']
        entity = task.params.get('entity', 'model-version')
        #####

        org_id = task.params['organization_id']
        topic_names = [get_data_topic_name(org_id, entity_id, entity)]
        reinsert_task = False

        organization_schema = (await session.execute(
            select(Organization.schema_name).where(Organization.id == org_id)
        )).scalar_one_or_none()

        # If organization is removed than delete topic, else check conditions apply
        if organization_schema is None:
            remove_topic = True
        else:
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

            # Check conditions to remove topic
            remove_topic = (ingested_entity is None or
                            (ingested_entity.last_update_time < pdl.now().subtract(hours=3) and
                             ingested_entity.ingestion_offset == ingested_entity.topic_end_offset))

        if remove_topic:
            try:
                await self.kafka_admin.delete_topics(topic_names)
            except UnknownTopicOrPartitionError:
                pass
            except KafkaError:
                # In case of kafka error scheduling this task for later time
                reinsert_task = True
        else:
            reinsert_task = True

        await session.execute(delete(Task).where(Task.id == task.id))

        if reinsert_task:
            await insert_model_version_topic_delete_task(org_id, entity_id, entity, session)


async def insert_model_version_topic_delete_task(organization_id, entity_id, entity, session):
    """Insert task to check delete kafka topics.

    We do this when new topic is created in the data ingestion, and inside the worker itself if there was kafka error
    or conditions to delete was not met (data is still being sent)
    """
    now = pdl.now().int_timestamp
    # To avoid edge case where we:
    # 1. worker: delete topic
    # 2. server: create the topic + create task
    # 3. worker: delete task
    # By adding the floored timestamp the "created task" in server will have different name than the task being deleted
    # by the worker
    floored_now = now - now % DELAY
    params = {'organization_id': organization_id, 'id': entity_id, 'entity': entity}
    values = dict(name=f'{organization_id}:{entity}:{entity_id}:{floored_now}', bg_worker_task=QUEUE_NAME,
                  params=params)

    await session.execute(insert(Task).values(values).on_conflict_do_nothing(constraint=UNIQUE_NAME_TASK_CONSTRAINT))
