import secrets
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import cache_delete, cache_delete_pattern, cache_get, cache_set
from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import AcademicYear, Class, ClassType, Section, Stream, Subject
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import User
from app.schemas.academic import (
    AcademicYearCreateRequest,
    AcademicYearSchema,
    AcademicYearUpdateRequest,
    AssignClassTeacherRequest,
    AssignSubjectTeacherRequest,
    ClassCreateRequest,
    ClassSchema,
    ClassUpdateRequest,
    EnrollmentCreateRequest,
    EnrollmentSchema,
    RecalculateRollNumbersRequest,
    SectionCreateRequest,
    SectionSchema,
    SectionUpdateRequest,
    StreamCreateRequest,
    StreamSchema,
    StreamUpdateRequest,
    SubjectCreateRequest,
    SubjectSchema,
    SubjectUpdateRequest,
)
from app.schemas.common import ApiResponse

router = APIRouter(tags=["Academics"])


# =========================================================================
# ACADEMIC YEARS (SESSIONS)
# =========================================================================

@router.get("/years", response_model=ApiResponse[List[AcademicYearSchema]])
async def get_academic_years(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all academic sessions ordered by start_date descending."""
    stmt = select(AcademicYear).order_by(AcademicYear.start_date.desc())
    res = await db.execute(stmt)
    years = res.scalars().all()
    output = [
        AcademicYearSchema(
            id=y.id,
            name=y.name,
            code=y.code,
            startDate=y.start_date,
            endDate=y.end_date,
            isCurrent=bool(y.is_current),
            isActive=bool(y.is_active) if hasattr(y, "is_active") and y.is_active is not None else bool(y.is_current),
            description=getattr(y, "description", None),
        )
        for y in years
    ]
    return ApiResponse(success=True, data=output)


@router.post("/years", response_model=ApiResponse[AcademicYearSchema])
async def create_academic_year(
    payload: AcademicYearCreateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new academic session. If marked current, atomically deactivates previous current year."""
    # Check duplicate code or name
    dup_stmt = select(AcademicYear).where(
        (AcademicYear.name == payload.name) | (AcademicYear.code == payload.code)
    )
    dup = (await db.execute(dup_stmt)).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Academic session '{payload.name}' or code '{payload.code}' already exists.",
        )

    if payload.isCurrent:
        await db.execute(update(AcademicYear).values(is_current=False, is_active=False))

    y_id = f"ay-{payload.code.lower().replace('/', '-')}"
    new_year = AcademicYear(
        id=y_id,
        name=payload.name,
        code=payload.code,
        start_date=payload.startDate,
        end_date=payload.endDate,
        is_current=payload.isCurrent,
        is_active=payload.isCurrent,
        description=payload.description,
    )
    db.add(new_year)
    await db.commit()
    await db.refresh(new_year)

    return ApiResponse(
        success=True,
        data=AcademicYearSchema(
            id=new_year.id,
            name=new_year.name,
            code=new_year.code,
            startDate=new_year.start_date,
            endDate=new_year.end_date,
            isCurrent=new_year.is_current,
            isActive=new_year.is_active,
            description=new_year.description,
        ),
        message="Academic session created successfully.",
    )


