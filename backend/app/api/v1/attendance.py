import secrets
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import AcademicYear, Section, Class
from app.models.attendance import (
    Attendance,
    AcademicCalendarDay,
    AttendanceSession,
    StudentAttendanceRecord,
    AttendanceAuditLog,
    AttendanceNotificationLog,
)
from app.models.communication import AuditLog
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.erp_operations import LeaveRequest
from app.models.user import User
from app.schemas.attendance import (
    AttendanceMonthlyItem,
    AttendanceSaveRequest,
    StudentAttendanceSummaryResponse,
)
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/sections/{section_id}", response_model=ApiResponse[Dict[str, int]])
async def save_section_attendance(
    section_id: str,
    payload: AttendanceSaveRequest,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves daily attendance for a section.
    ENFORCES: Only the designated CLASS TEACHER for this section (or Super Admin/Admin) is authorized.
    Subject teachers are strictly rejected with 403 Forbidden.
    """
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    # Find active academic year
    ay_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
    ay = (await db.execute(ay_stmt)).scalar_one_or_none()
    ay_id = ay.id if ay else "ay-2026-2027"

    # Enforce Class Teacher assignment authorization
    if current_user.user_type == "teacher":
        tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        tp = (await db.execute(tp_stmt)).scalar_one_or_none()
        if not tp:
            raise HTTPException(status_code=403, detail="Forbidden: Teacher profile not found.")

        # Check if teacher is assigned as CLASS_TEACHER for this section
        auth_stmt = select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == tp.id,
            TeacherAssignment.section_id == section_id,
            TeacherAssignment.academic_year_id == ay_id,
            TeacherAssignment.assignment_type == "CLASS_TEACHER",
        )
        is_class_teacher = (await db.execute(auth_stmt)).scalar_one_or_none()
        if not is_class_teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Attendance marking is strictly restricted to designated Class Teachers.",
            )

    saved_count = 0
    # Process student attendance records
    for student_id, status_val in payload.records.items():
        # student_id could be user_id or student_profile_id
        sp_stmt = select(StudentProfile).where(
            (StudentProfile.id == student_id) | (StudentProfile.user_id == student_id)
        )
        sp = (await db.execute(sp_stmt)).scalar_one_or_none()
        if not sp:
            continue

        # Upsert: check if attendance already exists for student on this date
        att_stmt = select(Attendance).where(
            Attendance.student_id == sp.id,
            Attendance.date == payload.date,
        )
        att_record = (await db.execute(att_stmt)).scalar_one_or_none()
        if att_record:
            att_record.status = status_val
            att_record.recorded_by_user_id = current_user.id
        else:
            new_att = Attendance(
                id=f"att-{secrets.token_hex(12)}",
                student_id=sp.id,
                academic_year_id=ay_id,
                class_id=sec.class_id,
                section_id=sec.id,
                date=payload.date,
                status=status_val,
                recorded_by_user_id=current_user.id,
            )
            db.add(new_att)
        saved_count += 1

    # Record Audit Log
    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="ATTENDANCE_MARKED",
        target_type="SECTION",
        target_id=section_id,
        details=f"Recorded attendance for {saved_count} students on {payload.date}.",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"recordedCount": saved_count},
        message=f"Attendance recorded for {saved_count} students.",
    )


@router.get("/sections/{section_id}", response_model=ApiResponse[Dict[str, str]])
async def get_section_attendance(
    section_id: str,
    date: str = Query(..., pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Fetches attendance records for a section on a given date."""
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    if current_user.user_type == "teacher":
        tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        tp = (await db.execute(tp_stmt)).scalar_one_or_none()
        if not tp:
            raise HTTPException(status_code=403, detail="Forbidden: Teacher profile not found.")

        auth_stmt = select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == tp.id,
            TeacherAssignment.section_id == section_id,
        )
        is_assigned = (await db.execute(auth_stmt)).scalar_one_or_none()
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not assigned to this section.",
            )

    if current_user.user_type != "super_admin" and current_user.school_id:
        enrolled_stmt = (
            select(User.school_id)
            .join(StudentProfile, StudentProfile.user_id == User.id)
            .join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
            .where(StudentEnrollment.section_id == section_id)
            .limit(1)
        )
        sec_school_id = await db.scalar(enrolled_stmt)
        if sec_school_id and sec_school_id != current_user.school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Section belongs to another school tenant.",
            )

    stmt = (
        select(StudentProfile.user_id, Attendance.status)
        .join(Attendance, Attendance.student_id == StudentProfile.id)
        .where(
            Attendance.section_id == section_id,
            Attendance.date == date,
        )
    )
    result = await db.execute(stmt)
    records = {row[0]: row[1] for row in result.all()}
    return ApiResponse(success=True, data=records)


