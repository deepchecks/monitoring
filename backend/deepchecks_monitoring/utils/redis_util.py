import redis.exceptions as redis_exceptions
from redis.asyncio import Redis as AsyncRedis
from redis.asyncio import RedisCluster as AsyncRedisCluster
from redis.backoff import ExponentialBackoff
from redis.retry import Retry

from deepchecks_monitoring.config import RedisSettings


redis_exceptions_tuple = tuple(  # Get all exception classes from redis.exceptions
    cls for _, cls in vars(redis_exceptions).items()
    if isinstance(cls, type) and issubclass(cls, Exception)
)


def create_settings_dict(redis_settings: RedisSettings):
    """Create redis settings param dict"""
    settings = redis_settings.dict()
    uri = settings.pop("redis_uri")

    return dict(
        url=uri,
        **settings,
        retry=Retry(ExponentialBackoff(), 6),
        retry_on_error=redis_exceptions_tuple
    )


async def init_async_redis(redis_settings: RedisSettings):
    """Initialize redis connection."""
    settings = create_settings_dict(redis_settings)
    try:
        redis = AsyncRedisCluster.from_url(cluster_error_retry_attempts=2, **settings)
        await redis.ping()
        return redis
    except redis_exceptions.RedisClusterException:
        return AsyncRedis.from_url(**settings)
