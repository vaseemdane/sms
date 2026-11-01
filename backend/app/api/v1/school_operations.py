import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import AcademicYear, Class, Section, Subject
from app.models.communication import Announcement, Notification
from app.models.student import ParentChildLink, StudentProfile
from app.models.user import User
from app.models.erp_operations import (
    ExamSchedule,
    FieldTrip,
    FieldTripConsent,
    LessonNote,
    ParentVolunteer,
    PTAMeeting,
    PTARsvp,
    SchoolEvent,
    StudentExtracurricular,
    TeacherEvaluation,
    VolunteerOpportunity,
)
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/operations", tags=["School Operations"])


# ============================================================================
# 1. LESSON NOTES & SYLLABUS
# ============================================================================
class LessonNoteCreate(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    class_id: str
    section_id: str
    subject_id: str
    unit_number: int = 1
    topic_title: str
    lesson_summary: str
    attachment_url: Optional[str] = None
    reference_link: Optional[str] = None
    syllabus_completion_pct: int = 0


@router.post("/lesson-notes", response_model=ApiResponse[Dict])
async def create_lesson_note(
    payload: LessonNoteCreate,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    note = LessonNote(
        id=f"ln-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        teacher_id=current_user.id,
        unit_number=payload.unit_number,
        topic_title=payload.topic_title,
        lesson_summary=payload.lesson_summary,
        attachment_url=payload.attachment_url,
        reference_link=payload.reference_link,
        syllabus_completion_pct=payload.syllabus_completion_pct,
    )
    db.add(note)
    await db.commit()
    return ApiResponse(success=True, data={"id": note.id}, message="Lesson note published.")


@router.get("/lesson-notes", response_model=ApiResponse[List[Dict]])
async def get_lesson_notes(
    section_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LessonNote)
    if section_id:
        stmt = stmt.where(LessonNote.section_id == section_id)
    if subject_id:
        stmt = stmt.where(LessonNote.subject_id == subject_id)
    stmt = stmt.order_by(LessonNote.published_at.desc())

    notes = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": n.id,
                "classId": n.class_id,
                "sectionId": n.section_id,
                "subjectId": n.subject_id,
                "teacherId": n.teacher_id,
                "unitNumber": n.unit_number,
                "topicTitle": n.topic_title,
                "lessonSummary": n.lesson_summary,
                "attachmentUrl": n.attachment_url,
                "referenceLink": n.reference_link,
                "syllabusCompletionPct": n.syllabus_completion_pct,
                "publishedAt": n.published_at.isoformat() if n.published_at else None,
            }
            for n in notes
        ],
    )


# ============================================================================
# 2. EXAM SCHEDULES
# ============================================================================
class ExamScheduleCreate(BaseModel):
    exam_id: str
    class_id: str
    subject_id: str
    exam_date: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    max_marks: float = 100.00
    passing_marks: float = 35.00


@router.post("/exam-schedules", response_model=ApiResponse[Dict])
async def create_exam_schedule(
    payload: ExamScheduleCreate,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    sch = ExamSchedule(
        id=f"esch-{secrets.token_hex(8)}",
        exam_id=payload.exam_id,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        exam_date=payload.exam_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        max_marks=payload.max_marks,
        passing_marks=payload.passing_marks,
    )
    db.add(sch)
    await db.commit()
    return ApiResponse(success=True, data={"id": sch.id}, message="Exam schedule published.")


@router.get("/exam-schedules", response_model=ApiResponse[List[Dict]])
async def get_exam_schedules(
    exam_id: Optional[str] = None,
    class_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ExamSchedule)
    if exam_id:
        stmt = stmt.where(ExamSchedule.exam_id == exam_id)
    if class_id:
        stmt = stmt.where(ExamSchedule.class_id == class_id)
    stmt = stmt.order_by(ExamSchedule.exam_date, ExamSchedule.start_time)

    rows = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": r.id,
                "examId": r.exam_id,
                "classId": r.class_id,
                "subjectId": r.subject_id,
                "examDate": r.exam_date,
                "startTime": r.start_time,
                "endTime": r.end_time,
                "room": r.room,
                "maxMarks": float(r.max_marks),
                "passingMarks": float(r.passing_marks),
            }
            for r in rows
        ],
    )


