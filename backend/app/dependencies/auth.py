from typing import List, Optional
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.cache import is_token_blacklisted
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import User


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    edupulse_auth_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extracts and validates JWT Bearer token from Header or Cookie.
    Verifies signature, expiration, Redis blacklist, and DB user status.
    """
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]
    elif edupulse_auth_token:
        raw_token = edupulse_auth_token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated or unenrolled. Contact administration.",
        )

    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.user_type not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {self.allowed_roles}",
            )
        return current_user


def require_permissions(required_permissions: List[str]):
    """
    Dependency that enforces standard granular permissions across roles.
    """
    from app.core.permissions import PermissionChecker
    checker = PermissionChecker(required_permissions)

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        return checker(current_user)

    return dependency


async def get_current_teacher(
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> TeacherProfile:
    """Verifies teacher status and returns TeacherProfile with assignments."""
    stmt = (
        select(TeacherProfile)
        .options(selectinload(TeacherProfile.assignments))
        .where(TeacherProfile.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile and current_user.user_type == "teacher":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile record not found.",
        )
    return profile


async def get_current_student(
    current_user: User = Depends(RoleChecker(["student", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> StudentProfile:
    """Verifies student status and returns StudentProfile with active enrollment."""
    stmt = (
        select(StudentProfile)
        .options(selectinload(StudentProfile.enrollments))
        .where(StudentProfile.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile and current_user.user_type == "student":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found.",
        )
    return profile


async def get_current_parent_wards(
    current_user: User = Depends(RoleChecker(["parent", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> List[str]:
    """Returns list of student profile IDs linked to this parent."""
    if current_user.user_type in ["super_admin", "admin"]:
        return []  # Admins have global access

    stmt = select(ParentChildLink.student_profile_id).where(
        ParentChildLink.parent_user_id == current_user.id
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]
