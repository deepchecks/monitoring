import pendulum as pdl
import pytest
from sqlalchemy import select

from deepchecks_monitoring.bgtasks.model_version_cache_invalidation import (
    ModelVersionCacheInvalidation, insert_model_version_cache_invalidation_task)
from deepchecks_monitoring.logic.cache_functions import CacheFunctions
from deepchecks_monitoring.public_models import Task


@pytest.mark.asyncio
async def test_clear_monitor_cache(resources_provider):
    cache_funcs: CacheFunctions = resources_provider.cache_functions

    # Arrange - Organization with 2 monitors and 2 model versions, and another organization with same monitor id.
    start_time = pdl.now()
    for _ in range(0, 10_000, 100):
        end_time = start_time.add(seconds=100)
        # Should be deleted later
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=1, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        # Should be deleted later
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=2, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        # Should NOT be deleted later
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=1, monitor_id=7,
                                      start_time=start_time, end_time=end_time, value='some value')
        # Should NOT be deleted later
        cache_funcs.set_monitor_cache(organization_id=9, model_version_id=1, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        start_time = end_time

    # Act
    cache_funcs.clear_monitor_cache(organization_id=1, monitor_id=1)
    # Assert
    assert len(cache_funcs.redis.keys()) == 200


@pytest.mark.asyncio
async def test_delete_monitor_cache_by_timestamp(resources_provider):
    cache_funcs: CacheFunctions = resources_provider.cache_functions

    # Arrange - Organization with 2 monitors and 2 model versions, and another organization with same monitor id.
    now = pdl.now()
    start_time = now
    for _ in range(0, 10_000, 100):
        end_time = start_time.add(seconds=100)
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=1, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=2, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        cache_funcs.set_monitor_cache(organization_id=1, model_version_id=1, monitor_id=7,
                                      start_time=start_time, end_time=end_time, value='some value')
        cache_funcs.set_monitor_cache(organization_id=9, model_version_id=1, monitor_id=1,
                                      start_time=start_time, end_time=end_time, value='some value')
        start_time = end_time

    timestamps_to_invalidate = {now.add(seconds=140).int_timestamp, now.add(seconds=520).int_timestamp,
                                now.add(seconds=1000).int_timestamp}
    cache_funcs.add_invalidation_timestamps(1, 1, timestamps_to_invalidate)

    # Act - run task
    async with resources_provider.async_session_factory() as session:
        task_id = await insert_model_version_cache_invalidation_task(1, 1, session=session)
        task = await session.scalar(select(Task).where(Task.id == task_id))
        await ModelVersionCacheInvalidation().run(task, session, resources_provider)

    # Assert - 2 monitors and 3 timestamps
    assert len(cache_funcs.redis.keys()) == 400 - 2 * 3
