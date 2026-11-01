import secrets
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth_utils import (
    generate_secure_random_password,
    generate_teacher_password,
    normalize_dob_ddmmyyyy,
)
from app.core.india_geo import validate_state_and_district
from app.core.security import generate_blind_index, get_password_hash
from app.db.session import get_db
from app.dependencies.auth import RoleChecker
from app.models.academic import AcademicYear, Class, Section, Subject
from app.models.attendance import Attendance
from app.models.school import School
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import RefreshToken, User
from app.schemas.auth import (
    CreatePrincipalRequest,
    CreateStudentRequest,
    CreateTeacherRequest,
    PrincipalHandoverRequest,
    PrincipalResetPasswordRequest,
    PrincipalUpdateRequest,
    UserSummary,
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta

router = APIRouter(prefix="/admin", tags=["Super Admin"])


@router.get("/dashboard/stats", response_model=ApiResponse[Dict])
async def get_admin_dashboard_stats(
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    # Active Academic Session
    curr_year = (await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalar_one_or_none()
    active_year_id = curr_year.id if curr_year else "ay-2026-2027"
    active_year_name = curr_year.name if curr_year else "2026–2027"

    # Enrolled students in current active session
    enrolled_stmt = select(func.count(func.distinct(StudentEnrollment.student_id))).where(
        StudentEnrollment.academic_year_id == active_year_id,
        StudentEnrollment.status == "ACTIVE"
    )
    total_enrolled = (await db.scalar(enrolled_stmt)) or 0
    total_students_all = (await db.scalar(select(func.count(StudentProfile.id)))) or 0
    total_students = total_enrolled if total_enrolled > 0 else total_students_all

    total_teachers = (await db.scalar(select(func.count(func.distinct(TeacherProfile.id))))) or 0
    total_classes = (await db.scalar(select(func.count(Class.id)).where(Class.is_active == True))) or 0
    total_sections = (await db.scalar(select(func.count(Section.id)).where(Section.is_active == True))) or 0
    total_users = (await db.scalar(select(func.count(User.id)))) or 0

    # Grouped Subject Faculty & Enrolled Student statistics (avoiding N+1 queries)
    sub_stmt = (
        select(
            Subject.name,
            func.min(Subject.id).label("id"),
            func.min(Subject.code).label("code"),
            func.count(Subject.id).label("class_count"),
        )
        .group_by(Subject.name)
        .order_by(Subject.name)
    )
    sub_res = (await db.execute(sub_stmt)).all()

    fac_stmt = (
        select(
            Subject.name,
            func.count(func.distinct(TeacherAssignment.teacher_id)).label("faculty_count"),
        )
        .join(TeacherAssignment, TeacherAssignment.subject_id == Subject.id)
        .where(
            or_(
                TeacherAssignment.academic_year_id == active_year_id,
                TeacherAssignment.academic_year_id.is_(None)
            )
        )
        .group_by(Subject.name)
    )
    fac_res = dict((await db.execute(fac_stmt)).all())

    stu_stmt = (
        select(
            Subject.name,
            func.count(func.distinct(StudentEnrollment.student_id)).label("enrolled_count"),
        )
        .join(Class, Class.id == Subject.class_id)
        .join(StudentEnrollment, StudentEnrollment.class_id == Class.id)
        .where(
            StudentEnrollment.academic_year_id == active_year_id,
            StudentEnrollment.status == "ACTIVE"
        )
        .group_by(Subject.name)
    )
    stu_res = dict((await db.execute(stu_stmt)).all())

    subject_statistics = []
    for s_name, s_id, s_code, class_count in sub_res:
        prefix = s_code.split("-")[0] if s_code and "-" in s_code else (s_code or "")
        display_code = f"{prefix} (All {class_count} Classes)" if class_count > 1 else (s_code or "")
        subject_statistics.append({
            "subject_id": s_id,
            "subject_name": s_name,
            "code": display_code,
            "faculty_count": int(fac_res.get(s_name, 0)),
            "enrolled_student_count": int(stu_res.get(s_name, 0)),
        })

    return ApiResponse(
        success=True,
        data={
            "welcome_name": current_user.name or "Administrator",
            "active_session": active_year_name,
            "totalStudents": total_students,
            "totalTeachers": total_teachers,
            "totalClasses": total_classes,
            "totalSections": total_sections,
            "totalUsers": total_users,
            "systemStatus": "Operational",
            "subject_statistics": subject_statistics,
        },
    )


@router.get("/users", response_model=ApiResponse[PaginatedResponse[UserSummary]])
async def get_users_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if current_user.user_type == "admin" and current_user.school_id:
        stmt = stmt.where(User.school_id == current_user.school_id)
    if role:
        stmt = stmt.where(User.user_type == role)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(User.name.ilike(s) | User.email.ilike(s) | User.username.ilike(s))

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(stmt)).scalars().all()

    teacher_user_ids = [u.id for u in users if u.user_type == "teacher"]
    teacher_map = {}
    if teacher_user_ids:
        tp_stmt = (
            select(TeacherProfile)
            .options(
                selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.section),
                selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.subject),
                selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.parent_class),
            )
            .where(TeacherProfile.user_id.in_(teacher_user_ids))
        )
        tp_res = await db.execute(tp_stmt)
        for tp in tp_res.scalars().all():
            teacher_map[tp.user_id] = tp

    items = []
    for u in users:
        tp = teacher_map.get(u.id)
        assigned_ct = None
        assigned_subs = []
        if tp and tp.assignments:
            for a in tp.assignments:
                if a.assignment_type == "CLASS_TEACHER" and a.section:
                    c_name = a.parent_class.name if a.parent_class else "Class"
                    assigned_ct = f"{c_name} ({a.section.code})"
                elif a.assignment_type == "SUBJECT_TEACHER" and a.subject and a.section:
                    c_name = a.parent_class.name if a.parent_class else "Class"
                    assigned_subs.append(f"{a.subject.name} - {c_name} ({a.section.code})")

        items.append(
            UserSummary(
                id=u.id,
                name=u.name,
                email=u.email,
                username=u.username,
                userType=u.user_type,
                school_id=u.school_id,
                schoolId=u.school_id,
                phone=u.phone,
                gender=u.gender,
                bloodGroup=u.blood_group,
                dob=u.dob,
                state=u.state,
                district=u.district,
                address=u.address,
                code=u.code or (tp.employee_code if tp else None),
                subjectSpecialization=tp.specialization if tp and tp.specialization else "General Faculty",
                assignedClassTeacher=assigned_ct,
                assignedSubjects=assigned_subs,
                createdAt=u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else None,
                mustChangePassword=u.must_change_password,
                active=u.is_active,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return ApiResponse(
        success=True,
        data=PaginatedResponse(
            items=items,
            meta=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total or 0,
                total_pages=total_pages,
            ),
        ),
    )


@router.get("/principal", response_model=ApiResponse[Optional[UserSummary]])
async def get_active_principal(
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.user_type == "principal", User.is_active == True)
    if current_user.user_type == "admin" and current_user.school_id:
        stmt = stmt.where(User.school_id == current_user.school_id)
    principal = (await db.execute(stmt)).scalars().first()
    if not principal:
        return ApiResponse(success=True, data=None, message="No active Principal found.")

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=principal.id,
            name=principal.name,
            email=principal.email,
            username=principal.username,
            userType=principal.user_type,
            school_id=principal.school_id,
            schoolId=principal.school_id,
            phone=principal.phone,
            code=principal.code,
            mustChangePassword=principal.must_change_password,
            active=principal.is_active,
        ),
    )