@router.put("/years/{year_id}", response_model=ApiResponse[AcademicYearSchema])
async def update_academic_year(
    year_id: str,
    payload: AcademicYearUpdateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    year = await db.get(AcademicYear, year_id)
    if not year:
        raise HTTPException(status_code=404, detail="Academic session not found.")

    if payload.name is not None:
        year.name = payload.name
    if payload.code is not None:
        year.code = payload.code
    if payload.startDate is not None:
        year.start_date = payload.startDate
    if payload.endDate is not None:
        year.end_date = payload.endDate
    if payload.description is not None:
        year.description = payload.description
    if payload.isActive is not None:
        year.is_active = payload.isActive

    await db.commit()
    await db.refresh(year)

    return ApiResponse(
        success=True,
        data=AcademicYearSchema(
            id=year.id,
            name=year.name,
            code=year.code,
            startDate=year.start_date,
            endDate=year.end_date,
            isCurrent=year.is_current,
            isActive=year.is_active,
            description=year.description,
        ),
        message="Academic session updated.",
    )


@router.patch("/years/{year_id}/activate", response_model=ApiResponse[AcademicYearSchema])
async def activate_academic_year(
    year_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Atomically activates target session as the current active session, deactivating all others."""
    target = await db.get(AcademicYear, year_id)
    if not target:
        raise HTTPException(status_code=404, detail="Academic session not found.")

    await db.execute(update(AcademicYear).values(is_current=False, is_active=False))
    target.is_current = True
    target.is_active = True
    await db.commit()
    await db.refresh(target)

    return ApiResponse(
        success=True,
        data=AcademicYearSchema(
            id=target.id,
            name=target.name,
            code=target.code,
            startDate=target.start_date,
            endDate=target.end_date,
            isCurrent=True,
            isActive=True,
            description=target.description,
        ),
        message=f"Academic session '{target.name}' activated as current session.",
    )


# =========================================================================
# STREAMS (Science, Commerce, Arts, etc.)
# =========================================================================

@router.get("/streams", response_model=ApiResponse[List[StreamSchema]])
async def get_streams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Stream).order_by(Stream.name)
    res = await db.execute(stmt)
    streams = res.scalars().all()
    output = [
        StreamSchema(
            id=s.id,
            name=s.name,
            code=s.code,
            description=s.description,
            isActive=s.is_active,
        )
        for s in streams
    ]
    return ApiResponse(success=True, data=output)


@router.post("/streams", response_model=ApiResponse[StreamSchema])
async def create_stream(
    payload: StreamCreateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    dup = (
        await db.execute(select(Stream).where(Stream.name == payload.name))
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=400, detail=f"Stream '{payload.name}' already exists."
        )

    st_id = f"st-{payload.code.lower()}-{secrets.token_hex(2)}"
    new_stream = Stream(
        id=st_id,
        name=payload.name,
        code=payload.code.upper(),
        description=payload.description,
        is_active=True,
    )
    db.add(new_stream)
    await db.commit()
    await db.refresh(new_stream)

    return ApiResponse(
        success=True,
        data=StreamSchema(
            id=new_stream.id,
            name=new_stream.name,
            code=new_stream.code,
            description=new_stream.description,
            isActive=new_stream.is_active,
        ),
        message="Stream created successfully.",
    )


@router.put("/streams/{stream_id}", response_model=ApiResponse[StreamSchema])
async def update_stream(
    stream_id: str,
    payload: StreamUpdateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    stream = await db.get(Stream, stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    if payload.name is not None:
        stream.name = payload.name
    if payload.code is not None:
        stream.code = payload.code.upper()
    if payload.description is not None:
        stream.description = payload.description
    if payload.isActive is not None:
        stream.is_active = payload.isActive

    await db.commit()
    await db.refresh(stream)
    return ApiResponse(
        success=True,
        data=StreamSchema(
            id=stream.id,
            name=stream.name,
            code=stream.code,
            description=stream.description,
            isActive=stream.is_active,
        ),
        message="Stream updated.",
    )


@router.delete("/streams/{stream_id}", response_model=ApiResponse[dict])
async def delete_stream(
    stream_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    stream = await db.get(Stream, stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    sec_count = (
        await db.execute(select(func.count(Section.id)).where(Section.stream_id == stream_id, Section.is_active == True))
    ).scalar() or 0
    if sec_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete stream: active sections are linked to it.")

    enrollment_count = (
        await db.execute(select(func.count(StudentEnrollment.id)).where(StudentEnrollment.stream_id == stream_id))
    ).scalar() or 0
    if enrollment_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete stream: active students are enrolled in it.")

    await db.delete(stream)
    await db.commit()
    return ApiResponse(success=True, data={"id": stream_id}, message="Stream deleted successfully.")


# =========================================================================
# CLASSES & SECTIONS
# =========================================================================

@router.get("/classes", response_model=ApiResponse[List[ClassSchema]])
@router.get("/classes-with-sections", response_model=ApiResponse[List[ClassSchema]])
async def get_classes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetches all classes with nested sections and enrolled student counts."""
    cache_key = "academics:classes_with_sections"
    cached = await cache_get(cache_key)
    if cached:
        return ApiResponse(success=True, data=cached)

    stmt = (
        select(Class)
        .where(Class.is_active == True)
        .options(selectinload(Class.sections).selectinload(Section.stream))
        .order_by(Class.order_index)
    )
    result = await db.execute(stmt)
    classes = result.scalars().all()

    # Get student counts per section
    count_stmt = select(
        StudentEnrollment.section_id,
        func.count(StudentEnrollment.id).label("count"),
    ).where(StudentEnrollment.status == "ACTIVE").group_by(StudentEnrollment.section_id)
    count_res = await db.execute(count_stmt)
    counts = dict(count_res.all())

    # Get class teachers per section
    ct_stmt = (
        select(TeacherAssignment.section_id, User.name, User.id)
        .join(TeacherProfile, TeacherAssignment.teacher_id == TeacherProfile.id)
        .join(User, TeacherProfile.user_id == User.id)
        .where(TeacherAssignment.assignment_type == "CLASS_TEACHER")
    )
    ct_res = await db.execute(ct_stmt)
    class_teachers = {row[0]: {"name": row[1], "id": row[2]} for row in ct_res.all()}

    output = []
    for cls in classes:
        sec_schemas = []
        cls_student_count = 0
        for sec in cls.sections:
            if not sec.is_active:
                continue
            s_count = counts.get(sec.id, 0)
            cls_student_count += s_count
            ct = class_teachers.get(sec.id, {})
            stream_name = sec.stream.name if sec.stream else None
            sec_schemas.append(
                SectionSchema(
                    id=sec.id,
                    classId=sec.class_id,
                    streamId=sec.stream_id,
                    streamName=stream_name,
                    name=sec.name,
                    code=sec.code,
                    capacity=getattr(sec, "capacity", 40) or 40,
                    roomNumber=getattr(sec, "room_number", None),
                    isActive=sec.is_active,
                    classTeacherId=ct.get("id"),
                    classTeacherName=ct.get("name"),
                    studentsCount=s_count,
                )
            )
        output.append(
            ClassSchema(
                id=cls.id,
                name=cls.name,
                classTypeId=cls.class_type_id,
                orderIndex=cls.order_index,
                hasStreams=bool(getattr(cls, "has_streams", False)),
                isActive=cls.is_active,
                sections=sec_schemas,
                sectionsCount=len(sec_schemas),
                studentsCount=cls_student_count,
            )
        )

    dict_output = [item.model_dump() for item in output]
    await cache_set(cache_key, dict_output, ttl_seconds=3600)
    return ApiResponse(success=True, data=dict_output)


@router.post("/classes", response_model=ApiResponse[ClassSchema])
async def create_class(
    payload: ClassCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type == "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Principals cannot create or modify classes. Master class structure is managed strictly by Super Admin.",
        )
    if current_user.user_type not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Requires role: super_admin",
        )

    cls_id = f"cls-{secrets.token_hex(4)}"
    new_class = Class(
        id=cls_id,
        name=payload.name,
        class_type_id=payload.classTypeId or "ct-secondary",
        order_index=payload.orderIndex or 0,
        has_streams=payload.hasStreams,
        is_active=True,
    )
    db.add(new_class)
    await db.commit()
    await cache_delete("academics:classes_with_sections")

    return ApiResponse(
        success=True,
        data=ClassSchema(
            id=new_class.id,
            name=new_class.name,
            classTypeId=new_class.class_type_id,
            orderIndex=new_class.order_index,
            hasStreams=new_class.has_streams,
            isActive=new_class.is_active,
            sections=[],
            sectionsCount=0,
            studentsCount=0,
        ),
        message="Class created successfully.",
    )


@router.put("/classes/{class_id}", response_model=ApiResponse[ClassSchema])
async def update_class(
    class_id: str,
    payload: ClassUpdateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    cls = await db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    if payload.name is not None:
        cls.name = payload.name
    if payload.orderIndex is not None:
        cls.order_index = payload.orderIndex
    if payload.hasStreams is not None:
        cls.has_streams = payload.hasStreams
    if payload.isActive is not None:
        cls.is_active = payload.isActive

    await db.commit()
    await cache_delete("academics:classes_with_sections")
    await db.refresh(cls)

    return ApiResponse(
        success=True,
        data=ClassSchema(
            id=cls.id,
            name=cls.name,
            classTypeId=cls.class_type_id,
            orderIndex=cls.order_index,
            hasStreams=cls.has_streams,
            isActive=cls.is_active,
            sections=[],
            sectionsCount=0,
            studentsCount=0,
        ),
        message="Class updated.",
    )


@router.delete("/classes/{class_id}", response_model=ApiResponse[dict])
async def delete_class(
    class_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    cls = await db.get(Class, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    # Check active student enrollments
    enrollment_count = (
        await db.execute(
            select(func.count(StudentEnrollment.id))
            .join(Section, StudentEnrollment.section_id == Section.id)
            .where(Section.class_id == class_id)
        )
    ).scalar() or 0

    if enrollment_count > 0:
        cls.is_active = False
        await db.execute(
            update(Section).where(Section.class_id == class_id).values(is_active=False)
        )
        await db.commit()
        await cache_delete("academics:classes_with_sections")
        return ApiResponse(
            success=True,
            data={"id": class_id, "action": "archived"},
            message=f"Class '{cls.name}' has {enrollment_count} student enrollments and was safely archived.",
        )

    try:
        await db.delete(cls)
        await db.commit()
    except Exception:
        await db.rollback()
        cls.is_active = False
        await db.commit()

    await cache_delete("academics:classes_with_sections")
    return ApiResponse(
        success=True,
        data={"id": class_id, "action": "deleted"},
        message=f"Class '{cls.name}' removed successfully.",
    )



@router.post("/sections", response_model=ApiResponse[SectionSchema])
async def create_section(
    payload: SectionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type == "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Principals cannot create or modify sections. Master section structure is managed strictly by Super Admin.",
        )
    if current_user.user_type not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Requires role: super_admin",
        )

    cls = await db.get(Class, payload.classId)
    if not cls:
        raise HTTPException(status_code=404, detail="Parent class not found.")

    if cls.has_streams and not payload.streamId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class '{cls.name}' requires a Stream (Science, Commerce, Arts) to be assigned.",
        )

    sec_id = f"sec-{secrets.token_hex(4)}"
    new_sec = Section(
        id=sec_id,
        class_id=payload.classId,
        stream_id=payload.streamId if cls.has_streams else None,
        name=payload.name,
        code=payload.code,
        capacity=payload.capacity or 40,
        room_number=payload.roomNumber,
        is_active=True,
    )
    db.add(new_sec)
    await db.commit()
    await cache_delete("academics:classes_with_sections")

    stream_name = None
    if new_sec.stream_id:
        st = await db.get(Stream, new_sec.stream_id)
        if st:
            stream_name = st.name

    return ApiResponse(
        success=True,
        data=SectionSchema(
            id=new_sec.id,
            classId=new_sec.class_id,
            streamId=new_sec.stream_id,
            streamName=stream_name,
            name=new_sec.name,
            code=new_sec.code,
            capacity=new_sec.capacity,
            roomNumber=new_sec.room_number,
            isActive=new_sec.is_active,
            studentsCount=0,
        ),
        message="Section created successfully.",
    )


@router.put("/sections/{section_id}", response_model=ApiResponse[SectionSchema])
async def update_section(
    section_id: str,
    payload: SectionUpdateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    if payload.streamId is not None:
        sec.stream_id = payload.streamId
    if payload.name is not None:
        sec.name = payload.name
    if payload.code is not None:
        sec.code = payload.code
    if payload.capacity is not None:
        sec.capacity = payload.capacity
    if payload.room_no is not None:
        sec.room_number = payload.room_no
    elif payload.roomNumber is not None:
        sec.room_number = payload.roomNumber
    if payload.isActive is not None:
        sec.is_active = payload.isActive

    await db.commit()
    await cache_delete("academics:classes_with_sections")
    await db.refresh(sec)

    stream_name = None
    if sec.stream_id:
        st = await db.get(Stream, sec.stream_id)
        if st:
            stream_name = st.name

    return ApiResponse(
        success=True,
        data=SectionSchema(
            id=sec.id,
            classId=sec.class_id,
            streamId=sec.stream_id,
            streamName=stream_name,
            name=sec.name,
            code=sec.code,
            capacity=sec.capacity,
            roomNumber=sec.room_number,
            isActive=sec.is_active,
            studentsCount=0,
        ),
        message="Section updated.",
    )


@router.delete("/sections/{section_id}", response_model=ApiResponse[dict])
async def delete_section(
    section_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    enrollment_count = (
        await db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == section_id
            )
        )
    ).scalar() or 0

    if enrollment_count > 0:
        sec.is_active = False
        await db.commit()
        await cache_delete("academics:classes_with_sections")
        return ApiResponse(
            success=True,
            data={"id": section_id, "action": "archived"},
            message=f"Section '{sec.name}' has {enrollment_count} active student enrollments and was safely archived.",
        )

    try:
        await db.delete(sec)
        await db.commit()
    except Exception:
        await db.rollback()
        sec.is_active = False
        await db.commit()

    await cache_delete("academics:classes_with_sections")
    return ApiResponse(
        success=True,
        data={"id": section_id, "action": "deleted"},
        message=f"Section '{sec.name}' removed successfully.",
    )



# =========================================================================
# DYNAMIC ENROLLMENT & AUTOMATIC ROLL NUMBER ASSIGNMENT
# =========================================================================

@router.get("/enrollments", response_model=ApiResponse[List[EnrollmentSchema]])
async def get_enrollments(
    academic_year_id: Optional[str] = None,
    class_id: Optional[str] = None,
    stream_id: Optional[str] = None,
    section_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Filters enrollments dynamically by session, class, stream, and section."""
    stmt = (
        select(StudentEnrollment)
        .options(
            selectinload(StudentEnrollment.student_profile).selectinload(StudentProfile.user),
            selectinload(StudentEnrollment.student_profile).selectinload(StudentProfile.parent),
            selectinload(StudentEnrollment.academic_year),
            selectinload(StudentEnrollment.parent_class),
            selectinload(StudentEnrollment.stream),
            selectinload(StudentEnrollment.section),
        )
        .where(StudentEnrollment.status == "ACTIVE")
    )
    if academic_year_id:
        stmt = stmt.where(StudentEnrollment.academic_year_id == academic_year_id)
    if class_id:
        stmt = stmt.where(StudentEnrollment.class_id == class_id)
    if stream_id:
        stmt = stmt.where(StudentEnrollment.stream_id == stream_id)
    if section_id:
        stmt = stmt.where(StudentEnrollment.section_id == section_id)

    stmt = stmt.order_by(StudentEnrollment.roll_number.asc())
    res = await db.execute(stmt)
    records = res.scalars().all()

    # Preload parent details for student profiles
    sp_ids = [enr.student_id for enr in records if enr.student_id]
    parent_map = {}
    if sp_ids:
        pcl_stmt = (
            select(ParentChildLink.student_profile_id, User.name, User.phone, User.email)
            .join(User, ParentChildLink.parent_user_id == User.id)
            .where(ParentChildLink.student_profile_id.in_(sp_ids))
        )
        pcl_res = await db.execute(pcl_stmt)
        for row in pcl_res.all():
            parent_map[row[0]] = {"name": row[1], "phone": row[2], "email": row[3]}

    output = []
    for enr in records:
        student_user = enr.student_profile.user if enr.student_profile else None
        p_info = parent_map.get(enr.student_id) or {}
        p_user = enr.student_profile.parent if enr.student_profile else None
        parent_name = p_info.get("name") or (p_user.name if p_user else None)
        parent_phone = p_info.get("phone") or (p_user.phone if p_user else None)
        parent_email = p_info.get("email") or (p_user.email if p_user else None)

        output.append(
            EnrollmentSchema(
                id=enr.id,
                studentId=enr.student_id,
                studentName=student_user.name if student_user else "Unknown",
                admissionNumber=enr.student_profile.admission_number if enr.student_profile else "",
                academicYearId=enr.academic_year_id,
                academicYearName=enr.academic_year.name if enr.academic_year else "",
                classId=enr.class_id,
                className=enr.parent_class.name if enr.parent_class else "",
                streamId=enr.stream_id,
                streamName=enr.stream.name if enr.stream else None,
                sectionId=enr.section_id,
                sectionCode=enr.section.code if enr.section else "",
                rollNumber=enr.roll_number,
                status=enr.status,
                dob=student_user.dob if student_user else None,
                gender=student_user.gender if student_user else None,
                bloodGroup=student_user.blood_group if student_user else None,
                phone=student_user.phone if student_user else None,
                email=student_user.email if student_user else None,
                address=student_user.address if student_user else None,
                state=student_user.state if student_user else None,
                district=student_user.district if student_user else None,
                parentName=parent_name,
                parentPhone=parent_phone,
                parentEmail=parent_email,
                dormId=enr.student_profile.dorm_id if enr.student_profile else None,
                dormRoomNo=enr.student_profile.dorm_room_no if enr.student_profile else None,
            )
        )
    return ApiResponse(success=True, data=output)


@router.post("/enrollments", response_model=ApiResponse[EnrollmentSchema])
async def create_enrollment(
    payload: EnrollmentCreateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Enrolls student in target session, class, stream (if applicable), and section with automatic roll number generation."""
    # Find student profile
    sp = await db.get(StudentProfile, payload.studentId)
    if not sp:
        sp_user = (
            await db.execute(select(StudentProfile).where(StudentProfile.user_id == payload.studentId))
        ).scalar_one_or_none()
        if not sp_user:
            raise HTTPException(status_code=404, detail="Student profile not found.")
        sp = sp_user

    # Verify Class & Section
    cls = await db.get(Class, payload.classId)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    sec = await db.get(Section, payload.sectionId)
    if not sec or sec.class_id != cls.id:
        raise HTTPException(status_code=400, detail="Invalid section for selected class.")

    if cls.has_streams:
        if not payload.streamId:
            raise HTTPException(
                status_code=400, detail=f"Class '{cls.name}' requires stream selection."
            )
        if sec.stream_id != payload.streamId:
            raise HTTPException(
                status_code=400, detail="Section stream does not match selected student stream."
            )

    # Check capacity
    enrolled_count = (
        await db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == sec.id,
                StudentEnrollment.academic_year_id == payload.academicYearId,
                StudentEnrollment.status == "ACTIVE",
            )
        )
    ).scalar_one()

    capacity = getattr(sec, "capacity", 40) or 40
    if enrolled_count >= capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{sec.name}' is at full capacity ({enrolled_count}/{capacity}).",
        )

    # Prevent duplicate active enrollment in same academic year
    dup = (
        await db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == sp.id,
                StudentEnrollment.academic_year_id == payload.academicYearId,
                StudentEnrollment.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=400,
            detail="Student is already actively enrolled in this academic session.",
        )

    # Auto-generate next roll number in section
    next_roll = str(enrolled_count + 1)
    if payload.rollNumber:
        # Check if requested roll number already exists in section
        roll_exists = (
            await db.execute(
                select(StudentEnrollment).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.academic_year_id == payload.academicYearId,
                    StudentEnrollment.roll_number == payload.rollNumber,
                    StudentEnrollment.status == "ACTIVE",
                )
            )
        ).scalar_one_or_none()
        if roll_exists:
            raise HTTPException(
                status_code=400,
                detail=f"Roll number {payload.rollNumber} is already assigned in this section.",
            )
        next_roll = payload.rollNumber

    enr_id = f"enr-{secrets.token_hex(6)}"
    new_enr = StudentEnrollment(
        id=enr_id,
        student_id=sp.id,
        academic_year_id=payload.academicYearId,
        class_id=cls.id,
        stream_id=payload.streamId if cls.has_streams else None,
        section_id=sec.id,
        roll_number=next_roll,
        status="ACTIVE",
    )
    db.add(new_enr)
    await db.commit()
    await cache_delete("academics:classes_with_sections")

    ay = await db.get(AcademicYear, payload.academicYearId)
    st = await db.get(Stream, payload.streamId) if payload.streamId else None
    usr = await db.get(User, sp.user_id)

    return ApiResponse(
        success=True,
        data=EnrollmentSchema(
            id=new_enr.id,
            studentId=new_enr.student_id,
            studentName=usr.name if usr else "Unknown",
            admissionNumber=sp.admission_number,
            academicYearId=new_enr.academic_year_id,
            academicYearName=ay.name if ay else "",
            classId=new_enr.class_id,
            className=cls.name,
            streamId=new_enr.stream_id,
            streamName=st.name if st else None,
            sectionId=new_enr.section_id,
            sectionCode=sec.code,
            rollNumber=new_enr.roll_number,
            status=new_enr.status,
        ),
        message=f"Student successfully enrolled with Roll Number {next_roll}.",
    )


