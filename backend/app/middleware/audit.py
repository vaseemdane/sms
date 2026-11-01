import json
import uuid
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
from app.core.security import decode_access_token
from app.core.database import AsyncSessionLocal
from app.models.communication import AuditLog

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
AUDITED_PREFIXES = ("/api/v1/attendance", "/api/v1/examinations", "/api/v1/fees", "/api/v1/admin/users", "/api/v1/admin/students")


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method not in AUDITED_METHODS or not any(request.url.path.startswith(p) for p in AUDITED_PREFIXES):
            return await call_next(request)

        # Extract actor if available
        auth_header = request.headers.get("Authorization")
        actor_id: Optional[str] = None
        if auth_header and auth_header.startswith("Bearer "):
            payload = decode_access_token(auth_header[7:])
            if payload:
                actor_id = payload.get("sub")

        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()
        user_agent = request.headers.get("User-Agent", "unknown")

        response = await call_next(request)

        # Only audit successful state mutations (2xx status codes)
        if 200 <= response.status_code < 300:
            try:
                path_parts = [p for p in request.url.path.strip("/").split("/") if p]
                target_type = path_parts[2] if len(path_parts) > 2 else "unknown"
                target_id = path_parts[3] if len(path_parts) > 3 else "batch"

                async with AsyncSessionLocal() as db:
                    audit_entry = AuditLog(
                        id=f"aud-{uuid.uuid4().hex[:16]}",
                        actor_user_id=actor_id,
                        action=f"{request.method} {request.url.path}",
                        target_type=target_type,
                        target_id=target_id,
                        ip_address=client_ip,
                        user_agent=user_agent,
                        request_id=request_id,
                        details={
                            "method": request.method,
                            "path": request.url.path,
                            "status_code": response.status_code,
                        },
                    )
                    db.add(audit_entry)
                    await db.commit()
            except Exception:
                # Do not disrupt request response if audit log insertion fails
                pass

        return response