@router.post("/users/principal", response_model=ApiResponse[UserSummary])
async def create_principal(
    payload: CreatePrincipalRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a Principal account. Enforces strictly ONE active Principal rule."""
    school = await db.get(School, payload.school_id) if payload.school_id else None

    # Check if an active Principal already exists
    existing_stmt = select(User).where(User.user_type == "principal", User.is_active == True)
    if payload.school_id:
        existing_stmt = existing_stmt.where(or_(User.school_id == payload.school_id, User.school_id.is_(None)))
    existing_principal = (await db.execute(existing_stmt)).scalars().first()

    if existing_principal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active Principal already exists ({existing_principal.name} - {existing_principal.email}). Use Edit or Handover to replace.",
        )

    # Check if user with this email or username already exists
    email_clean = payload.email.lower()
    uname = (payload.username or email_clean.split("@")[0]).lower()
    dup = (await db.execute(select(User).where(or_(User.email == email_clean, User.username == uname)))).scalars().first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{payload.email}' or username '{uname}' already exists.",
        )

    user_id = f"usr-{secrets.token_hex(8)}"
    hashed = get_password_hash(payload.password)
    phone_clean = payload.phone.strip() if payload.phone else None
    phone_hash = generate_blind_index(phone_clean) if phone_clean else None

    new_user = User(
        id=user_id,
        name=payload.name,
        email=email_clean,
        username=uname,
        password_hash=hashed,
        user_type="principal",
        phone=phone_clean,
        phone_hash=phone_hash,
        school_id=payload.school_id,
        state=school.state if school else "Karnataka",
        district=school.city if school else "Bengaluru Urban",
        code=f"EDP/PRIN/{secrets.token_hex(3).upper()}",
        must_change_password=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            username=new_user.username,
            userType=new_user.user_type,
            school_id=new_user.school_id,
            schoolId=new_user.school_id,
            phone=new_user.phone,
            code=new_user.code,
            mustChangePassword=True,
            active=True,
        ),
        message="Principal account created successfully.",
    )


@router.post("/principal/handover", response_model=ApiResponse[UserSummary])
async def handover_principal(
    payload: PrincipalHandoverRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Controlled atomic handover: Deactivates current Principal and activates new Principal."""
    s_name = (payload.name or payload.successor_name or "").strip()
    s_email = (payload.email or payload.successor_email or "").strip().lower()
    s_password = (payload.password or payload.successor_password or "").strip()
    s_username = ((payload.username or payload.successor_username or s_email.split("@")[0])).strip().lower()
    s_phone = (payload.phone or payload.successor_phone)
    s_phone_clean = s_phone.strip() if s_phone else None
    s_phone_hash = generate_blind_index(s_phone_clean) if s_phone_clean else None
    target_school_id = payload.school_id or "sch-main"

    if not s_name or not s_email or not s_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Successor name, email, and initial password are required.",
        )

    school = await db.get(School, target_school_id)

    # 1. Locate current active principal
    active_stmt = select(User).where(User.user_type == "principal", User.is_active == True)
    if target_school_id:
        active_stmt = active_stmt.where(or_(User.school_id == target_school_id, User.school_id.is_(None)))
    current_principal = (await db.execute(active_stmt)).scalars().first()

    # 2. Check if a user with successor email exists
    user_stmt = select(User).where(User.email == s_email)
    existing_user = (await db.execute(user_stmt)).scalars().first()

    # Case A: Successor email is the exact same user as the current active principal
    if existing_user and current_principal and existing_user.id == current_principal.id:
        current_principal.name = s_name
        current_principal.password_hash = get_password_hash(s_password)
        if s_phone_clean:
            current_principal.phone = s_phone_clean
            current_principal.phone_hash = s_phone_hash
        current_principal.must_change_password = True
        current_principal.is_active = True
        await db.commit()
        target_user = current_principal
    else:
        # Step 3: Deactivate all other active principals for this school first to preserve partial index
        await db.execute(
            update(User)
            .where(User.user_type == "principal", User.is_active == True)
            .values(is_active=False)
        )

        # Case B: Successor email already exists as another user (e.g. promoting existing teacher/staff)
        if existing_user:
            existing_user.user_type = "principal"
            existing_user.name = s_name
            existing_user.password_hash = get_password_hash(s_password)
            if s_phone_clean:
                existing_user.phone = s_phone_clean
                existing_user.phone_hash = s_phone_hash
            existing_user.school_id = target_school_id
            existing_user.must_change_password = True
            existing_user.is_active = True
            await db.commit()
            target_user = existing_user
        else:
            # Case C: Completely new Principal account
            # Ensure unique username
            dup_un = (await db.execute(select(User).where(User.username == s_username))).scalars().first()
            if dup_un:
                s_username = f"{s_username}_{secrets.token_hex(2)}"

            new_user = User(
                id=f"usr-{secrets.token_hex(8)}",
                name=s_name,
                email=s_email,
                username=s_username,
                password_hash=get_password_hash(s_password),
                user_type="principal",
                phone=s_phone_clean,
                phone_hash=s_phone_hash,
                school_id=target_school_id,
                state=school.state if school else "Karnataka",
                district=school.city if school else "Bengaluru Urban",
                code=f"EDP/PRIN/{secrets.token_hex(3).upper()}",
                must_change_password=True,
                is_active=True,
            )
            db.add(new_user)
            await db.commit()
            target_user = new_user

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=target_user.id,
            name=target_user.name,
            email=target_user.email,
            username=target_user.username,
            userType=target_user.user_type,
            school_id=target_user.school_id,
            schoolId=target_user.school_id,
            phone=target_user.phone,
            code=target_user.code,
            mustChangePassword=True,
            active=True,
        ),
        message="Principal handover completed successfully. Previous principal deactivated, new principal active with full institutional access.",
    )