@router.post("/sections/{section_id}/recalculate-roll-numbers", response_model=ApiResponse[bool])
async def recalculate_roll_numbers(
    section_id: str,
    payload: RecalculateRollNumbersRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Admin feature: re-indexes roll numbers sequentially (1, 2, 3...) based on alphabetical student name."""
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    stmt = (
        select(StudentEnrollment)
        .join(StudentProfile, StudentEnrollment.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .where(
            StudentEnrollment.section_id == section_id,
            StudentEnrollment.academic_year_id == payload.academicYearId,
            StudentEnrollment.status == "ACTIVE",
        )
        .order_by(User.name.asc())
    )
    res = await db.execute(stmt)
    enrollments = res.scalars().all()

    for idx, enr in enumerate(enrollments, start=1):
        enr.roll_number = str(idx)

    await db.commit()
    return ApiResponse(
        success=True,
        data=True,
        message=f"Recalculated roll numbers for {len(enrollments)} students alphabetically.",
    )


@router.delete("/enrollments/{enrollment_id}", response_model=ApiResponse[Dict])
async def delete_student_enrollment(
    enrollment_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a student record and enrollment.
    Cascades to student profile and user account.
    """
    enr = await db.get(StudentEnrollment, enrollment_id)
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found.")

    sp = await db.get(StudentProfile, enr.student_id)
    student_user = None
    if sp:
        student_user = await db.get(User, sp.user_id)

    student_name = student_user.name if student_user else "Student"

    # Delete User (cascades to StudentProfile, StudentEnrollments, ParentChildLinks, etc.)
    if student_user:
        await db.delete(student_user)
    elif sp:
        await db.delete(sp)
    else:
        await db.delete(enr)

    await db.commit()
    await cache_delete("academics:classes_with_sections")

    return ApiResponse(
        success=True,
        data={"id": enrollment_id, "studentName": student_name},
        message=f"Student '{student_name}' record and enrollment deleted successfully.",
    )


# =========================================================================
# SUBJECTS & ASSIGNMENTS
# =========================================================================

@router.get("/subjects", response_model=ApiResponse[List[SubjectSchema]])
async def get_all_subjects(
    class_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all active curriculum subjects, optionally filtered by class."""
    stmt = select(Subject).order_by(Subject.name)
    if class_id and class_id != "all":
        stmt = stmt.where(Subject.class_id == class_id)
    result = await db.execute(stmt)
    subjects = result.scalars().all()

    ta_stmt = (
        select(TeacherAssignment.subject_id, User.name, User.id)
        .join(TeacherProfile, TeacherAssignment.teacher_id == TeacherProfile.id)
        .join(User, TeacherProfile.user_id == User.id)
        .where(TeacherAssignment.assignment_type == "SUBJECT_TEACHER")
    )
    ta_res = await db.execute(ta_stmt)
    assigned_teachers = {row[0]: {"name": row[1], "id": row[2]} for row in ta_res.all()}

    output = []
    for sub in subjects:
        t_info = assigned_teachers.get(sub.id, {})
        output.append(
            SubjectSchema(
                id=sub.id,
                classId=sub.class_id,
                name=sub.name,
                slug=sub.slug,
                code=sub.code,
                isCore=sub.is_core,
                assignedTeacherId=t_info.get("id"),
                assignedTeacherName=t_info.get("name"),
            )
        )
    return ApiResponse(success=True, data=output)


@router.get("/classes/{class_id}/subjects", response_model=ApiResponse[List[SubjectSchema]])
async def get_class_subjects(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Subject)
        .where(Subject.class_id == class_id)
        .order_by(Subject.name)
    )
    result = await db.execute(stmt)
    subjects = result.scalars().all()

    ta_stmt = (
        select(TeacherAssignment.subject_id, User.name, User.id)
        .join(TeacherProfile, TeacherAssignment.teacher_id == TeacherProfile.id)
        .join(User, TeacherProfile.user_id == User.id)
        .where(TeacherAssignment.class_id == class_id, TeacherAssignment.assignment_type == "SUBJECT_TEACHER")
    )
    ta_res = await db.execute(ta_stmt)
    assigned_teachers = {row[0]: {"name": row[1], "id": row[2]} for row in ta_res.all()}

    output = []
    for sub in subjects:
        t_info = assigned_teachers.get(sub.id, {})
        output.append(
            SubjectSchema(
                id=sub.id,
                classId=sub.class_id,
                name=sub.name,
                slug=sub.slug,
                code=sub.code,
                isCore=sub.is_core,
                assignedTeacherId=t_info.get("id"),
                assignedTeacherName=t_info.get("name"),
            )
        )
    return ApiResponse(success=True, data=output)


@router.post("/subjects", response_model=ApiResponse[SubjectSchema])
async def create_subject(
    payload: SubjectCreateRequest,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    cls = await db.get(Class, payload.classId)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    slug = (payload.slug or payload.name).strip().lower().replace(" ", "-")
    existing = (
        await db.execute(select(Subject).where(Subject.class_id == payload.classId, Subject.slug == slug))
    ).scalar_one_or_none()
    if existing:
        return ApiResponse(
            success=True,
            data=SubjectSchema(
                id=existing.id,
                classId=existing.class_id,
                name=existing.name,
                slug=existing.slug,
                code=existing.code,
                isCore=existing.is_core,
            ),
            message="Subject already exists.",
        )

    sub_id = f"sub-{payload.classId}-{slug}"
    new_sub = Subject(
        id=sub_id,
        class_id=payload.classId,
        name=payload.name,
        slug=slug,
        code=payload.code or sub_id,
        is_core=payload.isCore,
    )
    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    return ApiResponse(
        success=True,
        data=SubjectSchema(
            id=new_sub.id,
            classId=new_sub.class_id,
            name=new_sub.name,
            slug=new_sub.slug,
            code=new_sub.code,
            isCore=new_sub.is_core,
        ),
        message="Subject created successfully.",
    )


@router.put("/subjects/{subject_id}", response_model=ApiResponse[SubjectSchema])
async def update_subject(
    subject_id: str,
    payload: SubjectUpdateRequest,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    sub = await db.get(Subject, subject_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found.")

    if payload.name is not None:
        sub.name = payload.name
    if payload.slug is not None:
        sub.slug = payload.slug.strip().lower().replace(" ", "-")
    if payload.code is not None:
        sub.code = payload.code
    if payload.isCore is not None:
        sub.is_core = payload.isCore

    await db.commit()
    await db.refresh(sub)
    return ApiResponse(
        success=True,
        data=SubjectSchema(
            id=sub.id,
            classId=sub.class_id,
            name=sub.name,
            slug=sub.slug,
            code=sub.code,
            isCore=sub.is_core,
        ),
        message="Subject updated successfully.",
    )


@router.delete("/subjects/{subject_id}", response_model=ApiResponse[dict])
async def delete_subject(
    subject_id: str,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    sub = await db.get(Subject, subject_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found.")

    await db.delete(sub)
    await db.commit()
    return ApiResponse(success=True, data={"id": subject_id}, message="Subject deleted successfully.")


@router.post("/assign/class-teacher", response_model=ApiResponse[bool])
async def assign_class_teacher(
    payload: AssignClassTeacherRequest,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    sec = await db.get(Section, payload.sectionId)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    ay_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
    ay_res = await db.execute(ay_stmt)
    ay = ay_res.scalar_one_or_none()
    ay_id = payload.academicYearId or (ay.id if ay else "ay-2026-2027")

    tp_stmt = select(TeacherProfile).where(
        (TeacherProfile.id == payload.teacherId) | (TeacherProfile.user_id == payload.teacherId)
    )
    tp_res = await db.execute(tp_stmt)
    tp = tp_res.scalar_one_or_none()
    if not tp:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")

    existing_stmt = select(TeacherAssignment).where(
        TeacherAssignment.section_id == payload.sectionId,
        TeacherAssignment.academic_year_id == ay_id,
        TeacherAssignment.assignment_type == "CLASS_TEACHER",
    )
    existing_res = await db.execute(existing_stmt)
    for ea in existing_res.scalars().all():
        await db.delete(ea)

    existing_teacher_stmt = select(TeacherAssignment).where(
        TeacherAssignment.teacher_id == tp.id,
        TeacherAssignment.academic_year_id == ay_id,
        TeacherAssignment.assignment_type == "CLASS_TEACHER",
    )
    existing_teacher_res = await db.execute(existing_teacher_stmt)
    for eta in existing_teacher_res.scalars().all():
        await db.delete(eta)

    # Flush pending deletions before inserting new record to satisfy PostgreSQL unique constraint
    await db.flush()

    new_assignment = TeacherAssignment(
        id=f"ta-{secrets.token_hex(8)}",
        teacher_id=tp.id,
        academic_year_id=ay_id,
        class_id=sec.class_id,
        section_id=sec.id,
        assignment_type="CLASS_TEACHER",
        is_primary=True,
    )
    db.add(new_assignment)
    await db.commit()

    await cache_delete("academics:classes_with_sections")
    await cache_delete(f"teacher:{tp.user_id}:assignments")
    await cache_delete_pattern("admin:users*")

    return ApiResponse(success=True, data=True, message="Class teacher assigned successfully.")


@router.post("/unassign/class-teacher", response_model=ApiResponse[bool])
async def unassign_class_teacher(
    payload: AssignClassTeacherRequest,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    ay_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
    ay_res = await db.execute(ay_stmt)
    ay = ay_res.scalar_one_or_none()
    ay_id = payload.academicYearId or (ay.id if ay else "ay-2026-2027")

    stmt = select(TeacherAssignment).where(
        TeacherAssignment.section_id == payload.sectionId,
        TeacherAssignment.academic_year_id == ay_id,
        TeacherAssignment.assignment_type == "CLASS_TEACHER",
    )
    res = await db.execute(stmt)
    for a in res.scalars().all():
        await db.delete(a)
    await db.commit()
    await cache_delete("academics:classes_with_sections")
    await cache_delete_pattern("admin:users*")
    return ApiResponse(success=True, data=True, message="Class teacher unassigned successfully.")


@router.post("/assign/subject-teacher", response_model=ApiResponse[bool])
async def assign_subject_teacher(
    payload: AssignSubjectTeacherRequest,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    sec = await db.get(Section, payload.sectionId)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    ay_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
    ay_res = await db.execute(ay_stmt)
    ay = ay_res.scalar_one_or_none()
    ay_id = payload.academicYearId or (ay.id if ay else "ay-2026-2027")

    tp_stmt = select(TeacherProfile).where(
        (TeacherProfile.id == payload.teacherId) | (TeacherProfile.user_id == payload.teacherId)
    )
    tp_res = await db.execute(tp_stmt)
    tp = tp_res.scalar_one_or_none()
    if not tp:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")

    check_stmt = select(TeacherAssignment).where(
        TeacherAssignment.teacher_id == tp.id,
        TeacherAssignment.section_id == sec.id,
        TeacherAssignment.subject_id == payload.subjectId,
        TeacherAssignment.academic_year_id == ay_id,
        TeacherAssignment.assignment_type == "SUBJECT_TEACHER",
    )
    existing = (await db.execute(check_stmt)).scalar_one_or_none()
    if not existing:
        new_ta = TeacherAssignment(
            id=f"ta-{secrets.token_hex(8)}",
            teacher_id=tp.id,
            academic_year_id=ay_id,
            class_id=sec.class_id,
            section_id=sec.id,
            subject_id=payload.subjectId,
            assignment_type="SUBJECT_TEACHER",
            is_primary=True,
        )
        db.add(new_ta)
        await db.commit()

    await cache_delete(f"teacher:{tp.user_id}:assignments")
    return ApiResponse(success=True, data=True, message="Subject teacher assigned successfully.")
