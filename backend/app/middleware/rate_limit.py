import re
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.rate_limit import check_rate_limit
from app.core.security import decode_access_token

TIER1_PATTERNS = [
    re.compile(r"^/api/v1/auth/login$"),
    re.compile(r"^/api/v1/auth/forgot-password$"),
    re.compile(r"^/api/v1/exams/verify-pin$"),
]

TIER2_PATTERNS = [
    re.compile(r"^/api/v1/attendance/sections/[^/]+$"),
    re.compile(r"^/api/v1/examinations/marks$"),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip health endpoints and CORS preflights
        if request.method == "OPTIONS" or request.url.path.startswith("/health") or request.url.path.startswith("/api/v1/health"):
            return await call_next(request)

        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()
        auth_header = request.headers.get("Authorization")
        user_id = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")

        path = request.url.path
        method = request.method

        # Determine rate limit tier
        is_tier1 = any(p.match(path) for p in TIER1_PATTERNS)
        is_tier2 = (method in ("POST", "PUT", "PATCH")) and any(p.match(path) for p in TIER2_PATTERNS)

        if is_tier1:
            tier = "tier1_auth"
            limit = 5
            window = 900  # 15 minutes
            identifier = f"{client_ip}:{path}"
        elif is_tier2 and user_id:
            tier = "tier2_bulk"
            limit = 30
            window = 60
            identifier = user_id
        elif user_id:
            tier = "tier3_general"
            limit = 120
            window = 60
            identifier = user_id
        else:
            # Unauthenticated guest general endpoints
            tier = "tier_guest"
            limit = 60
            window = 60
            identifier = client_ip

        allowed, remaining, retry_after = await check_rate_limit(
            key_prefix=tier,
            identifier=identifier,
            limit=limit,
            window_seconds=window,
        )

        if not allowed:
            request_id = getattr(request.state, "request_id", "req-unknown")
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Please wait {retry_after} seconds before retrying.",
                        "details": {"retry_after": retry_after},
                        "request_id": request_id,
                    },
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(retry_after),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
