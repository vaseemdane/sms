import time
from typing import Tuple
from app.core.redis import close_redis_client, get_redis_client

# Atomic sliding window rate limiter Lua script
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window) + 5)
    return {1, limit - currentRequests - 1, 0}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = 1
    if #oldest > 0 then
        retryAfter = math.max(1, math.ceil(window - (now - tonumber(oldest[2]))))
    end
    return {0, 0, retryAfter}
end
"""

_script_sha = None
_circuit_open_until = 0.0


async def check_rate_limit(
    key_prefix: str,
    identifier: str,
    limit: int,
    window_seconds: int = 60,
) -> Tuple[bool, int, int]:
    """
    Sliding-window rate limiter via Redis Lua script.
    Fails open with a circuit breaker if Redis is unavailable.
    """
    global _script_sha, _circuit_open_until
    now = time.time()
    if now < _circuit_open_until:
        return True, limit, 0

    try:
        r = get_redis_client()
        key = f"rate_limit:{key_prefix}:{identifier}"

        if _script_sha is None:
            _script_sha = await r.script_load(SLIDING_WINDOW_LUA)

        try:
            res = await r.evalsha(_script_sha, 1, key, now, window_seconds, limit)
        except Exception:
            # If script evicted, fallback to eval
            res = await r.eval(SLIDING_WINDOW_LUA, 1, key, now, window_seconds, limit)

        allowed = bool(res[0])
        remaining = int(res[1])
        retry_after = int(res[2])
        return allowed, remaining, retry_after
    except Exception:
        # Trip circuit breaker for 10s to prevent request latency pileups on Redis outage
        _circuit_open_until = time.time() + 10.0
        return True, limit, 0