# ============================================================================
# 3. FIELD TRIPS & DIGITAL CONSENTS
# ============================================================================
class FieldTripCreate(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    class_id: str
    section_id: Optional[str] = None
    title: str
    destination: str
    itinerary: str
    trip_date: str
    return_date: str
    consent_deadline: str
    cost_per_student: float = 0.00


class FieldTripConsentSubmit(BaseModel):
    consent_status: str  # APPROVED, DECLINED
    digital_signature_name: str
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None


@router.post("/field-trips", response_model=ApiResponse[Dict])
async def propose_field_trip(
    payload: FieldTripCreate,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    trip = FieldTrip(
        id=f"trip-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        title=payload.title,
        destination=payload.destination,
        itinerary=payload.itinerary,
        trip_date=payload.trip_date,
        return_date=payload.return_date,
        consent_deadline=payload.consent_deadline,
        cost_per_student=payload.cost_per_student,
        coordinator_user_id=current_user.id,
        status="APPROVED" if current_user.user_type in ["principal", "admin"] else "PENDING_APPROVAL",
        approved_by_user_id=current_user.id if current_user.user_type in ["principal", "admin"] else None,
    )
    db.add(trip)
    await db.commit()
    return ApiResponse(success=True, data={"id": trip.id}, message="Field trip proposed.")


@router.get("/field-trips", response_model=ApiResponse[List[Dict]])
async def list_field_trips(
    class_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FieldTrip)
    if class_id:
        stmt = stmt.where(FieldTrip.class_id == class_id)
    stmt = stmt.order_by(FieldTrip.trip_date.desc())
    trips = (await db.execute(stmt)).scalars().all()

    out = []
    for t in trips:
        # Count consents
        consents_q = select(
            func.count(FieldTripConsent.id),
            func.sum(func.case((FieldTripConsent.consent_status == "APPROVED", 1), else_=0)),
            func.sum(func.case((FieldTripConsent.consent_status == "DECLINED", 1), else_=0)),
        ).where(FieldTripConsent.field_trip_id == t.id)
        c_res = (await db.execute(consents_q)).one()
        total_c = c_res[0] or 0
        appr_c = c_res[1] or 0
        decl_c = c_res[2] or 0

        out.append({
            "id": t.id,
            "classId": t.class_id,
            "sectionId": t.section_id,
            "title": t.title,
            "destination": t.destination,
            "itinerary": t.itinerary,
            "tripDate": t.trip_date,
            "returnDate": t.return_date,
            "consentDeadline": t.consent_deadline,
            "costPerStudent": float(t.cost_per_student),
            "status": t.status,
            "totalResponses": total_c,
            "approvedCount": int(appr_c),
            "declinedCount": int(decl_c),
        })

    return ApiResponse(success=True, data=out)


@router.patch("/field-trips/{trip_id}/approve", response_model=ApiResponse[Dict])
async def approve_field_trip(
    trip_id: str,
    current_user: User = Depends(RoleChecker(["principal", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    trip = await db.get(FieldTrip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Field trip not found.")

    trip.status = "APPROVED"
    trip.approved_by_user_id = current_user.id
    await db.commit()
    return ApiResponse(success=True, data={"id": trip.id, "status": trip.status}, message="Field trip approved.")


@router.post("/field-trips/{trip_id}/consent", response_model=ApiResponse[Dict])
async def submit_field_trip_consent(
    trip_id: str,
    payload: FieldTripConsentSubmit,
    student_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await db.get(FieldTrip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Field trip not found.")

    if current_user.user_type == "parent":
        link_stmt = select(ParentChildLink).where(
            ParentChildLink.parent_user_id == current_user.id,
            ParentChildLink.student_profile_id == student_id,
        )
        link = (await db.execute(link_stmt)).scalar_one_or_none()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only submit consent for your linked ward.",
            )

    # Upsert consent
    stmt = select(FieldTripConsent).where(
        FieldTripConsent.field_trip_id == trip_id,
        FieldTripConsent.student_id == student_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.consent_status = payload.consent_status
        existing.digital_signature_name = payload.digital_signature_name
        existing.emergency_contact_phone = payload.emergency_contact_phone
        existing.medical_notes = payload.medical_notes
        existing.responded_at = datetime.now(timezone.utc)
        consent_id = existing.id
    else:
        consent = FieldTripConsent(
            id=f"ftc-{secrets.token_hex(8)}",
            field_trip_id=trip_id,
            student_id=student_id,
            parent_user_id=current_user.id,
            consent_status=payload.consent_status,
            digital_signature_name=payload.digital_signature_name,
            emergency_contact_phone=payload.emergency_contact_phone,
            medical_notes=payload.medical_notes,
        )
        db.add(consent)
        consent_id = consent.id

    await db.commit()
    return ApiResponse(success=True, data={"id": consent_id}, message="Consent registered successfully.")


# ============================================================================
# 4. SCHOOL EVENTS & STUDENT EXTRACURRICULARS
# ============================================================================
class SchoolEventCreate(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    title: str
    category: str  # CULTURAL, SPORTS, SCIENCE_FAIR, ANNUAL_DAY, WORKSHOP
    description: str
    event_date: str
    venue: str


class ExtracurricularCreate(BaseModel):
    student_id: str
    event_id: Optional[str] = None
    activity_name: str
    category: str
    participation_date: str
    achievement_position: str  # 1ST_PLACE, 2ND_PLACE, 3RD_PLACE, FINALIST, PARTICIPANT
    remarks: Optional[str] = None
    certificate_url: Optional[str] = None


@router.post("/events", response_model=ApiResponse[Dict])
async def create_school_event(
    payload: SchoolEventCreate,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    ev = SchoolEvent(
        id=f"ev-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        event_date=payload.event_date,
        venue=payload.venue,
        coordinator_user_id=current_user.id,
    )
    db.add(ev)
    await db.commit()
    return ApiResponse(success=True, data={"id": ev.id}, message="School event registered.")


@router.get("/events", response_model=ApiResponse[List[Dict]])
async def list_school_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SchoolEvent).order_by(SchoolEvent.event_date.desc())
    events = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": e.id,
                "title": e.title,
                "category": e.category,
                "description": e.description,
                "eventDate": e.event_date,
                "venue": e.venue,
            }
            for e in events
        ],
    )


@router.post("/extracurriculars", response_model=ApiResponse[Dict])
async def record_extracurricular_achievement(
    payload: ExtracurricularCreate,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    rec = StudentExtracurricular(
        id=f"extra-{secrets.token_hex(8)}",
        student_id=payload.student_id,
        event_id=payload.event_id,
        activity_name=payload.activity_name,
        category=payload.category,
        participation_date=payload.participation_date,
        achievement_position=payload.achievement_position,
        remarks=payload.remarks,
        certificate_url=payload.certificate_url,
        recorded_by_user_id=current_user.id,
    )
    db.add(rec)
    await db.commit()
    return ApiResponse(success=True, data={"id": rec.id}, message="Achievement recorded.")


@router.get("/extracurriculars", response_model=ApiResponse[List[Dict]])
async def list_extracurriculars(
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(StudentExtracurricular)
    if student_id:
        stmt = stmt.where(StudentExtracurricular.student_id == student_id)
    stmt = stmt.order_by(StudentExtracurricular.participation_date.desc())

    items = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": i.id,
                "studentId": i.student_id,
                "activityName": i.activity_name,
                "category": i.category,
                "participationDate": i.participation_date,
                "achievementPosition": i.achievement_position,
                "remarks": i.remarks,
                "certificateUrl": i.certificate_url,
            }
            for i in items
        ],
    )


# ============================================================================
# 5. PTA MEETINGS & VOLUNTEERING
# ============================================================================
class PTAMeetingCreate(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    class_id: Optional[str] = None
    section_id: Optional[str] = None
    title: str
    agenda: str
    meeting_date: str
    start_time: str
    end_time: str
    venue_or_link: str


class PTARsvpSubmit(BaseModel):
    student_id: str
    rsvp_status: str  # ATTENDING, NOT_ATTENDING, MAYBE
    notes: Optional[str] = None


@router.post("/pta-meetings", response_model=ApiResponse[Dict])
async def schedule_pta_meeting(
    payload: PTAMeetingCreate,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    m = PTAMeeting(
        id=f"pta-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        title=payload.title,
        agenda=payload.agenda,
        meeting_date=payload.meeting_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        venue_or_link=payload.venue_or_link,
        organized_by_user_id=current_user.id,
    )
    db.add(m)
    await db.commit()
    return ApiResponse(success=True, data={"id": m.id}, message="PTA meeting convened.")


@router.get("/pta-meetings", response_model=ApiResponse[List[Dict]])
async def list_pta_meetings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PTAMeeting).order_by(PTAMeeting.meeting_date.desc())
    meetings = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": m.id,
                "classId": m.class_id,
                "sectionId": m.section_id,
                "title": m.title,
                "agenda": m.agenda,
                "meetingDate": m.meeting_date,
                "startTime": m.start_time,
                "endTime": m.end_time,
                "venueOrLink": m.venue_or_link,
            }
            for m in meetings
        ],
    )


@router.post("/pta-meetings/{id}/rsvp", response_model=ApiResponse[Dict])
async def rsvp_pta_meeting(
    id: str,
    payload: PTARsvpSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type == "parent":
        link_stmt = select(ParentChildLink).where(
            ParentChildLink.parent_user_id == current_user.id,
            ParentChildLink.student_profile_id == payload.student_id,
        )
        link = (await db.execute(link_stmt)).scalar_one_or_none()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only RSVP for your linked ward.",
            )

    stmt = select(PTARsvp).where(
        PTARsvp.pta_meeting_id == id,
        PTARsvp.parent_user_id == current_user.id,
        PTARsvp.student_id == payload.student_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.rsvp_status = payload.rsvp_status
        existing.notes = payload.notes
        existing.responded_at = datetime.now(timezone.utc)
        rsvp_id = existing.id
    else:
        rsvp = PTARsvp(
            id=f"rsv-{secrets.token_hex(8)}",
            pta_meeting_id=id,
            parent_user_id=current_user.id,
            student_id=payload.student_id,
            rsvp_status=payload.rsvp_status,
            notes=payload.notes,
        )
        db.add(rsvp)
        rsvp_id = rsvp.id

    await db.commit()
    return ApiResponse(success=True, data={"id": rsvp_id}, message="RSVP recorded.")


# ============================================================================
# 6. 360° TEACHER EVALUATIONS
# ============================================================================
class TeacherEvaluationSubmit(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    term: str = "TERM_1"
    teacher_id: str
    subject_id: str
    section_id: str
    rating_clarity: int
    rating_punctuality: int
    rating_engagement: int
    rating_support: int
    constructive_feedback: Optional[str] = None
    is_anonymous: bool = True


@router.post("/teacher-evaluations", response_model=ApiResponse[Dict])
async def submit_teacher_evaluation(
    payload: TeacherEvaluationSubmit,
    current_user: User = Depends(RoleChecker(["student", "parent"])),
    db: AsyncSession = Depends(get_db),
):
    overall = round(
        (payload.rating_clarity + payload.rating_punctuality + payload.rating_engagement + payload.rating_support)
        / 4.0,
        2,
    )

    ev = TeacherEvaluation(
        id=f"teval-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        term=payload.term,
        teacher_id=payload.teacher_id,
        subject_id=payload.subject_id,
        section_id=payload.section_id,
        evaluator_user_id=current_user.id,
        evaluator_role=current_user.user_type.upper(),
        rating_clarity=payload.rating_clarity,
        rating_punctuality=payload.rating_punctuality,
        rating_engagement=payload.rating_engagement,
        rating_support=payload.rating_support,
        overall_rating=overall,
        constructive_feedback=payload.constructive_feedback,
        is_anonymous=payload.is_anonymous,
    )
    db.add(ev)
    await db.commit()
    return ApiResponse(success=True, data={"id": ev.id, "overallRating": overall}, message="Evaluation recorded.")


@router.get("/teacher-evaluations/analytics", response_model=ApiResponse[Dict])
async def get_teacher_evaluation_analytics(
    teacher_id: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    # Strictly for Principal & Super Admin eyes only
    stmt = select(
        TeacherEvaluation.teacher_id,
        func.count(TeacherEvaluation.id),
        func.avg(TeacherEvaluation.overall_rating),
        func.avg(TeacherEvaluation.rating_clarity),
        func.avg(TeacherEvaluation.rating_punctuality),
        func.avg(TeacherEvaluation.rating_engagement),
        func.avg(TeacherEvaluation.rating_support),
    ).group_by(TeacherEvaluation.teacher_id)

    if teacher_id:
        stmt = stmt.where(TeacherEvaluation.teacher_id == teacher_id)

    rows = (await db.execute(stmt)).all()
    analytics = []
    for r in rows:
        t_user = await db.get(User, r[0])
        analytics.append({
            "teacherId": r[0],
            "teacherName": t_user.name if t_user else "Unknown Teacher",
            "totalResponses": r[1],
            "averageOverall": round(float(r[2] or 0), 2),
            "averageClarity": round(float(r[3] or 0), 2),
            "averagePunctuality": round(float(r[4] or 0), 2),
            "averageEngagement": round(float(r[5] or 0), 2),
            "averageSupport": round(float(r[6] or 0), 2),
        })

    return ApiResponse(success=True, data={"evaluations": analytics})
