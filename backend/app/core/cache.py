import asyncio
import json
import random
from typing import Any, Callable, Optional
from app.core.redis import get_redis_client


class CacheService:
    @staticmethod
    def build_key(domain: str, entity_id: str, sub_resource: str = "default") -> str:
        """Enforces versioned namespace: edupulse:v1:{domain}:{entity_id}:{sub_resource}"""
        return f"edupulse:v1:{domain}:{entity_id}:{sub_resource}"

    @staticmethod
    def add_jitter(base_ttl: int, max_jitter_seconds: int = 900) -> int:
        """Adds random jitter to base TTL to prevent synchronized cache expiration."""
        return base_ttl + random.randint(0, max_jitter_seconds)

    @staticmethod
    async def get(key: str) -> Optional[Any]:
        try:
            r = get_redis_client()
            val = await r.get(key)
            if val:
                return json.loads(val)
            return None
        except Exception:
            return None

    @staticmethod
    async def set(key: str, value: Any, ttl_seconds: int = 300, jitter: int = 0) -> bool:
        try:
            r = get_redis_client()
            final_ttl = CacheService.add_jitter(ttl_seconds, jitter) if jitter > 0 else ttl_seconds
            serialized = json.dumps(value, default=str)
            await r.setex(key, final_ttl, serialized)
            return True
        except Exception:
            return False

    @staticmethod
    async def delete(key: str) -> bool:
        try:
            r = get_redis_client()
            await r.unlink(key)
            return True
        except Exception:
            return False

    @staticmethod
    async def invalidate_pattern(pattern: str) -> int:
        """
        Uses non-blocking SCAN + UNLINK (never blocking KEYS or DEL)
        to safely invalidate distributed cache keys under high concurrency.
        """
        try:
            r = get_redis_client()
            cursor = 0
            unlinked_count = 0
            while True:
                cursor, keys = await r.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    await r.unlink(*keys)
                    unlinked_count += len(keys)
                if cursor == 0:
                    break
            return unlinked_count
        except Exception:
            return 0

    @staticmethod
    async def get_or_compute(
        key: str,
        compute_fn: Callable[[], Any],
        ttl_seconds: int = 300,
        jitter: int = 60,
        lock_timeout_ms: int = 5000,
    ) -> Any:
        """
        Cache Stampede Prevention:
        If cache misses, acquires a Redis distributed lock (SET NX PX) so only 1 worker
        queries PostgreSQL while concurrent requests wait and read the populated cache.
        """
        cached = await CacheService.get(key)
        if cached is not None:
            return cached

        r = get_redis_client()
        lock_key = f"lock:{key}"

        # Attempt to acquire lock
        try:
            acquired = await r.set(lock_key, "1", nx=True, px=lock_timeout_ms)
        except Exception:
            acquired = True

        if acquired:
            try:
                # Double check cache inside lock
                cached = await CacheService.get(key)
                if cached is not None:
                    return cached
                
                # Compute value
                result = await compute_fn()
                await CacheService.set(key, result, ttl_seconds=ttl_seconds, jitter=jitter)
                return result
            finally:
                try:
                    await r.unlink(lock_key)
                except Exception:
                    pass
        else:
            # Another worker is computing, poll with backoff up to 2.5s
            for _ in range(10):
                await asyncio.sleep(0.25)
                cached = await CacheService.get(key)
                if cached is not None:
                    return cached
            # Fallback compute if lock owner died
            return await compute_fn()


# Helper aliases for backwards compatibility
cache_get = CacheService.get
cache_set = CacheService.set
cache_delete = CacheService.delete
cache_delete_pattern = CacheService.invalidate_pattern


async def blacklist_token(jti: str, ttl_seconds: int) -> bool:
    """Adds an access token JTI to Redis blacklist."""
    try:
        r = get_redis_client()
        await r.setex(f"blacklist:{jti}", ttl_seconds, "revoked")
        return True
    except Exception:
        return False


async def is_token_blacklisted(jti: str) -> bool:
    """Checks if an access token JTI has been revoked."""
    try:
        r = get_redis_client()
        val = await r.get(f"blacklist:{jti}")
        return val is not None
    except Exception:
        return False
