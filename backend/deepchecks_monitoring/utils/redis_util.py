from redis.asyncio import Redis, RedisCluster
from redis.exceptions import RedisClusterException

from deepchecks_monitoring.config import RedisSettings


async def init_async_redis(redis_settings: RedisSettings):
    """Initialize redis connection."""
    settings = redis_settings.dict()
    uri = settings.pop('redis_uri')
    try:
        redis = RedisCluster.from_url(uri, **settings)
        await redis.ping()
        return redis
    except RedisClusterException:
        return Redis.from_url(uri, **settings)
