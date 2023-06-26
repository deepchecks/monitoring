"""
This util script allow you to run a task directly without the need to use the task_runner nor the task_queuer
The prerequisite are that you need to have the task already defined in your db

Please replace:
TASK_CLASS
BG_WORKER_TASK

According to your need

"""
import asyncio

import dotenv
from redis.asyncio import Redis, RedisCluster
from redis.exceptions import RedisClusterException, LockNotOwnedError
from sqlalchemy import create_engine, select

from deepchecks_monitoring.ee.bgtasks import ObjectStorageIngestor
from deepchecks_monitoring.ee.resources import ResourcesProvider
from deepchecks_monitoring.logic.keys import TASK_RUNNER_LOCK
from deepchecks_monitoring.public_models import Task

# Task class you want to run
TASK_CLASS = ObjectStorageIngestor
# The task name you want to run (need to be exists in DB, we take the last one ordered by id desc)
BG_WORKER_TASK = 'object_storage_ingestion'

async def init_async_redis(redis_uri):
    """Initialize redis connection."""
    try:
        redis = RedisCluster.from_url(redis_uri)
        await redis.ping()
        return redis
    except RedisClusterException:
        return Redis.from_url(redis_uri)

async def run_it():
    if path := dotenv.find_dotenv(usecwd=True):
        dotenv.load_dotenv(dotenv_path=path)

    from deepchecks_monitoring.config import DatabaseSettings, Settings
    """List unused monitoring tables."""
    db_settings = DatabaseSettings()  # type: ignore
    settings = Settings()
    engine = create_engine(str(db_settings.database_uri), echo=True, future=True)

    async with ResourcesProvider(settings) as rp:
        async with rp.create_async_database_session() as session:

            try:
                async_redis = await init_async_redis(rp.redis_settings.redis_uri)

                lock_name = TASK_RUNNER_LOCK.format(1)
                # By default, allow task 5 minutes before removes lock to allow another run. Inside the task itself we can
                # extend the lock if we are doing slow operation and want more time
                lock = async_redis.lock(lock_name, blocking=False, timeout=60 * 5)
                lock_acquired = await lock.acquire()
                if not lock_acquired:
                    print(f'Failed to acquire redis lock')
                    return

                s3_task = (await session.execute(select(Task).where(Task.bg_worker_task == BG_WORKER_TASK).
                           order_by(Task.id.desc()))).scalars().first()
                if s3_task is None:
                    print("Could not find object_storage_ingestion task in DB - please create one")
                else:
                    ingestor = TASK_CLASS(rp)
                    await ingestor.run(s3_task, session, rp, lock)

            finally:
                try:
                    await lock.release()
                except LockNotOwnedError:
                    print(f'Failed to release redis lock')

    engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_it())


############
# Code for creating csv file to be used for S3 integration

# from deepchecks.tabular import Dataset
# from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction
#
# # Load Data
# # =========
# n_of_samples = 1000
# train, test = cast(tuple[Dataset, Dataset], load_data(data_size=n_of_samples))
# train_pred, test_pred = load_pre_calculated_prediction(data_size=n_of_samples)
#
# import time
# from typing import *
#
# import csv
# import pandas as pd
# import numpy as np
#
# # Generate production data that will be uploaded to the S3
# # ========================================================
# timestamp, label = '_dc_time', 'price'
# df = test.data
# now = int(time.time())
#
# # 3 days up to today
# start_time = now - 86400 * 3
# df[timestamp] = np.sort((np.random.rand(len(test)) * (now - start_time)) + start_time)
# df[timestamp] = df[timestamp].apply(lambda x: pd.Timestamp(x, unit='s'))
# timestamp_col = df[timestamp].astype(int) // 10 ** 9 # Convert to second-based epoch time
#
# df = df.drop('price', axis=1)
# df['_dc_prediction'] = test_pred
# df = df.reset_index()
# df = df.rename(columns={"index": "_dc_sample_id"})
#
# df.to_csv('2023-06-15T00:00:00.csv', index=False)
# print("finished writing csv file")

############