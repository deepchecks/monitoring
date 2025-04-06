from redis.asyncio import Redis as AsyncRedis
from redis.asyncio import RedisCluster as AsyncRedisCluster
from redis.backoff import ExponentialBackoff
from redis.exceptions import RedisClusterException
from redis.retry import Retry

from deepchecks_monitoring.config import RedisSettings


def create_settings_dict(redis_settings: RedisSettings):
    """Create redis settings param dict"""
    settings = redis_settings.dict()
    uri = settings.pop("redis_uri")

    return dict(
        url=uri,
        **settings,
        retry=Retry(ExponentialBackoff(), 6),
    )


async def init_async_redis(redis_settings: RedisSettings):
    """Initialize redis connection."""
    settings = create_settings_dict(redis_settings)
    try:
        redis = AsyncRedisCluster.from_url(cluster_error_retry_attempts=2, **settings)
        await redis.ping()
        return redis
    except RedisClusterException:
        return AsyncRedis.from_url(**settings)
