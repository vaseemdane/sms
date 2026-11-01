import secrets
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import blacklist_token
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    generate_blind_index,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)
from app.core.auth_utils import normalize_dob_ddmmyyyy
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.student import StudentProfile
from app.models.user import RefreshToken, User
from app.schemas.auth import (
    AuthResponseData,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    ResetPasswordRequest,
    UserSummary,
)
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[AuthResponseData])
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Rate limiting
    allowed, remaining, retry_after = await check_rate_limit("login", client_ip, limit=5, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    clean_id = payload.identifier.strip().lower()
    phone_blind = generate_blind_index(clean_id)

    # Query by email, username, phone blind index, unencrypted phone, or student admission number
    conds = [
        User.email.ilike(clean_id),
        User.username.ilike(clean_id),
        StudentProfile.admission_number.ilike(clean_id),
    ]
    if phone_blind:
        conds.append(User.phone_hash == phone_blind)
    # Check phone directly if numeric
    if clean_id.replace("+", "").replace("-", "").isdigit():
        conds.append(User.phone == clean_id)
        # Also stripped 10 digits
        digits_only = "".join(filter(str.isdigit, clean_id))
        if len(digits_only) == 10:
            conds.append(User.username == digits_only)
            conds.append(User.phone == digits_only)
            conds.append(User.phone == f"+91 {digits_only}")
            conds.append(User.phone == f"+91{digits_only}")

    user = None
    try:
        stmt = (
            select(User)
            .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
            .where(or_(*conds))
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
    except Exception:
        user = None

    # Password Verification
    is_valid_password = False
    if user:
        is_valid_password = verify_password(payload.password, user.password_hash)

    if not user or not is_valid_password:
        # Prevent account enumeration via timing-safe uniform message
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your identifier and password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the Super Admin.",
        )

    # Issue tokens with role, tenant, and first login claims
    role_upper = user.user_type.upper()
    access_token, jti, expire_dt = create_access_token(
        subject=user.id,
        role=role_upper,
        extra_claims={
            "user_id": user.id,
            "role": role_upper,
            "school_id": user.school_id,
            "is_first_login": user.must_change_password,
        },
    )
    raw_refresh_token, token_hash, rf_expire = create_refresh_token(
        user_id=user.id,
        remember_me=payload.remember_me,
    )

    # Store refresh token hash in DB
    try:
        db_refresh = RefreshToken(
            id=secrets.token_hex(16),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=rf_expire,
        )
        session_expire_days = 30 if payload.remember_me else 7
        db.add(db_refresh)
        await db.commit()
    except Exception:
        pass

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="edupulse_auth_token",
        value=access_token,
        max_age=session_expire_days * 86400,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        path="/",
    )

    user_summary = UserSummary(
        id=user.id,
        name=user.name,
        email=user.email,
        username=user.username,
        userType=user.user_type,
        school_id=user.school_id,
        schoolId=user.school_id,
        phone=user.phone,
        gender=user.gender,
        bloodGroup=user.blood_group,
        dob=user.dob,
        state=user.state,
        district=user.district,
        address=user.address,
        photo_url=user.photo_url,
        photo=user.photo_url,
        code=user.code,
        mustChangePassword=user.must_change_password,
        active=user.is_active,
    )

    return ApiResponse(
        success=True,
        message="Authentication successful.",
        data=AuthResponseData(
            user=user_summary,
            token=access_token,
            role=role_upper,
            refreshToken=raw_refresh_token,
            expiresAt=int(expire_dt.timestamp() * 1000),
            mustChangePassword=user.must_change_password,
            user_id=user.id,
            school_id=user.school_id,
            is_first_login=user.must_change_password,
        ),
    )