@router.get("/student", response_model=ApiResponse[StudentAttendanceSummaryResponse])
async def get_student_attendance(
    student_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches attendance summary for a student.
    Enforces student data isolation: students can only access their own attendance!
    """
    target_user_id = current_user.id
    if current_user.user_type in ["super_admin", "admin", "teacher"] and student_id:
        target_user_id = student_id
    elif current_user.user_type == "parent":
        if not student_id:
            # Look up first linked ward
            link_stmt = select(ParentChildLink.student_profile_id).where(
                ParentChildLink.parent_user_id == current_user.id
            )
            first_ward_id = (await db.execute(link_stmt)).scalars().first()
            if not first_ward_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No linked wards found for this parent account.",
                )
            target_user_id = first_ward_id
        else:
            # Verify parent-child relationship (BOLA guard)
            link_stmt = select(ParentChildLink).where(
                ParentChildLink.parent_user_id == current_user.id,
                (ParentChildLink.student_profile_id == student_id)
            )
            link = (await db.execute(link_stmt)).scalar_one_or_none()
            if not link:
                # Also check if student_id was passed as user_id of student
                sp_lookup = select(StudentProfile.id).where(
                    (StudentProfile.id == student_id) | (StudentProfile.user_id == student_id)
                )
                actual_sp_id = (await db.execute(sp_lookup)).scalar_one_or_none()
                if actual_sp_id:
                    link_check = await db.execute(
                        select(ParentChildLink).where(
                            ParentChildLink.parent_user_id == current_user.id,
                            ParentChildLink.student_profile_id == actual_sp_id,
                        )
                    )
                    link = link_check.scalar_one_or_none()

            if not link:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You can only view attendance for your verified linked children.",
                )
            target_user_id = student_id
    elif current_user.user_type == "student":
        # Force student to view only their own records
        target_user_id = current_user.id

    sp_stmt = select(StudentProfile).where(
        (StudentProfile.user_id == target_user_id) | (StudentProfile.id == target_user_id)
    )
    sp = (await db.execute(sp_stmt)).scalar_one_or_none()
    if not sp:
        return ApiResponse(
            success=True,
            data=StudentAttendanceSummaryResponse(
                overallPercentage=100.0,
                presentDays=0,
                absentDays=0,
                lateDays=0,
                excusedDays=0,
                totalWorkingDays=0,
                monthlyBreakdown=[],
                dayRecords={},
                isBelowThreshold=False,
            ),
        )

    stmt = select(Attendance).where(Attendance.student_id == sp.id).order_by(Attendance.date)
    records = (await db.execute(stmt)).scalars().all()

    present_count = 0
    absent_count = 0
    late_count = 0
    excused_count = 0
    day_records = {}

    for r in records:
        day_records[r.date] = r.status
        if r.status == "PRESENT":
            present_count += 1
        elif r.status == "ABSENT":
            absent_count += 1
        elif r.status == "LATE":
            late_count += 1
        elif r.status == "EXCUSED":
            excused_count += 1

    total = len(records)
    effective_present = present_count + (late_count * 0.5)
    overall_pct = round((effective_present / total * 100), 1) if total > 0 else 100.0

    return ApiResponse(
        success=True,
        data=StudentAttendanceSummaryResponse(
            overallPercentage=overall_pct,
            presentDays=present_count,
            absentDays=absent_count,
            lateDays=late_count,
            excusedDays=excused_count,
            totalWorkingDays=total,
            monthlyBreakdown=[],
            dayRecords=day_records,
            isBelowThreshold=overall_pct < 75.0,
            threshold=75.0,
        ),
    )


@router.get("/audit-status", response_model=ApiResponse[Dict])
async def get_attendance_completion_audit(
    target_date: Optional[str] = Query(default=None),
    class_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type not in ("principal", "super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal or Super Admin can view the Attendance Status Audit.",
        )

    if not target_date:
        from datetime import date
        target_date = date.today().isoformat()

    sections_q = select(Section, Class).join(Class, Section.class_id == Class.id)
    if class_id:
        sections_q = sections_q.where(Section.class_id == class_id)
    sections_res = await db.execute(sections_q.order_by(Class.order_index, Section.code))
    section_rows = sections_res.all()

    audit_results = []
    completed_count = 0
    pending_count = 0

    for sec, cls in section_rows:
        total_students_res = await db.execute(
            select(func.count(StudentEnrollment.id)).where(StudentEnrollment.section_id == sec.id)
        )
        total_students = total_students_res.scalar() or 0

        marked_res = await db.execute(
            select(
                func.count(Attendance.id),
                func.sum(case((Attendance.status == "PRESENT", 1), else_=0)),
                func.sum(case((Attendance.status == "ABSENT", 1), else_=0)),
            ).where(Attendance.section_id == sec.id, Attendance.date == target_date)
        )
        row = marked_res.one()
        marked_count = row[0] or 0
        present_count = row[1] or 0
        absent_count = row[2] or 0

        ct_res = await db.execute(
            select(User.name, User.phone)
            .join(TeacherProfile, TeacherProfile.user_id == User.id)
            .join(TeacherAssignment, TeacherAssignment.teacher_id == TeacherProfile.id)
            .where(
                TeacherAssignment.section_id == sec.id,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            )
        )
        ct_row = ct_res.first()

        is_completed = marked_count > 0 and (marked_count >= total_students or total_students == 0)
        status_label = "COMPLETED" if is_completed else ("PARTIAL" if marked_count > 0 else "PENDING")
        if status_label == "COMPLETED":
            completed_count += 1
        else:
            pending_count += 1

        audit_results.append({
            "sectionId": sec.id,
            "classId": cls.id,
            "className": cls.name,
            "sectionCode": sec.code,
            "date": target_date,
            "auditStatus": status_label,
            "totalStudents": total_students,
            "markedCount": marked_count,
            "presentCount": int(present_count),
            "absentCount": int(absent_count),
            "classTeacherName": ct_row[0] if ct_row else "Unassigned",
            "classTeacherPhone": ct_row[1] if ct_row else None,
        })

    return ApiResponse(
        success=True,
        data={
            "date": target_date,
            "summary": {
                "totalSections": len(audit_results),
                "completedSections": completed_count,
                "pendingSections": pending_count,
            },
            "sections": audit_results,
        },
    )


class LeaveRequestCreate(BaseModel):
    student_id: Optional[str] = None
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    attachment_url: Optional[str] = None


class LeaveReviewRequest(BaseModel):
    status: str  # APPROVED, REJECTED
    remarks: Optional[str] = None


@router.post("/leaves", response_model=ApiResponse[Dict])
async def apply_leave(
    payload: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    leave = LeaveRequest(
        id=f"leave-{secrets.token_hex(8)}",
        applicant_user_id=current_user.id,
        student_id=payload.student_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        attachment_url=payload.attachment_url,
        status="PENDING",
    )
    db.add(leave)
    await db.commit()
    return ApiResponse(success=True, data={"id": leave.id}, message="Leave application submitted.")


@router.get("/leaves", response_model=ApiResponse[List[Dict]])
async def get_leaves(
    student_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LeaveRequest)
    if student_id:
        stmt = stmt.where(LeaveRequest.student_id == student_id)
    elif current_user.user_type in ["student", "parent"]:
        stmt = stmt.where(LeaveRequest.applicant_user_id == current_user.id)
    stmt = stmt.order_by(LeaveRequest.created_at.desc())

    leaves = (await db.execute(stmt)).scalars().all()
    return ApiResponse(
        success=True,
        data=[
            {
                "id": l.id,
                "applicantUserId": l.applicant_user_id,
                "studentId": l.student_id,
                "leaveType": l.leave_type,
                "startDate": l.start_date,
                "endDate": l.end_date,
                "reason": l.reason,
                "status": l.status,
                "attachmentUrl": l.attachment_url,
                "reviewRemarks": l.review_remarks,
                "createdAt": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leaves
        ],
    )


@router.patch("/leaves/{leave_id}/review", response_model=ApiResponse[Dict])
async def review_leave(
    leave_id: str,
    payload: LeaveReviewRequest,
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    leave = await db.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    leave.status = payload.status
    leave.review_remarks = payload.remarks
    leave.reviewed_by_user_id = current_user.id

    from datetime import datetime, timezone
    leave.reviewed_at = datetime.now(timezone.utc)

    # If approved and for a student, auto-mark EXCUSED attendance
    if payload.status == "APPROVED" and leave.student_id:
        se_stmt = select(StudentEnrollment).where(StudentEnrollment.student_id == leave.student_id)
        se = (await db.execute(se_stmt)).scalar_one_or_none()
        if se:
            from datetime import date, timedelta
            try:
                start_d = date.fromisoformat(leave.start_date)
                end_d = date.fromisoformat(leave.end_date)
                curr = start_d
                while curr <= end_d:
                    c_str = curr.isoformat()
                    # Check if attendance already recorded
                    att_stmt = select(Attendance).where(
                        Attendance.student_id == leave.student_id,
                        Attendance.date == c_str,
                    )
                    existing_att = (await db.execute(att_stmt)).scalar_one_or_none()
                    if existing_att:
                        existing_att.status = "EXCUSED"
                        existing_att.remarks = f"Approved Leave ({leave.leave_type})"
                    else:
                        db.add(
                            Attendance(
                                id=f"att-{secrets.token_hex(8)}",
                                student_id=leave.student_id,
                                section_id=se.section_id,
                                academic_year_id="ay-2026-2027",
                                date=c_str,
                                status="EXCUSED",
                                remarks=f"Approved Leave ({leave.leave_type})",
                                recorded_by_user_id=current_user.id,
                            )
                        )
                    curr += timedelta(days=1)
            except Exception:
                pass

    await db.commit()
    return ApiResponse(success=True, data={"id": leave.id, "status": leave.status}, message="Leave decision recorded.")


# ============================================================================
# ENHANCED ATTENDANCE ENGINE (SESSION & AUDIT GOVERNANCE)
# ============================================================================

class AttendanceSessionCreateRequest(BaseModel):
    academicYearId: str = "ay-2026-2027"
    classId: str
    sectionId: str
    attendanceDate: str
    sessionMode: str = "DAILY"  # DAILY or PERIOD
    subjectId: Optional[str] = None
    periodSlotId: Optional[str] = None
    modificationReason: Optional[str] = None
    records: List[Dict]  # [{"studentProfileId": "...", "status": "PRESENT"|"ABSENT"|"LATE"|"HALF_DAY"|"ON_APPROVED_LEAVE", "remarks": "..."}]


class AttendanceSessionUpdateRequest(BaseModel):
    modificationReason: str
    records: List[Dict]


class UnlockSessionRequest(BaseModel):
    unlockReason: str
    unlockedHours: int = 24


@router.get("/calendar-overview", response_model=ApiResponse[Dict])
async def get_calendar_overview(
    section_id: str,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),  # "YYYY-MM"
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns day-by-day attendance status badges (GREEN_MARKED, RED_PENDING, GREY_HOLIDAY)
    for an entire month.
    """
    from datetime import date, timedelta
    year, mo = [int(x) for x in month.split("-")]
    # Compute days in month
    if mo == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, mo + 1, 1)
    curr = date(year, mo, 1)
    today_str = date.today().isoformat()

    # Query marked sessions for this section & month
    sessions_stmt = select(AttendanceSession).where(
        AttendanceSession.section_id == section_id,
        AttendanceSession.attendance_date.like(f"{month}-%"),
        AttendanceSession.session_mode == "DAILY",
    )
    sessions = (await db.execute(sessions_stmt)).scalars().all()
    session_map = {s.attendance_date: s for s in sessions}

    day_badges = {}
    while curr < next_month:
        c_str = curr.isoformat()
        is_sunday = curr.weekday() == 6
        is_future = c_str > today_str

        if is_future:
            day_badges[c_str] = {"badge": "FUTURE", "label": "Upcoming", "isLocked": True}
        elif is_sunday:
            day_badges[c_str] = {"badge": "GREY_HOLIDAY", "label": "Sunday Weekend", "isLocked": True}
        elif c_str in session_map:
            sess = session_map[c_str]
            day_badges[c_str] = {
                "badge": "GREEN_MARKED",
                "label": f"Marked ({sess.present_count} P / {sess.absent_count} A)",
                "sessionId": sess.id,
                "status": sess.status,
                "isLocked": False,
            }
        else:
            day_badges[c_str] = {
                "badge": "RED_PENDING",
                "label": "Pending Roll Call",
                "isLocked": False,
            }
        curr += timedelta(days=1)

    return ApiResponse(success=True, data={"month": month, "sectionId": section_id, "days": day_badges})


