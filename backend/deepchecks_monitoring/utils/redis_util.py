from redis.asyncio import Redis as AsyncRedis
from redis.asyncio import RedisCluster as AsyncRedisCluster
from redis.backoff import ExponentialBackoff
from redis.exceptions import RedisClusterException
from redis.retry import Retry

from deepchecks_monitoring.config import RedisSettings


def create_settings_dict(redis_settings: RedisSettings):
    """Create redis settings param dict"""

    return dict(
        url=redis_settings.redis_uri,
        decode_responses=redis_settings.decode_responses,
        socket_connect_timeout=redis_settings.socket_connect_timeout,
        socket_timeout=redis_settings.socket_timeout,
        socket_keepalive=redis_settings.socket_keepalive,
        retry=Retry(ExponentialBackoff(), redis_settings.retry_attempts),
    )


async def init_async_redis(redis_settings: RedisSettings | None = None):
    """Initialize redis connection."""
    redis_settings = redis_settings or RedisSettings()
    settings = create_settings_dict(redis_settings)
    try:
        redis = AsyncRedisCluster.from_url(
            cluster_error_retry_attempts=redis_settings.cluster_error_retry_attempts,
            **settings
        )
        await redis.ping()
        return redis
    except RedisClusterException:
        return AsyncRedis.from_url(**settings)
