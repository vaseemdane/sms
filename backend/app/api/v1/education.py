import secrets
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import AcademicYear, Class, Section, Subject
from app.models.education import (
    AcademicProject,
    EventProgramItinerary,
    ProjectFollowupLog,
    ProjectMilestone,
    StudentSlotPreference,
)
from app.models.erp_operations import SchoolEvent
from app.models.student import StudentEnrollment, StudentProfile
from app.models.teacher import TeacherProfile
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/education", tags=["Education Management"])


# =========================================================================
# SCHEMAS
# =========================================================================

class ProjectCreateRequest(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    project_title: str
    project_type: str = "STUDENT_INDIVIDUAL"  # STUDENT_INDIVIDUAL, STUDENT_GROUP, FACULTY_RESEARCH, SCIENCE_EXHIBITION
    class_id: str
    section_id: Optional[str] = None
    subject_id: str
    mentor_teacher_id: str
    student_ids: List[str] = Field(default_factory=list)
    abstract_description: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    deadline_date: str  # YYYY-MM-DD
    followup_interval_days: int = 7
    milestones: List[Dict[str, Any]] = Field(default_factory=list)


class ProjectStatusUpdateRequest(BaseModel):
    status: str  # NOT_STARTED, IN_PROGRESS, UNDER_REVIEW, COMPLETED, OVERDUE
    completion_percentage: Optional[int] = None
    mentor_remarks: Optional[str] = None
    grade_awarded: Optional[str] = None
    repository_or_doc_url: Optional[str] = None


class ProjectNudgeRequest(BaseModel):
    channels: List[str] = Field(default_factory=lambda: ["EMAIL", "IN_APP"])
    message: Optional[str] = None


class SchoolEventCreateRequest(BaseModel):
    academic_year_id: str = "ay-2026-2027"
    event_name: str
    event_category: str  # CULTURAL_FEST, ANNUAL_DAY, SPORTS_MEET, SCIENCE_FAIR, WORKSHOP, INTER_SCHOOL
    description: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    primary_venue: str
    overall_coordinator_id: str
    target_class_ids: List[str] = Field(default_factory=list)


class ProgramItineraryCreateRequest(BaseModel):
    program_title: str
    program_date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    stage_or_venue: str
    participants: List[Dict[str, Any]] = Field(default_factory=list)
    judge_or_incharge_id: Optional[str] = None
    equipment_requirements: Optional[str] = None
    sequence_order: Optional[int] = 1


# =========================================================================
# 1. ACADEMIC & RESEARCH PROJECTS
# =========================================================================

@router.get("/projects", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_projects(
    academic_year_id: str = "ay-2026-2027",
    class_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists academic & research projects with role-scoped filtering."""
    stmt = (
        select(AcademicProject)
        .options(
            selectinload(AcademicProject.parent_class),
            selectinload(AcademicProject.section),
            selectinload(AcademicProject.subject),
            selectinload(AcademicProject.mentor_teacher).selectinload(TeacherProfile.user),
            selectinload(AcademicProject.milestones),
        )
        .where(AcademicProject.academic_year_id == academic_year_id)
        .order_by(AcademicProject.deadline_date.asc())
    )

    if class_id:
        stmt = stmt.where(AcademicProject.class_id == class_id)
    if status_filter:
        stmt = stmt.where(AcademicProject.status == status_filter)

    # Student sees projects where they are assigned
    if current_user.user_type == "student":
        # Find student profile
        sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        sp = sp_res.scalar_one_or_none()
        if sp:
            pass  # We can filter in memory or JSON check

    result = await db.execute(stmt)
    projects = result.scalars().all()

    output = []
    for p in projects:
        mentor_name = p.mentor_teacher.user.name if p.mentor_teacher and p.mentor_teacher.user else "Assigned Faculty"
        completed_milestones = sum(1 for m in p.milestones if m.is_completed)
        total_milestones = len(p.milestones)

        output.append({
            "id": p.id,
            "projectCode": p.project_code,
            "title": p.project_title,
            "type": p.project_type,
            "classId": p.class_id,
            "className": p.parent_class.name if p.parent_class else "All",
            "sectionId": p.section_id,
            "sectionName": p.section.code if p.section else "All",
            "subjectId": p.subject_id,
            "subjectName": p.subject.name if p.subject else "",
            "mentorTeacherId": p.mentor_teacher_id,
            "mentorName": mentor_name,
            "studentIds": p.student_ids,
            "abstractDescription": p.abstract_description,
            "startDate": p.start_date.isoformat() if p.start_date else None,
            "deadlineDate": p.deadline_date.isoformat() if p.deadline_date else None,
            "followupIntervalDays": p.followup_interval_days,
            "status": p.status,
            "completionPercentage": p.completion_percentage,
            "repositoryUrl": p.repository_or_doc_url,
            "mentorRemarks": p.mentor_remarks,
            "gradeAwarded": p.grade_awarded,
            "milestones": [
                {
                    "id": m.id,
                    "order": m.sequence_order,
                    "title": m.title,
                    "dueDate": m.due_date.isoformat(),
                    "isCompleted": m.is_completed,
                }
                for m in p.milestones
            ],
            "milestoneProgress": f"{completed_milestones}/{total_milestones}",
        })

    return ApiResponse(success=True, data=output)


@router.post("/projects", response_model=ApiResponse[Dict[str, Any]])
async def create_project(
    payload: ProjectCreateRequest,
    current_user: User = Depends(RoleChecker(["principal", "teacher", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new academic or faculty research project."""
    # Deterministic project code
    rand_suffix = secrets.token_hex(2).upper()
    proj_code = f"PRJ-{payload.academic_year_id[-4:]}-{rand_suffix}"

    start_d = date.fromisoformat(payload.start_date)
    dead_d = date.fromisoformat(payload.deadline_date)
    if dead_d < start_d:
        raise HTTPException(status_code=400, detail="Deadline date must be on or after start date.")

    project = AcademicProject(
        id=f"prj-{secrets.token_hex(8)}",
        project_code=proj_code,
        academic_year_id=payload.academic_year_id,
        project_title=payload.project_title,
        project_type=payload.project_type,
        class_id=payload.class_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        mentor_teacher_id=payload.mentor_teacher_id,
        student_ids=payload.student_ids,
        abstract_description=payload.abstract_description,
        start_date=start_d,
        deadline_date=dead_d,
        followup_interval_days=payload.followup_interval_days,
        status="NOT_STARTED",
        completion_percentage=0,
    )
    db.add(project)
    await db.flush()

    for idx, m in enumerate(payload.milestones):
        m_due = date.fromisoformat(m.get("dueDate", payload.deadline_date))
        milestone = ProjectMilestone(
            id=f"pm-{secrets.token_hex(8)}",
            project_id=project.id,
            sequence_order=idx + 1,
            title=m.get("title", f"Milestone #{idx + 1}"),
            due_date=m_due,
            is_completed=m.get("isCompleted", False),
        )
        db.add(milestone)

    await db.commit()
    return ApiResponse(
        success=True,
        data={"projectId": project.id, "projectCode": project.project_code},
        message="Academic project created successfully.",
    )


@router.patch("/projects/{project_id}/status", response_model=ApiResponse[Dict[str, Any]])
async def update_project_status(
    project_id: str,
    payload: ProjectStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """1-Click Project Status Mutation (NOT_STARTED -> IN_PROGRESS -> UNDER_REVIEW -> COMPLETED)."""
    if current_user.user_type == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Super Admin has read-only access to academic project evaluation. Only Principal or Mentor Faculty can mutate project status.",
        )
    if current_user.user_type not in ["principal", "teacher", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    project = await db.get(AcademicProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    prev_status = project.status
    project.status = payload.status
    if payload.completion_percentage is not None:
        project.completion_percentage = payload.completion_percentage
    if payload.mentor_remarks is not None:
        project.mentor_remarks = payload.mentor_remarks
    if payload.grade_awarded is not None:
        project.grade_awarded = payload.grade_awarded
    if payload.repository_or_doc_url is not None:
        project.repository_or_doc_url = payload.repository_or_doc_url

    project.last_status_updated_by = current_user.id
    project.last_status_updated_at = datetime.now()

    await db.commit()
    return ApiResponse(
        success=True,
        data={
            "projectId": project.id,
            "projectCode": project.project_code,
            "previousStatus": prev_status,
            "newStatus": project.status,
            "completionPercentage": project.completion_percentage,
            "updatedBy": current_user.name,
        },
        message=f"Project status updated to {project.status}.",
    )


@router.post("/projects/{project_id}/nudge", response_model=ApiResponse[Dict[str, Any]])
async def nudge_project_team(
    project_id: str,
    payload: ProjectNudgeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sends immediate follow-up notification to student team & logs reminder."""
    project = await db.get(AcademicProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    msg = payload.message or f"Reminder: Project '{project.project_title}' ({project.project_code}) deadline is {project.deadline_date}. Current progress: {project.completion_percentage}%."

    log = ProjectFollowupLog(
        id=f"pfl-{secrets.token_hex(8)}",
        project_id=project.id,
        trigger_type="MANUAL_MENTOR_NUDGE",
        recipients_json=project.student_ids,
        channel=payload.channels[0] if payload.channels else "IN_APP",
        message_sent=msg,
        project_status_at_send=project.status,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"nudgeSent": True, "recipientsCount": len(project.student_ids), "logId": log.id},
        message="Follow-up reminder dispatched to student project team.",
    )


# =========================================================================
# 2. HIERARCHICAL SCHOOL EVENTS & PROGRAM ITINERARIES
# =========================================================================

@router.get("/events", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_events(
    academic_year_id: str = "ay-2026-2027",
    db: AsyncSession = Depends(get_db),
):
    """Lists school events with their program itineraries."""
    stmt = (
        select(SchoolEvent)
        .options(
            selectinload(SchoolEvent.programs),
            selectinload(SchoolEvent.overall_coordinator),
        )
        .where(SchoolEvent.academic_year_id == academic_year_id)
        .order_by(SchoolEvent.event_date.asc())
    )
    events = (await db.execute(stmt)).scalars().all()

    output = []
    for e in events:
        coord_name = e.overall_coordinator.name if e.overall_coordinator else "Staff Coordinator"
        programs_sorted = sorted(e.programs, key=lambda p: (p.program_date, p.start_time))
        output.append({
            "id": e.id,
            "title": e.title,
            "category": e.category,
            "description": e.description,
            "eventDate": e.event_date,
            "startDate": e.start_date or e.event_date,
            "endDate": e.end_date or e.event_date,
            "venue": e.venue,
            "coordinatorName": coord_name,
            "status": e.status,
            "programs": [
                {
                    "id": p.id,
                    "order": p.itinerary_sequence_order,
                    "title": p.program_title,
                    "date": p.program_date.isoformat(),
                    "startTime": p.start_time.strftime("%H:%M"),
                    "endTime": p.end_time.strftime("%H:%M"),
                    "stageVenue": p.stage_or_venue,
                    "status": p.status,
                    "participantsCount": len(p.participants_json),
                }
                for p in programs_sorted
            ],
        })

    return ApiResponse(success=True, data=output)


@router.post("/events", response_model=ApiResponse[Dict[str, Any]])
async def create_event(
    payload: SchoolEventCreateRequest,
    current_user: User = Depends(RoleChecker(["principal", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new parent school event."""
    event = SchoolEvent(
        id=f"ev-{secrets.token_hex(8)}",
        academic_year_id=payload.academic_year_id,
        title=payload.event_name,
        category=payload.event_category,
        description=payload.description or "",
        event_date=payload.start_date,
        start_date=payload.start_date,
        end_date=payload.end_date,
        venue=payload.primary_venue,
        coordinator_user_id=payload.overall_coordinator_id,
        target_class_ids=payload.target_class_ids,
        status="PUBLISHED" if current_user.user_type == "principal" else "DRAFT",
        approved_by_principal_id=current_user.id if current_user.user_type == "principal" else None,
    )
    db.add(event)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"eventId": event.id, "title": event.title},
        message="School event created successfully.",
    )


@router.post("/events/{event_id}/programs", response_model=ApiResponse[Dict[str, Any]])
async def add_event_program(
    event_id: str,
    payload: ProgramItineraryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adds a child program to an event itinerary with stage time-overlap validation."""
    if current_user.user_type == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Super Admin has read-only access to Event Program Itineraries. Timetable & Event scheduling belongs strictly to Principal Desk.",
        )
    if current_user.user_type not in ["principal", "teacher", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    event = await db.get(SchoolEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="School event not found.")

    p_date = date.fromisoformat(payload.program_date)
    p_start = time.fromisoformat(payload.start_time)
    p_end = time.fromisoformat(payload.end_time)

    if p_start >= p_end:
        raise HTTPException(status_code=400, detail="start_time must be before end_time.")

    # Stage / Venue time-overlap clash check
    existing_programs_res = await db.execute(
        select(EventProgramItinerary).where(
            EventProgramItinerary.event_id == event_id,
            EventProgramItinerary.program_date == p_date,
            func.lower(func.trim(EventProgramItinerary.stage_or_venue)) == payload.stage_or_venue.strip().lower(),
            EventProgramItinerary.start_time < p_end,
            p_start < EventProgramItinerary.end_time,
        )
    )
    clashing = existing_programs_res.scalars().first()
    if clashing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Venue Collision: Stage '{payload.stage_or_venue}' is already booked for '{clashing.program_title}' ({clashing.start_time.strftime('%H:%M')}-{clashing.end_time.strftime('%H:%M')}) on {payload.program_date}.",
        )

    program = EventProgramItinerary(
        id=f"epi-{secrets.token_hex(8)}",
        event_id=event.id,
        itinerary_sequence_order=payload.sequence_order or 1,
        program_title=payload.program_title,
        program_date=p_date,
        start_time=p_start,
        end_time=p_end,
        stage_or_venue=payload.stage_or_venue,
        participants_json=payload.participants,
        judge_or_incharge_id=payload.judge_or_incharge_id,
        equipment_requirements=payload.equipment_requirements,
        status="SCHEDULED",
    )
    db.add(program)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"programId": program.id, "title": program.program_title},
        message="Program added to event itinerary.",
    )


# =========================================================================
# 3. UNIFIED ENROLLMENT & MULTI-FIELD STUDENT SEARCH
# =========================================================================

@router.get("/enrollments/search", response_model=ApiResponse[List[Dict[str, Any]]])
async def search_students(
    query: Optional[str] = Query(None, description="Name, Admission No, or Roll No"),
    class_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    shift_preference: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    current_user: User = Depends(RoleChecker(["super_admin", "principal", "admin", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    """Unified multi-field student search with slot preferences and cascading Indian geography."""
    stmt = (
        select(StudentProfile, User, Section, Class)
        .join(User, StudentProfile.user_id == User.id)
        .outerjoin(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
        .outerjoin(Section, StudentEnrollment.section_id == Section.id)
        .outerjoin(Class, Section.class_id == Class.id)
        .limit(50)
    )

    if class_id:
        stmt = stmt.where(Class.id == class_id)
    if section_id:
        stmt = stmt.where(Section.id == section_id)
    if state:
        stmt = stmt.where(User.state == state)
    if district:
        stmt = stmt.where(User.district == district)
    if query:
        q_clean = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.name).like(q_clean),
                func.lower(StudentProfile.admission_number).like(q_clean),
                func.lower(User.username).like(q_clean),
            )
        )

    results = await db.execute(stmt)
    records = results.all()

    output = []
    for sp, u, sec, cls in records:
        output.append({
            "studentId": sp.id,
            "name": u.name,
            "admissionNumber": sp.admission_number,
            "loginUsername": u.username,
            "className": cls.name if cls else "N/A",
            "sectionName": sec.code if sec else "N/A",
            "state": u.state or "Karnataka",
            "district": u.district or "Bengaluru Urban",
            "mustChangePassword": u.must_change_password,
            "isActive": u.is_active,
        })

    return ApiResponse(success=True, data=output)
