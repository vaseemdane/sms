import time
import uuid
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.core.redis import close_redis_client, get_redis_client
from app.core.database import engine
from app.db.session import get_db
from app.middleware.audit import AuditLogMiddleware
from app.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Application starting", app_name=settings.APP_NAME, env=settings.APP_ENV)
    yield
    # Shutdown
    logger.info("Shutting down resources...")
    await close_redis_client()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS Middleware (strict origin control)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Audit Log Middleware
app.add_middleware(AuditLogMiddleware)


@app.middleware("http")
async def add_correlation_and_process_time(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time = time.perf_counter() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "frame-ancestors 'none';"
    )
    if settings.APP_ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "req-unknown")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "details": None,
                "request_id": request_id,
            },
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "req-unknown")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check your payload.",
                "details": exc.errors(),
                "request_id": request_id,
            },
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    request_id = getattr(request.state, "request_id", "req-unknown")
    logger.warning("Database integrity constraint violation", error=str(exc), request_id=request_id)
    msg = "A record with this identifier, email, phone number, or code already exists."
    err_str = str(exc).lower()
    if "ix_users_email" in err_str or "unique constraint \"users_email_key\"" in err_str:
        msg = "A user account with this email address already exists."
    elif "ix_users_username" in err_str or "unique constraint \"users_username_key\"" in err_str:
        msg = "A user account with this mobile number or username already exists."
    elif "ix_users_code" in err_str or "unique constraint \"users_code_key\"" in err_str:
        msg = "A record with this admission or employee code already exists."
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "success": False,
            "error": {
                "code": "CONFLICT_ERROR",
                "message": msg,
                "details": None,
                "request_id": request_id,
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "req-unknown")
    logger.exception("Unhandled server exception", error=str(exc), request_id=request_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact system support.",
                "details": None,
                "request_id": request_id,
            },
        },
    )


# Health Endpoints
@app.get("/health", tags=["System Health"])
@app.get("/health/live", tags=["System Health"])
@app.get("/api/v1/health", tags=["System Health"])
@app.get("/api/v1/health/live", tags=["System Health"])
async def liveness():
    """Liveness probe: returns 200 if process is running."""
    return {"status": "ok", "timestamp": time.time()}


@app.get("/ready", tags=["System Health"])
@app.get("/health/ready", tags=["System Health"])
@app.get("/api/v1/health/ready", tags=["System Health"])
async def readiness(db: AsyncSession = Depends(get_db)):
    """Readiness probe: validates database and redis connectivity."""
    db_ok = False
    redis_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        r = get_redis_client()
        redis_ok = await r.ping()
    except Exception:
        pass

    if not db_ok or not redis_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "connected" if db_ok else "disconnected",
                "redis": "connected" if redis_ok else "disconnected",
            },
        )

    return {
        "status": "ready",
        "database": "connected",
        "redis": "connected",
        "environment": settings.APP_ENV,
    }


# Mount API V1
app.include_router(api_router, prefix=settings.API_V1_STR)