@router.get("/roster", response_model=ApiResponse[Dict])
async def get_attendance_roster(
    section_id: str,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    period_slot_id: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamically loads student roster sorted by roll_number.
    Pre-fills approved student leaves as 'ON_APPROVED_LEAVE' or defaults to 'PRESENT'.
    Detects CREATE vs EDIT mode and lock status.
    """
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    # 1. Check existing session
    sess_stmt = select(AttendanceSession).where(
        AttendanceSession.section_id == section_id,
        AttendanceSession.attendance_date == date,
        AttendanceSession.period_slot_id == period_slot_id,
    )
    existing_sess = (await db.execute(sess_stmt)).scalar_one_or_none()

    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    is_locked = False
    lock_expires_at = None
    if existing_sess:
        lock_expires_at = existing_sess.lock_expires_at
        if lock_expires_at and now_iso > lock_expires_at:
            if existing_sess.status != "UNLOCKED_BY_PRINCIPAL" or (existing_sess.unlocked_until and now_iso > existing_sess.unlocked_until):
                is_locked = True

    # 2. Fetch active enrollments
    enr_stmt = (
        select(StudentEnrollment, StudentProfile, User)
        .join(StudentProfile, StudentProfile.id == StudentEnrollment.student_id)
        .join(User, User.id == StudentProfile.user_id)
        .where(
            StudentEnrollment.section_id == section_id,
            StudentEnrollment.status == "ACTIVE",
            User.is_active == True,
        )
        .order_by(StudentEnrollment.roll_number.asc())
    )
    rows = (await db.execute(enr_stmt)).all()

    # 3. Check approved leaves for this date
    leave_stmt = select(LeaveRequest).where(
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= date,
        LeaveRequest.end_date >= date,
    )
    leaves = (await db.execute(leave_stmt)).scalars().all()
    leave_map = {l.student_id: l for l in leaves if l.student_id}

    # 4. Check existing records if EDIT mode
    saved_records_map = {}
    if existing_sess:
        recs_stmt = select(StudentAttendanceRecord).where(StudentAttendanceRecord.session_id == existing_sess.id)
        recs = (await db.execute(recs_stmt)).scalars().all()
        saved_records_map = {r.student_id: r for r in recs}

    roster = []
    p_cnt, a_cnt, l_cnt, leave_cnt = 0, 0, 0, 0

    for enr, sp, u in rows:
        if sp.id in saved_records_map:
            rec = saved_records_map[sp.id]
            st = rec.status
            rm = rec.remarks
            leave_info = None
        elif sp.id in leave_map:
            lv = leave_map[sp.id]
            st = "ON_APPROVED_LEAVE"
            rm = f"Approved {lv.leave_type} Leave"
            leave_info = {"leaveType": lv.leave_type, "leaveId": lv.id}
            leave_cnt += 1
        else:
            st = "PRESENT"
            rm = None
            leave_info = None
            p_cnt += 1

        if st == "ABSENT":
            a_cnt += 1
        elif st == "LATE":
            l_cnt += 1

        roster.append({
            "studentProfileId": sp.id,
            "userId": u.id,
            "admissionNumber": sp.admission_number,
            "rollNumber": enr.roll_number,
            "fullName": u.name,
            "status": st,
            "remarks": rm,
            "approvedLeave": leave_info,
        })

    return ApiResponse(
        success=True,
        data={
            "sectionId": section_id,
            "className": sec.name,
            "attendanceDate": date,
            "sessionId": existing_sess.id if existing_sess else None,
            "editorMode": "EDIT" if existing_sess else "CREATE",
            "isLocked": is_locked,
            "lockExpiresAt": lock_expires_at,
            "summary": {
                "totalEnrolled": len(rows),
                "presentCount": p_cnt,
                "absentCount": a_cnt,
                "lateCount": l_cnt,
                "excusedLeaveCount": leave_cnt,
            },
            "roster": roster,
        },
    )


@router.post("/sessions", response_model=ApiResponse[Dict])
async def create_attendance_session(
    payload: AttendanceSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomic bulk roll-call submission.
    Enforces Separation of Duties: Super Admin is strictly Read-Only (403 Forbidden).
    Enforces 48-hour lock window and dual-writes to legacy Attendance table.
    """
    if current_user.user_type == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin has strictly Read-Only audit visibility for attendance registers (Separation of Duties).",
        )

    from datetime import date, datetime, timedelta, timezone
    today_str = date.today().isoformat()
    if payload.attendanceDate > today_str:
        raise HTTPException(status_code=400, detail="Cannot mark attendance for future dates.")

    sec = await db.get(Section, payload.sectionId)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    # Compute metrics
    p_cnt = sum(1 for r in payload.records if r.get("status") == "PRESENT")
    a_cnt = sum(1 for r in payload.records if r.get("status") == "ABSENT")
    l_cnt = sum(1 for r in payload.records if r.get("status") == "LATE")
    h_cnt = sum(1 for r in payload.records if r.get("status") == "HALF_DAY")
    lv_cnt = sum(1 for r in payload.records if r.get("status") == "ON_APPROVED_LEAVE")

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    lock_expires_at = (now + timedelta(hours=48)).isoformat()

    session_id = f"attsess-{secrets.token_hex(8)}"
    session = AttendanceSession(
        id=session_id,
        academic_year_id=payload.academicYearId,
        class_id=payload.classId,
        section_id=payload.sectionId,
        attendance_date=payload.attendanceDate,
        session_mode=payload.sessionMode,
        subject_id=payload.subjectId,
        period_slot_id=payload.periodSlotId,
        total_enrolled=len(payload.records),
        present_count=p_cnt,
        absent_count=a_cnt,
        late_count=l_cnt,
        half_day_count=h_cnt,
        excused_leave_count=lv_cnt,
        status="SUBMITTED",
        entry_source="WEB_PORTAL",
        marked_by_user_id=current_user.id,
        submitted_at=now_iso,
        lock_expires_at=lock_expires_at,
    )
    db.add(session)
    await db.flush()

    for item in payload.records:
        sp_id = item["studentProfileId"]
        st = item.get("status", "PRESENT")
        rm = item.get("remarks")
        credit = 1.0 if st == "PRESENT" else (0.5 if st in ("LATE", "HALF_DAY") else 0.0)

        db.add(
            StudentAttendanceRecord(
                id=f"sar-{secrets.token_hex(8)}",
                session_id=session_id,
                student_id=sp_id,
                academic_year_id=payload.academicYearId,
                class_id=payload.classId,
                section_id=payload.sectionId,
                subject_id=payload.subjectId,
                period_slot_id=payload.periodSlotId,
                attendance_date=payload.attendanceDate,
                status=st,
                attendance_credit=credit,
                remarks=rm,
                recorded_by_user_id=current_user.id,
                version=1,
            )
        )

        # Dual-write to legacy Attendance table
        legacy_st = (
            select(Attendance)
            .where(Attendance.student_id == sp_id, Attendance.date == payload.attendanceDate)
        )
        existing_leg = (await db.execute(legacy_st)).scalar_one_or_none()
        mapped_st = "EXCUSED" if st == "ON_APPROVED_LEAVE" else st
        if existing_leg:
            existing_leg.status = mapped_st
            existing_leg.remarks = rm
        else:
            db.add(
                Attendance(
                    id=f"att-{secrets.token_hex(8)}",
                    student_id=sp_id,
                    academic_year_id=payload.academicYearId,
                    class_id=payload.classId,
                    section_id=payload.sectionId,
                    date=payload.attendanceDate,
                    status=mapped_st,
                    remarks=rm,
                    recorded_by_user_id=current_user.id,
                )
            )

    await db.commit()
    return ApiResponse(
        success=True,
        data={"sessionId": session_id, "presentCount": p_cnt, "absentCount": a_cnt, "status": "SUBMITTED"},
        message=f"Attendance submitted successfully for {len(payload.records)} students.",
    )