@router.put("/principal/{user_id}", response_model=ApiResponse[UserSummary])
async def update_principal(
    user_id: str,
    payload: PrincipalUpdateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    principal = await db.get(User, user_id)
    if not principal or principal.user_type != "principal":
        raise HTTPException(status_code=404, detail="Principal not found.")

    if payload.name is not None:
        principal.name = payload.name
    if payload.email is not None:
        principal.email = payload.email.lower()
    if payload.phone is not None:
        principal.phone = payload.phone.strip()
        principal.phone_hash = generate_blind_index(principal.phone)
    if payload.state is not None:
        principal.state = payload.state
    if payload.district is not None:
        principal.district = payload.district

    await db.commit()
    await db.refresh(principal)

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=principal.id,
            name=principal.name,
            email=principal.email,
            username=principal.username,
            userType=principal.user_type,
            school_id=principal.school_id,
            schoolId=principal.school_id,
            phone=principal.phone,
            code=principal.code,
            mustChangePassword=principal.must_change_password,
            active=principal.is_active,
        ),
        message="Principal profile updated successfully.",
    )


@router.post("/principal/{user_id}/reset-password", response_model=ApiResponse[bool])
async def reset_principal_password(
    user_id: str,
    payload: PrincipalResetPasswordRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    principal = await db.get(User, user_id)
    if not principal or principal.user_type != "principal":
        raise HTTPException(status_code=404, detail="Principal not found.")

    principal.password_hash = get_password_hash(payload.new_password)
    principal.must_change_password = True
    await db.commit()

    return ApiResponse(success=True, data=True, message="Principal password reset successfully.")


@router.delete("/principal", response_model=ApiResponse[bool])
async def delete_active_principal(
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin removes the current active Principal data and credentials."""
    stmt = select(User).where(User.user_type == "principal", User.is_active == True)
    if current_user.user_type == "admin" and current_user.school_id:
        stmt = stmt.where(User.school_id == current_user.school_id)
    principals = (await db.execute(stmt)).scalars().all()
    if not principals:
        return ApiResponse(success=True, data=True, message="No active Principal found to remove.")

    for p in principals:
        await db.execute(delete(RefreshToken).where(RefreshToken.user_id == p.id))
        await db.delete(p)
    await db.commit()
    return ApiResponse(success=True, data=True, message="Current Principal data and credentials removed successfully.")


@router.delete("/principal/{user_id}", response_model=ApiResponse[bool])
async def delete_principal_by_id(
    user_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin removes a Principal account and credentials by ID."""
    principal = await db.get(User, user_id)
    if not principal or principal.user_type != "principal":
        raise HTTPException(status_code=404, detail="Principal not found.")

    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await db.delete(principal)
    await db.commit()
    return ApiResponse(success=True, data=True, message="Principal account and credentials removed successfully.")


@router.post("/users/teacher", response_model=ApiResponse[UserSummary])
async def create_teacher(
    payload: CreateTeacherRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a Teacher account linked to a school_id with dynamic default password."""
    school = await db.get(School, payload.school_id)
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"School '{payload.school_id}' not found.")

    email_clean = payload.email.lower()
    uname = (payload.username or payload.email.split("@")[0]).lower()
    dup = (await db.execute(select(User).where(or_(User.email == email_clean, User.username == uname)))).scalars().first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{payload.email}' or username '{uname}' already exists.",
        )

    auto_password = generate_secure_random_password(12)
    hashed = get_password_hash(auto_password)
    user_id = f"usr-{secrets.token_hex(8)}"
    phone_clean = payload.phone.strip() if payload.phone else None
    phone_hash = generate_blind_index(phone_clean) if phone_clean else None

    state_val = payload.state or school.state or "Karnataka"
    district_val = payload.district or school.city or "Bengaluru Urban"
    if not validate_state_and_district(state_val, district_val):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"District '{district_val}' is not valid for State/UT '{state_val}'.",
        )

    new_user = User(
        id=user_id,
        name=payload.name,
        email=email_clean,
        username=uname,
        password_hash=hashed,
        user_type="teacher",
        phone=phone_clean,
        phone_hash=phone_hash,
        school_id=payload.school_id,
        state=state_val,
        district=district_val,
        code=f"EDP/TCH/{secrets.token_hex(3).upper()}",
        must_change_password=True,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    tp = TeacherProfile(
        id=f"tp-{secrets.token_hex(8)}",
        user_id=new_user.id,
        employee_code=new_user.code,
        specialization=payload.specialization or "General",
    )
    db.add(tp)
    await db.commit()

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            username=new_user.username,
            userType=new_user.user_type,
            school_id=new_user.school_id,
            schoolId=new_user.school_id,
            phone=new_user.phone,
            code=new_user.code,
            mustChangePassword=True,
            active=True,
        ),
        message=f"Teacher created for '{school.name}' with generated default password '{auto_password}'.",
    )


@router.post("/users/student", response_model=ApiResponse[UserSummary])
async def create_student(
    payload: CreateStudentRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates Student account linked to academic structure, enrollment, and guardian."""
    school = None
    if payload.school_id and payload.school_id != "sch-default":
        school = await db.get(School, payload.school_id)
    if not school:
        school = (await db.execute(select(School))).scalars().first()
    school_id = school.id if school else "sch-default"
    school_code = school.code if school else "EDP"

    raw_mobile = payload.mobile_number.strip()
    digits_mobile = "".join(filter(str.isdigit, raw_mobile))
    if len(digits_mobile) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Student mobile number must be at least 10 digits.",
        )
    mobile_10 = digits_mobile[-10:]

    dob_normalized = normalize_dob_ddmmyyyy(payload.date_of_birth)
    if len(dob_normalized) != 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Student date of birth must normalize to strict 8-digit DDMMYYYY format.",
        )

    # Active academic session resolution
    if payload.academic_year_id:
        target_year_id = payload.academic_year_id
    else:
        active_yr = (await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalar_one_or_none()
        target_year_id = active_yr.id if active_yr else "ay-2026-2027"

    user_id = f"usr-{secrets.token_hex(8)}"
    hashed_password = get_password_hash(dob_normalized)
    phone_hash = generate_blind_index(mobile_10)
    email = payload.email.lower() if payload.email else f"student.{mobile_10}@{school_code.lower()}.edu.in"
    adm_no = payload.admission_number or f"{school_code}/STU/{secrets.token_hex(3).upper()}"

    # Pre-check for duplicate user email or mobile/username
    dup = (await db.execute(select(User).where(or_(User.email == email, User.username == mobile_10)))).scalars().first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A student or user with mobile '{mobile_10}' or email '{email}' already exists.",
        )

    # Age-versus-Class Eligibility Validation
    if payload.class_id:
        target_cls = await db.get(Class, payload.class_id)
        if target_cls:
            try:
                birth_year = int(dob_normalized[4:8])
                ref_year = 2026
                calc_age = ref_year - birth_year
                class_age_limits = {
                    "cls-nursery": (3, 5),
                    "cls-lkg": (4, 6),
                    "cls-ukg": (5, 7),
                    "cls-class1": (5, 8),
                    "cls-class2": (6, 9),
                    "cls-class3": (7, 10),
                    "cls-class4": (8, 11),
                    "cls-class5": (9, 12),
                    "cls-class6": (10, 13),
                    "cls-class7": (11, 14),
                    "cls-class8": (12, 15),
                    "cls-class9": (13, 16),
                    "cls-class10": (14, 17),
                    "cls-class11": (15, 18),
                    "cls-class12": (16, 20),
                }
                limits = class_age_limits.get(payload.class_id)
                if limits:
                    min_age, max_age = limits
                    if calc_age < min_age or calc_age > max_age:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Student age ({calc_age} years) is outside eligible range ({min_age} to {max_age} years) for {target_cls.name} (born {birth_year}).",
                        )
            except (ValueError, IndexError):
                pass

    state_val = payload.state or (school.state if school else "Karnataka")
    district_val = payload.district or (school.city if school else "Bengaluru Urban")
    if not validate_state_and_district(state_val, district_val):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"District '{district_val}' is not valid for State/UT '{state_val}'.",
        )

    new_user = User(
        id=user_id,
        name=payload.name,
        email=email,
        username=mobile_10,  # Login username is 10-digit mobile number
        password_hash=hashed_password,  # Password is hashed DDMMYYYY
        user_type="student",
        phone=mobile_10,
        phone_hash=phone_hash,
        dob=payload.date_of_birth,
        gender=payload.gender or "male",
        school_id=school_id,
        state=state_val,
        district=district_val,
        address=payload.address,
        code=adm_no,
        must_change_password=False,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    sp = StudentProfile(
        id=f"sp-{secrets.token_hex(8)}",
        user_id=new_user.id,
        admission_number=adm_no,
        current_academic_year_id=target_year_id,
        dorm_id=payload.dorm_id if payload.dorm_id != "none" else None,
        dorm_room_no=payload.dorm_room_no or None,
    )
    db.add(sp)
    await db.flush()

    if payload.class_id and payload.section_id:
        enrollment = StudentEnrollment(
            id=f"enr-{secrets.token_hex(8)}",
            student_id=sp.id,
            academic_year_id=target_year_id,
            class_id=payload.class_id,
            stream_id=payload.stream_id,
            section_id=payload.section_id,
            status="ACTIVE",
        )
        db.add(enrollment)

    # Automatic Parent linking (One Parent to Multiple Children)
    if payload.parent_phone:
        p_raw = "".join(filter(str.isdigit, payload.parent_phone.strip()))
        if len(p_raw) >= 10:
            p_10 = p_raw[-10:]
            p_stmt = select(User).where(User.phone == p_10, User.user_type == "parent")
            parent_user = (await db.execute(p_stmt)).scalars().first()
            if not parent_user:
                parent_user = User(
                    id=f"usr-{secrets.token_hex(8)}",
                    name=payload.parent_name or "Parent / Guardian",
                    email=f"parent.{p_10}@{school_code.lower()}.edu.in",
                    username=p_10,
                    password_hash=get_password_hash("Parent@123"),
                    user_type="parent",
                    phone=p_10,
                    phone_hash=generate_blind_index(p_10),
                    school_id=school_id,
                    state=state_val,
                    district=district_val,
                    code=f"EDP/PRT/{secrets.token_hex(3).upper()}",
                    must_change_password=True,
                    is_active=True,
                )
                db.add(parent_user)
                await db.flush()

            link = ParentChildLink(
                id=f"pcl-{secrets.token_hex(8)}",
                parent_user_id=parent_user.id,
                student_profile_id=sp.id,
                relationship_type="Parent/Guardian",
                is_primary_contact=True,
            )
            db.add(link)
            sp.parent_id = parent_user.id

    await db.commit()

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            username=new_user.username,
            userType=new_user.user_type,
            school_id=new_user.school_id,
            schoolId=new_user.school_id,
            phone=new_user.phone,
            code=new_user.code,
            dob=new_user.dob,
            mustChangePassword=False,
            active=True,
        ),
        message=f"Student created: Identifier is '{mobile_10}' and Initial Password is DOB (DDMMYYYY).",
    )


