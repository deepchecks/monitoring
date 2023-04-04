import bisect

import pendulum as pdl
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from deepchecks_monitoring.logic.keys import build_monitor_cache_key, get_invalidation_set_key
from deepchecks_monitoring.public_models.task import UNIQUE_NAME_TASK_CONSTRAINT, BackgroundWorker, Task

QUEUE_NAME = 'monitor cache invalidation'
DELAY = 60


class ModelVersionCacheInvalidation(BackgroundWorker):
    """Worker to remove monitor cache entries which data has been updated."""

    def queue_name(self) -> str:
        return QUEUE_NAME

    def delay_seconds(self) -> int:
        return DELAY

    async def run(self, task: 'Task', session: AsyncSession, resources_provider):
        # Delete task
        await session.execute(delete(Task).where(Task.id == task.id))

        model_version_id = task.params['model_version_id']
        org_id = task.params['organization_id']

        redis = resources_provider.redis_client
        invalidation_set_key = get_invalidation_set_key(org_id, model_version_id)

        # Query all timestamps
        entries = redis.zrange(invalidation_set_key, start=0, end=-1, withscores=True)
        if not entries:
            return
        # Sort timestamps for faster search
        invalidation_ts = sorted([int(x[0]) for x in entries])
        max_score = max((x[1] for x in entries))

        # Iterate all monitors cache keys and check timestamps overlap
        monitor_pattern = build_monitor_cache_key(org_id, model_version_id, None, None, None)
        keys_to_delete = []
        for monitor_cache_key in redis.scan_iter(match=monitor_pattern):
            splitted = monitor_cache_key.split(b':')
            start_ts, end_ts = int(splitted[4]), int(splitted[5])
            # Get first timestamp equal or larger than start_ts
            index = bisect.bisect_left(invalidation_ts, start_ts)
            # If index is equal to list length, then all timestamps are smaller than start_ts
            if index == len(invalidation_ts):
                continue
            if start_ts <= invalidation_ts[index] < end_ts:
                keys_to_delete.append(monitor_cache_key)

        pipe = redis.pipeline()
        for key in keys_to_delete:
            # Delete all cache keys - must do in separate deletes since RedisCluster does not support multi-delete
            pipe.delete(key)
        # Delete all invalidation timestamps by range. if timestamps were updated while running,
        # then their score should be larger than max_score, and they won't be deleted
        pipe.zremrangebyscore(invalidation_set_key, min=0, max=max_score)
        pipe.execute()


async def insert_model_version_cache_invalidation_task(organization_id, model_version_id, session):
    """Insert task to remove cache monitors entries which were invalidated.

    We do this when new data is ingested, in order to update the monitor values.
    """
    now = pdl.now().int_timestamp
    # To avoid edge case where we:
    # 1. worker: invalidate cache
    # 2. server: insert more timestamps to invalidate + create task
    # 3. worker: delete task
    # By adding the floored timestamp the "created task" in server will have different name than the task being deleted
    # by the worker
    floored_now = now - now % DELAY
    params = {'organization_id': organization_id, 'model_version_id': model_version_id}
    values = dict(name=f'{organization_id}:{model_version_id}:{floored_now}', bg_worker_task=QUEUE_NAME, params=params)

    # In case of conflict update the params in order to update the random hash
    return await session.scalar(insert(Task).values(values)
                                .on_conflict_do_nothing(constraint=UNIQUE_NAME_TASK_CONSTRAINT)
                                .returning(Task.id))
