from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
            socket_timeout=1.0,
            socket_connect_timeout=1.0,
        )
    return _redis_client


async def close_redis_client():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
