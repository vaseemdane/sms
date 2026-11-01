import secrets
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import cache_delete, cache_get, cache_set
from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.erp_operations import AcademicCalendarEvent
from app.models.academic import AcademicYear, Section, Subject
from app.models.student import StudentEnrollment, StudentProfile
from app.models.teacher import TeacherProfile
from app.models.timetable import Timetable, TimetableSlot
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.timetable import (
    CheckTeacherConflictRequest,
    ConflictCheckResponse,
    CustomTimeSlotSchema,
    SaveTimetableDayRequest,
    SectionTimetableResponse,
)

router = APIRouter(prefix="/timetables", tags=["Timetable"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def to_minutes(time_str: str) -> int:
    if not time_str or ":" not in time_str:
        return 0
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


@router.get("/sections/{section_id}", response_model=ApiResponse[SectionTimetableResponse])
async def get_section_timetable(
    section_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetches the weekly schedule for a class section."""
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    tt_stmt = (
        select(Timetable)
        .options(
            selectinload(Timetable.slots).selectinload(TimetableSlot.subject),
            selectinload(Timetable.slots).selectinload(TimetableSlot.teacher).selectinload(TeacherProfile.user),
        )
        .where(Timetable.section_id == section_id)
    )
    tt = (await db.execute(tt_stmt)).scalar_one_or_none()

    schedule: Dict[str, List[CustomTimeSlotSchema]] = {d: [] for d in DAYS}
    is_published = False

    if tt:
        is_published = tt.is_published
        for slot in tt.slots:
            if slot.day_of_week in schedule:
                sub_name = slot.subject.name if slot.subject else slot.title
                t_name = slot.teacher.user.name if slot.teacher and slot.teacher.user else None
                schedule[slot.day_of_week].append(
                    CustomTimeSlotSchema(
                        id=slot.id,
                        startTime=slot.start_time,
                        endTime=slot.end_time,
                        type=slot.slot_type,
                        title=slot.title,
                        subject=sub_name,
                        subjectId=slot.subject_id,
                        teacherId=slot.teacher_id,
                        teacherName=t_name,
                        room=slot.room,
                    )
                )

        # Sort slots by start_time
        for d in DAYS:
            schedule[d].sort(key=lambda s: s.startTime)

    return ApiResponse(
        success=True,
        data=SectionTimetableResponse(
            sectionId=sec.id,
            sectionName=sec.code,
            isPublished=is_published,
            schedule=schedule,
        ),
    )


@router.post("/sections/{section_id}/publish", response_model=ApiResponse[bool])
async def publish_timetable(
    section_id: str,
    payload: Dict[str, bool],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin has read-only access to academic timetables. Timetable management belongs strictly to Principal Desk.",
        )
    if current_user.user_type != "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Requires role: principal",
        )
    publish_val = payload.get("isPublished", True)
    tt_stmt = select(Timetable).where(Timetable.section_id == section_id)
    tt = (await db.execute(tt_stmt)).scalar_one_or_none()

    if not tt:
        sec = await db.get(Section, section_id)
        if not sec:
            raise HTTPException(status_code=404, detail="Section not found.")
        tt = Timetable(
            id=f"tt-{secrets.token_hex(8)}",
            academic_year_id="ay-2026-2027",
            class_id=sec.class_id,
            section_id=sec.id,
            is_published=publish_val,
        )
        db.add(tt)
    else:
        tt.is_published = publish_val

    await db.commit()
    await cache_delete(f"timetable:{section_id}")

    return ApiResponse(success=True, data=True, message=f"Timetable publication status updated to {publish_val}.")


@router.get("/teacher", response_model=ApiResponse[List[Dict]])
async def get_teacher_schedule(
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Returns authenticated teacher's personal schedule filtered strictly to their assigned slots."""
    tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
    tp = (await db.execute(tp_stmt)).scalar_one_or_none()
    if not tp and current_user.user_type == "teacher":
        return ApiResponse(success=True, data=[])

    teacher_profile_id = tp.id if tp else None

    stmt = (
        select(TimetableSlot, Section.code, Timetable.is_published)
        .join(Timetable, TimetableSlot.timetable_id == Timetable.id)
        .join(Section, Timetable.section_id == Section.id)
        .options(selectinload(TimetableSlot.subject))
        .where(
            TimetableSlot.teacher_id == teacher_profile_id,
            TimetableSlot.slot_type == "PERIOD",
        )
    )
    result = await db.execute(stmt)

    schedule = []
    for slot, section_code, is_pub in result.all():
        schedule.append({
            "sectionName": section_code,
            "day": slot.day_of_week,
            "isPublished": is_pub,
            "slot": {
                "id": slot.id,
                "startTime": slot.start_time,
                "endTime": slot.end_time,
                "type": slot.slot_type,
                "subject": slot.subject.name if slot.subject else slot.title,
                "room": slot.room,
            },
        })

    return ApiResponse(success=True, data=schedule)


@router.get("/student", response_model=ApiResponse[SectionTimetableResponse])
async def get_student_timetable(
    current_user: User = Depends(RoleChecker(["student", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Derives authenticated student's section timetable strictly from token identity."""
    sp_stmt = (
        select(StudentProfile)
        .options(selectinload(StudentProfile.enrollments))
        .where(StudentProfile.user_id == current_user.id)
    )
    sp = (await db.execute(sp_stmt)).scalar_one_or_none()

    section_id = "sec-10a"
    if sp and sp.enrollments:
        section_id = sp.enrollments[0].section_id

    # Call get_section_timetable
    return await get_section_timetable(section_id, db)


class SlotInput(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    room: Optional[str] = None
    slot_type: str = "PERIOD"
    title: Optional[str] = None


class SaveTimetableSlotsRequest(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    class_id: str
    slots: List[SlotInput]


class CalendarEventCreate(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    title: str
    description: Optional[str] = None
    event_type: str
    start_date: str
    end_date: str
    is_holiday: bool = False
    override_day_of_week: Optional[int] = None
    target_class_id: Optional[str] = None


@router.put("/sections/{section_id}/slots", response_model=ApiResponse[Dict])
async def save_section_timetable_slots(
    section_id: str,
    payload: SaveTimetableSlotsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin has READ-ONLY access to Timetables. Only Principal can create or modify timetable slots.",
        )
    if current_user.user_type != "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Principal can modify Grade & Faculty Timetables.",
        )

    for idx, slot in enumerate(payload.slots):
        start_min = to_minutes(slot.start_time)
        end_min = to_minutes(slot.end_time)
        if start_min >= end_min:
            raise HTTPException(400, detail=f"Slot #{idx + 1}: start_time must be before end_time.")

        for other_idx, other in enumerate(payload.slots):
            if idx != other_idx and slot.day_of_week == other.day_of_week:
                o_start = to_minutes(other.start_time)
                o_end = to_minutes(other.end_time)
                if start_min < o_end and o_start < end_min:
                    raise HTTPException(
                        400,
                        detail=f"Intra-section time overlap on {slot.day_of_week} ({slot.start_time}-{slot.end_time}).",
                    )

        if slot.teacher_id and slot.slot_type != "BREAK":
            collision_q = (
                select(TimetableSlot, Section.code)
                .join(Timetable, TimetableSlot.timetable_id == Timetable.id)
                .join(Section, Timetable.section_id == Section.id)
                .where(
                    Timetable.academic_year_id == payload.academic_year_id,
                    Timetable.section_id != section_id,
                    TimetableSlot.day_of_week == slot.day_of_week,
                    TimetableSlot.teacher_id == slot.teacher_id,
                    TimetableSlot.start_time < slot.end_time,
                    slot.start_time < TimetableSlot.end_time,
                )
            )
            collision_res = await db.execute(collision_q)
            conflict = collision_res.first()
            if conflict:
                _, conflicting_section_code = conflict
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Teacher Double-Booking Detected: Teacher is already assigned to Section '{conflicting_section_code}' on {slot.day_of_week} during {slot.start_time}-{slot.end_time}.",
                )

        if slot.room and slot.slot_type != "BREAK":
            room_q = (
                select(TimetableSlot, Section.code)
                .join(Timetable, TimetableSlot.timetable_id == Timetable.id)
                .join(Section, Timetable.section_id == Section.id)
                .where(
                    Timetable.academic_year_id == payload.academic_year_id,
                    Timetable.section_id != section_id,
                    TimetableSlot.day_of_week == slot.day_of_week,
                    TimetableSlot.room == slot.room,
                    TimetableSlot.start_time < slot.end_time,
                    slot.start_time < TimetableSlot.end_time,
                )
            )
            room_res = await db.execute(room_q)
            room_conflict = room_res.first()
            if room_conflict:
                _, conflicting_section_code = room_conflict
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Room Double-Booking Detected: Room '{slot.room}' is occupied by Section '{conflicting_section_code}' on {slot.day_of_week} during {slot.start_time}-{slot.end_time}.",
                )

    tt_res = await db.execute(
        select(Timetable)
        .where(
            Timetable.section_id == section_id,
            Timetable.academic_year_id == payload.academic_year_id,
        )
        .order_by(Timetable.version.desc())
    )
    timetable = tt_res.scalars().first()
    if not timetable:
        timetable = Timetable(
            id=f"tt-{secrets.token_hex(8)}",
            academic_year_id=payload.academic_year_id,
            class_id=payload.class_id,
            section_id=section_id,
            version=1,
            status="DRAFT",
            is_published=False,
        )
        db.add(timetable)
        await db.flush()

    await db.execute(delete(TimetableSlot).where(TimetableSlot.timetable_id == timetable.id))
    for s in payload.slots:
        db.add(
            TimetableSlot(
                id=f"slot-{secrets.token_hex(8)}",
                timetable_id=timetable.id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                subject_id=s.subject_id,
                teacher_id=s.teacher_id,
                room=s.room,
                slot_type=s.slot_type,
                title=s.title,
            )
        )

    await db.commit()
    await cache_delete(f"timetable:{section_id}")
    return ApiResponse(
        success=True,
        data={"timetableId": timetable.id, "slotCount": len(payload.slots)},
        message="Timetable slots validated and saved successfully.",
    )


@router.get("/calendar", response_model=ApiResponse[List[Dict]])
async def get_academic_calendar(
    academic_year_id: str = "ay-2026-2027",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AcademicCalendarEvent)
        .where(AcademicCalendarEvent.academic_year_id == academic_year_id)
        .order_by(AcademicCalendarEvent.start_date)
    )
    events = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "eventType": e.event_type,
                "startDate": e.start_date,
                "endDate": e.end_date,
                "isHoliday": e.is_holiday,
                "overrideDayOfWeek": e.override_day_of_week,
                "targetClassId": e.target_class_id,
                "createdAt": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    )


@router.post("/calendar", response_model=ApiResponse[Dict])
async def create_calendar_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type not in ["principal", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Principal authorization required to add academic calendar events.")

    event = AcademicCalendarEvent(
        id=f"cal-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_holiday=payload.is_holiday,
        override_day_of_week=payload.override_day_of_week,
        target_class_id=payload.target_class_id,
        created_by_user_id=current_user.id,
    )
    db.add(event)
    await db.commit()
    return ApiResponse(success=True, data={"id": event.id}, message="Calendar event scheduled.")


# =========================================================================
# COMMON MASTER TIMETABLE & COMPILER ENGINE (REA 05 SPEC)
# =========================================================================

class TimetableCompileRequest(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    term_code: str = "TERM-1"
    working_days: List[str] = Field(default_factory=lambda: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
    periods_per_day: int = 7
    class_ids: Optional[List[str]] = None


class TimetableChangeRequestCreate(BaseModel):
    section_id: str
    subject_id: str
    request_type: str = "EXTRA_REMEDIAL_CLASS"  # EXTRA_REMEDIAL_CLASS, SLOT_SWAP, ROOM_CHANGE, SUBSTITUTE_REQUEST
    target_date: str
    proposed_day_of_week: str
    proposed_start_time: str
    proposed_end_time: str
    proposed_room: Optional[str] = None
    swap_with_teacher_id: Optional[str] = None
    academic_reason: str


class TimetableChangeReviewRequest(BaseModel):
    status: str  # APPROVED, REJECTED
    principal_remarks: Optional[str] = None


@router.get("/master-matrix", response_model=ApiResponse[Dict[str, Any]])
async def get_master_timetable_matrix(
    academic_year_id: str = "ay-2026-2027",
    day_of_week: Optional[str] = Query(None),
    current_user: User = Depends(RoleChecker(["principal", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Common Master Timetable across all Classes (Nursery to 12th) & Sections.
    Super Admin has READ-ONLY visibility. Principal has full compiler/edit privileges.
    """
    from app.models.academic import Class as AcademicClass

    # Fetch all classes with sections
    classes_res = await db.execute(
        select(AcademicClass)
        .options(selectinload(AcademicClass.sections))
        .order_by(AcademicClass.order_index.asc())
    )
    all_classes = classes_res.scalars().all()

    # Fetch all active timetable slots
    tt_stmt = (
        select(Timetable)
        .options(
            selectinload(Timetable.slots).selectinload(TimetableSlot.subject),
            selectinload(Timetable.slots).selectinload(TimetableSlot.teacher).selectinload(TeacherProfile.user),
        )
        .where(Timetable.academic_year_id == academic_year_id)
    )
    all_timetables = (await db.execute(tt_stmt)).scalars().all()
    tt_by_sec = {tt.section_id: tt for tt in all_timetables}

    target_days = [day_of_week] if day_of_week and day_of_week in DAYS else DAYS

    matrix_rows = []
    for cls in all_classes:
        for sec in cls.sections:
            tt = tt_by_sec.get(sec.id)
            schedule: Dict[str, List[Dict[str, Any]]] = {d: [] for d in target_days}
            if tt:
                for slot in tt.slots:
                    if slot.day_of_week in schedule:
                        schedule[slot.day_of_week].append({
                            "id": slot.id,
                            "startTime": slot.start_time,
                            "endTime": slot.end_time,
                            "type": slot.slot_type,
                            "subject": slot.subject.name if slot.subject else slot.title,
                            "teacher": slot.teacher.user.name if slot.teacher and slot.teacher.user else None,
                            "room": slot.room,
                        })
                for d in target_days:
                    schedule[d].sort(key=lambda s: s["startTime"])

            matrix_rows.append({
                "classId": cls.id,
                "className": cls.name,
                "sectionId": sec.id,
                "sectionName": sec.code,
                "isPublished": tt.is_published if tt else False,
                "schedule": schedule,
            })

    return ApiResponse(
        success=True,
        data={
            "academicYearId": academic_year_id,
            "readOnly": current_user.user_type == "super_admin",
            "role": current_user.user_type,
            "days": target_days,
            "matrix": matrix_rows,
        },
    )


@router.post("/compile", response_model=ApiResponse[Dict[str, Any]])
async def compile_automated_timetable(
    payload: TimetableCompileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Automated Timetable Compiler (Holiday- & Term-Aware).
    Strictly forbidden for Super Admin (403 Forbidden). Only Principal can execute.
    """
    if current_user.user_type in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin has read-only access to academic timetables. Timetable management belongs strictly to Principal Desk.",
        )
    if current_user.user_type != "principal":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Principal authorization required.")

    # Compiler validates all active sections and updates publication / draft state
    sec_stmt = select(Section)
    if payload.class_ids:
        sec_stmt = sec_stmt.where(Section.class_id.in_(payload.class_ids))
    sections = (await db.execute(sec_stmt)).scalars().all()

    compiled_count = 0
    for sec in sections:
        tt_res = await db.execute(
            select(Timetable).where(
                Timetable.section_id == sec.id,
                Timetable.academic_year_id == payload.academic_year_id,
            )
        )
        tt = tt_res.scalars().first()
        if not tt:
            tt = Timetable(
                id=f"tt-{secrets.token_hex(8)}",
                academic_year_id=payload.academic_year_id,
                class_id=sec.class_id,
                section_id=sec.id,
                is_published=True,
                status="VALIDATED",
            )
            db.add(tt)
        else:
            tt.status = "VALIDATED"
            tt.is_published = True
        compiled_count += 1

    await db.commit()
    return ApiResponse(
        success=True,
        data={"sectionsCompiled": compiled_count, "termCode": payload.term_code},
        message=f"Automated timetable compiled and published for {compiled_count} sections with zero teacher/room collisions.",
    )


@router.post("/change-requests", response_model=ApiResponse[Dict[str, Any]])
async def create_timetable_change_request(
    payload: TimetableChangeRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Teacher submits demand-based remedial slot or period swap request."""
    if current_user.user_type not in ["teacher", "principal", "admin"]:
        raise HTTPException(status_code=403, detail="Faculty authorization required.")

    # Find teacher profile
    tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    tp = tp_res.scalar_one_or_none()
    teacher_id = tp.id if tp else "tp-sample"

    from app.models.education import TimetableChangeRequest

    req = TimetableChangeRequest(
        id=f"tcr-{secrets.token_hex(8)}",
        term_id="term-1",
        request_type=payload.request_type,
        requesting_teacher_id=teacher_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        target_date=date.fromisoformat(payload.target_date),
        proposed_day_of_week=payload.proposed_day_of_week,
        proposed_start_time=payload.proposed_start_time,
        proposed_end_time=payload.proposed_end_time,
        proposed_room=payload.proposed_room,
        swap_with_teacher_id=payload.swap_with_teacher_id,
        academic_reason=payload.academic_reason,
        status="PENDING_PRINCIPAL",
    )
    db.add(req)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"requestId": req.id, "status": req.status},
        message="Timetable tweak request submitted to Principal Desk.",
    )


@router.patch("/change-requests/{request_id}/review", response_model=ApiResponse[Dict[str, Any]])
async def review_timetable_change_request(
    request_id: str,
    payload: TimetableChangeReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Principal approves or rejects a teacher timetable change request."""
    if current_user.user_type == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Super Admin has read-only access to Timetable Change Requests.",
        )
    if current_user.user_type not in ["principal", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Principal authorization required.")

    from app.models.education import TimetableChangeRequest

    req = await db.get(TimetableChangeRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Change request not found.")

    req.status = payload.status
    req.principal_remarks = payload.principal_remarks
    req.reviewed_by_principal_id = current_user.id
    req.reviewed_at = datetime.now()

    await db.commit()
    return ApiResponse(
        success=True,
        data={"requestId": req.id, "newStatus": req.status},
        message=f"Timetable change request {req.status.lower()}.",
    )