@router.post("/refresh", response_model=ApiResponse[AuthResponseData])
async def refresh_token(
    payload: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hash_refresh_token(payload.refresh_token)
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash,
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc),
    )
    result = await db.execute(stmt)
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_stmt = select(User).where(User.id == stored_token.user_id, User.is_active == True)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account inactive.")

    # Refresh token rotation (OWASP API guidance: revoke used refresh token)
    stored_token.is_revoked = True

    new_access_token, new_jti, new_exp = create_access_token(user.id, user.user_type)
    new_raw_refresh, new_hash, new_rf_exp = create_refresh_token(user.id)

    new_db_rf = RefreshToken(
        id=secrets.token_hex(16),
        user_id=user.id,
        token_hash=new_hash,
        expires_at=new_rf_exp,
    )
    db.add(new_db_rf)
    await db.commit()

    response.set_cookie(
        key="edupulse_auth_token",
        value=new_access_token,
        max_age=7 * 86400,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        path="/",
    )

    user_summary = UserSummary(
        id=user.id,
        name=user.name,
        email=user.email,
        username=user.username,
        userType=user.user_type,
        mustChangePassword=user.must_change_password,
        active=user.is_active,
    )

    return ApiResponse(
        success=True,
        data=AuthResponseData(
            user=user_summary,
            token=new_access_token,
            role=user.user_type,
            refreshToken=new_raw_refresh,
            expiresAt=int(new_exp.timestamp() * 1000),
            mustChangePassword=user.must_change_password,
        ),
    )


@router.post("/logout", response_model=ApiResponse[bool])
async def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Blacklist current access token in Redis
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        decoded = decode_access_token(token)
        if decoded and "jti" in decoded:
            await blacklist_token(decoded["jti"], ttl_seconds=1800)

    # Revoke refresh token if provided
    if payload and payload.refresh_token:
        h = hash_refresh_token(payload.refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == h)
        res = await db.execute(stmt)
        rf = res.scalar_one_or_none()
        if rf:
            rf.is_revoked = True
            await db.commit()

    response.delete_cookie("edupulse_auth_token", path="/")
    return ApiResponse(success=True, data=True, message="Successfully logged out.")


@router.post("/password-change", response_model=ApiResponse[bool])
@router.post("/change-password", response_model=ApiResponse[bool])
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    current_user.password_changed_at = datetime.now(timezone.utc)

    # Invalidate all active refresh tokens for this user
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id, RefreshToken.is_revoked == False)
        .values(is_revoked=True)
    )
    await db.commit()

    return ApiResponse(success=True, data=True, message="Password updated successfully.")


@router.get("/me", response_model=ApiResponse[UserSummary])
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.refresh(current_user)
    return ApiResponse(
        success=True,
        data=UserSummary(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            username=current_user.username,
            userType=current_user.user_type,
            phone=current_user.phone,
            gender=current_user.gender,
            bloodGroup=current_user.blood_group,
            dob=current_user.dob,
            state=current_user.state,
            district=current_user.district,
            address=current_user.address,
            photo_url=current_user.photo_url,
            photo=current_user.photo_url,
        ),
        message="Profile fetched successfully.",
    )


@router.put("/profile", response_model=ApiResponse[UserSummary])
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.name:
        current_user.name = payload.name.strip()
    if payload.phone:
        current_user.phone = payload.phone.strip()
        current_user.phone_hash = generate_blind_index(payload.phone.strip())
    if payload.address is not None:
        current_user.address = payload.address.strip()
    if payload.gender:
        current_user.gender = payload.gender
    if payload.bloodGroup:
        current_user.blood_group = payload.bloodGroup
    if payload.dob:
        current_user.dob = payload.dob
    if payload.district:
        current_user.district = payload.district
    if payload.state:
        current_user.state = payload.state
    if payload.photo_url is not None:
        current_user.photo_url = payload.photo_url
    elif payload.photo is not None:
        current_user.photo_url = payload.photo

    await db.commit()
    await db.refresh(current_user)

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            username=current_user.username,
            userType=current_user.user_type,
            phone=current_user.phone,
            gender=current_user.gender,
            bloodGroup=current_user.blood_group,
            dob=current_user.dob,
            state=current_user.state,
            district=current_user.district,
            address=current_user.address,
            photo_url=current_user.photo_url,
            photo=current_user.photo_url,
        ),
        message="Profile updated successfully.",
    )