@router.post("/users", response_model=ApiResponse[UserSummary])
async def create_user(
    payload: Dict,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified user provisioning for Super Admin.
    Delegates to hierarchical rules:
    - Principal: explicit initial password, linked to school_id
    - Teacher: auto-generated Teacher@<school_prefix>123, linked to school_id
    - Student: mobile_number as identifier, DDMMYYYY as initial password, linked to school_id
    """
    user_type = payload.get("userType", "teacher")
    school_id = payload.get("school_id") or payload.get("schoolId")

    # If school_id not provided, look up first active school as fallback
    if not school_id:
        first_school = (await db.execute(select(School).limit(1))).scalar_one_or_none()
        if first_school:
            school_id = first_school.id

    if user_type == "principal":
        req = CreatePrincipalRequest(
            school_id=school_id or "sch-main",
            name=payload["name"],
            email=payload["email"],
            username=payload.get("username"),
            phone=payload.get("phone"),
            password=payload.get("password") or generate_secure_random_password(12),
        )
        return await create_principal(req, current_user, db)

    if user_type == "teacher":
        req = CreateTeacherRequest(
            school_id=school_id or "sch-main",
            name=payload["name"],
            email=payload["email"],
            username=payload.get("username"),
            phone=payload.get("phone"),
            specialization=payload.get("specialization", "General"),
            district=payload.get("district", "Bengaluru Urban"),
        )
        return await create_teacher(req, current_user, db)

    if user_type == "student":
        raw_phone = payload.get("phone") or payload.get("mobile_number") or "9988776655"
        raw_dob = payload.get("dob") or payload.get("date_of_birth") or "14-05-2010"
        req = CreateStudentRequest(
            school_id=school_id or "sch-main",
            name=payload["name"],
            mobile_number=raw_phone,
            date_of_birth=raw_dob,
            email=payload.get("email"),
            gender=payload.get("gender", "male"),
            class_id=payload.get("class_id"),
            section_id=payload.get("section_id"),
            district=payload.get("district", "Bengaluru Urban"),
        )
        return await create_student(req, current_user, db)

    # General / Custom Role Provisioning
    user_id = f"usr-{secrets.token_hex(8)}"
    temp_password = payload.get("initial_password") or payload.get("password") or generate_secure_random_password(12)
    hashed = get_password_hash(temp_password)

    state_val = payload.get("state", "Karnataka")
    district_val = payload.get("district", "Bengaluru Urban")
    if not validate_state_and_district(state_val, district_val):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"District '{district_val}' is not valid for State/UT '{state_val}'.",
        )

    # Link dynamic role if exists
    role_obj = (await db.execute(
        select(Role).where((Role.name == user_type.upper()) | (Role.id == payload.get("role_id")))
    )).scalar_one_or_none()
    role_id_val = role_obj.id if role_obj else None

    new_user = User(
        id=user_id,
        name=payload["name"],
        email=payload["email"].lower(),
        username=(payload.get("username") or payload["email"].split("@")[0]).lower(),
        password_hash=hashed,
        user_type=user_type.lower(),
        role_id=role_id_val,
        school_id=school_id,
        phone=payload.get("phone"),
        phone_hash=generate_blind_index(payload.get("phone")),
        state=state_val,
        district=district_val,
        code=payload.get("code") or f"EDP/{secrets.token_hex(4).upper()}",
        must_change_password=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()

    return ApiResponse(
        success=True,
        data=UserSummary(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            username=new_user.username,
            userType=new_user.user_type,
            school_id=new_user.school_id,
            schoolId=new_user.school_id,
            phone=new_user.phone,
            code=new_user.code,
            mustChangePassword=True,
            active=True,
        ),
        message="User account provisioned successfully.",
    )