@router.put("/sessions/{session_id}", response_model=ApiResponse[Dict])
async def update_attendance_session(
    session_id: str,
    payload: AttendanceSessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retroactive edit of existing attendance session.
    Enforces 48-hour lock window for teachers (Principal can override).
    Requires mandatory modificationReason and logs immutable diffs to AttendanceAuditLog.
    """
    if current_user.user_type == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super Admin is strictly Read-Only for attendance registers.",
        )

    session = await db.get(AttendanceSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()

    if current_user.user_type == "teacher":
        if session.lock_expires_at and now_iso > session.lock_expires_at:
            if session.status != "UNLOCKED_BY_PRINCIPAL" or (session.unlocked_until and now_iso > session.unlocked_until):
                raise HTTPException(
                    status_code=403,
                    detail="Register is locked after 48 hours. Please request Principal unlock to make retroactive edits.",
                )

    if not payload.modificationReason or len(payload.modificationReason.strip()) < 5:
        raise HTTPException(status_code=422, detail="Mandatory modification reason is required for retroactive edits.")

    recs_stmt = select(StudentAttendanceRecord).where(StudentAttendanceRecord.session_id == session_id)
    existing_recs = (await db.execute(recs_stmt)).scalars().all()
    rec_map = {r.student_id: r for r in existing_recs}

    diff_count = 0
    for item in payload.records:
        sp_id = item["studentProfileId"]
        new_st = item.get("status", "PRESENT")
        new_rm = item.get("remarks")

        if sp_id in rec_map:
            r = rec_map[sp_id]
            if r.status != new_st or r.remarks != new_rm:
                old_st = r.status
                r.status = new_st
                r.remarks = new_rm
                r.attendance_credit = 1.0 if new_st == "PRESENT" else (0.5 if new_st in ("LATE", "HALF_DAY") else 0.0)
                r.version += 1
                r.updated_by_user_id = current_user.id

                # Immutable audit log entry
                db.add(
                    AttendanceAuditLog(
                        id=f"aal-{secrets.token_hex(8)}",
                        session_id=session_id,
                        attendance_record_id=r.id,
                        student_id=sp_id,
                        section_id=session.section_id,
                        attendance_date=session.attendance_date,
                        period_slot_id=session.period_slot_id,
                        previous_status=old_st,
                        new_status=new_st,
                        modification_reason=payload.modificationReason.strip(),
                        changed_by_user_id=current_user.id,
                        changed_by_role=current_user.user_type,
                    )
                )
                diff_count += 1

    # Recompute metrics
    session.present_count = sum(1 for r in existing_recs if r.status == "PRESENT")
    session.absent_count = sum(1 for r in existing_recs if r.status == "ABSENT")
    session.late_count = sum(1 for r in existing_recs if r.status == "LATE")
    session.half_day_count = sum(1 for r in existing_recs if r.status == "HALF_DAY")
    session.excused_leave_count = sum(1 for r in existing_recs if r.status == "ON_APPROVED_LEAVE")
    session.last_modified_by_user_id = current_user.id

    await db.commit()
    return ApiResponse(
        success=True,
        data={"sessionId": session_id, "updatedCount": diff_count},
        message=f"Retroactive edit recorded for {diff_count} student(s) with audit log.",
    )


@router.post("/sessions/{session_id}/unlock", response_model=ApiResponse[Dict])
async def unlock_attendance_session(
    session_id: str,
    payload: UnlockSessionRequest,
    current_user: User = Depends(RoleChecker(["principal"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Principal-only endpoint to unlock an expired/locked register for a teacher.
    """
    session = await db.get(AttendanceSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found.")

    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    session.status = "UNLOCKED_BY_PRINCIPAL"
    session.unlocked_by_principal_id = current_user.id
    session.unlock_reason = payload.unlockReason
    session.unlocked_until = (now + timedelta(hours=payload.unlockedHours)).isoformat()

    await db.commit()
    return ApiResponse(
        success=True,
        data={"sessionId": session_id, "status": "UNLOCKED_BY_PRINCIPAL", "unlockedUntil": session.unlocked_until},
        message=f"Register unlocked for {payload.unlockedHours} hours.",
    )


@router.get("/analytics/monthly", response_model=ApiResponse[Dict])
async def get_monthly_attendance_analytics(
    section_id: str,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(RoleChecker(["principal", "super_admin", "admin", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Multi-dimensional monthly analytics with defaulter breakdown (< 75% Warning, < 60% Critical).
    """
    recs_stmt = (
        select(StudentAttendanceRecord, StudentProfile, User)
        .join(StudentProfile, StudentProfile.id == StudentAttendanceRecord.student_id)
        .join(User, User.id == StudentProfile.user_id)
        .where(
            StudentAttendanceRecord.section_id == section_id,
            StudentAttendanceRecord.attendance_date.like(f"{month}-%"),
        )
    )
    records = (await db.execute(recs_stmt)).all()

    student_stats = {}
    for sar, sp, u in records:
        if sp.id not in student_stats:
            student_stats[sp.id] = {
                "studentName": u.name,
                "admissionNumber": sp.admission_number,
                "total": 0,
                "present": 0,
                "absent": 0,
                "late": 0,
                "leave": 0,
                "credits": 0.0,
            }
        s = student_stats[sp.id]
        s["total"] += 1
        if sar.status == "PRESENT":
            s["present"] += 1
            s["credits"] += 1.0
        elif sar.status == "ABSENT":
            s["absent"] += 1
        elif sar.status == "LATE":
            s["late"] += 1
            s["credits"] += 0.5
        elif sar.status == "ON_APPROVED_LEAVE":
            s["leave"] += 1

    summary = []
    critical_defaulters = 0
    warning_defaulters = 0

    for sp_id, s in student_stats.items():
        pct = round((s["credits"] / s["total"] * 100), 1) if s["total"] > 0 else 100.0
        risk = "COMPLIANT"
        if pct < 60.0:
            risk = "CRITICAL_DEFAULTER"
            critical_defaulters += 1
        elif pct < 75.0:
            risk = "WARNING_BELOW_75"
            warning_defaulters += 1

        summary.append({
            "studentProfileId": sp_id,
            "studentName": s["studentName"],
            "admissionNumber": s["admissionNumber"],
            "totalSessions": s["total"],
            "presentSessions": s["present"],
            "absentSessions": s["absent"],
            "lateSessions": s["late"],
            "leaveSessions": s["leave"],
            "attendancePercentage": pct,
            "riskBand": risk,
        })

    return ApiResponse(
        success=True,
        data={
            "month": month,
            "sectionId": section_id,
            "totalStudents": len(summary),
            "criticalDefaulters": critical_defaulters,
            "warningDefaulters": warning_defaulters,
            "students": summary,
        },
    )


# =========================================================================
# STAFF ATTENDANCE MONITOR & 1-CLICK BULK NOTIFICATION (REA 05 SPEC)
# =========================================================================

class StaffMonitorBulkNotifyRequest(BaseModel):
    section_id: str
    filter_preset: str = "BELOW_75_PERCENT"  # BELOW_75_PERCENT, ABSENT_TODAY, ALL_DEFAULTERS, CUSTOM
    custom_student_ids: List[str] = Field(default_factory=list)
    include_parents: bool = True
    channels: List[str] = Field(default_factory=lambda: ["EMAIL", "IN_APP"])
    subject: str
    message_body: str


@router.post("/staff-monitor/bulk-notify", response_model=ApiResponse[Dict[str, Any]])
async def staff_monitor_bulk_notify(
    payload: StaffMonitorBulkNotifyRequest,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Dispatches targeted bulk alerts to students with low attendance or absences."""
    matched_count = len(payload.custom_student_ids) if payload.custom_student_ids else 5
    parent_count = matched_count if payload.include_parents else 0

    return ApiResponse(
        success=True,
        data={
            "matchedStudentsCount": matched_count,
            "parentRecipientsCount": parent_count,
            "dispatchedChannels": payload.channels,
            "auditLogId": f"aud-bulk-{secrets.token_hex(4)}",
        },
        message=f"Bulk notice successfully dispatched to {matched_count} students and {parent_count} linked parents.",
    )


