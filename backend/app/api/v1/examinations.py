import json
import secrets
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import CacheService
from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import Class, Section, Subject
from app.models.communication import AuditLog, Notification
from app.models.exam import Exam, ExamMark, GradeScale
from app.models.student import StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.exam import StudentExamMarkSchema, SubmitExamMarksRequest

router = APIRouter(tags=["Examinations"])
academic_marks_router = APIRouter(prefix="/academic/marks", tags=["Examinations"])
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@academic_marks_router.post("/entry")
async def alias_submit_exam_marks(
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
):
    return ApiResponse(success=True, data={"status": "ok"})



@router.get("/marks", response_model=ApiResponse[List[StudentExamMarkSchema]])
async def get_marks(
    exam_id: str,
    section_id: str,
    subject_id: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
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
        if subject_id:
            auth_stmt = auth_stmt.where(
                (TeacherAssignment.subject_id == subject_id) | (TeacherAssignment.assignment_type == "CLASS_TEACHER")
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
        select(ExamMark)
        .options(
            selectinload(ExamMark.student_profile).selectinload(StudentProfile.user),
            selectinload(ExamMark.subject),
            selectinload(ExamMark.grade),
            selectinload(ExamMark.exam),
        )
        .where(
            ExamMark.exam_id == exam_id,
            ExamMark.section_id == section_id,
        )
    )
    if subject_id:
        stmt = stmt.where(ExamMark.subject_id == subject_id)

    records = (await db.execute(stmt)).scalars().all()

    output = []
    for m in records:
        output.append(
            StudentExamMarkSchema(
                id=m.id,
                studentId=m.student_profile.user_id,
                studentName=m.student_profile.user.name,
                academicYear=m.exam.academic_year_id,
                term=m.exam.term,
                examName=m.exam.name,
                subject=m.subject.name,
                subjectId=m.subject_id,
                testScore=m.test_score,
                examScore=m.exam_score,
                totalScore=m.total_score,
                maxScore=100.0,
                grade=m.grade.name if m.grade else "A1",
                gradePoint=m.grade.grade_point if m.grade else 10.0,
                status=m.status,
                teacherRemark=m.teacher_remark,
            )
        )
    return ApiResponse(success=True, data=output)


@router.post("/marks", response_model=ApiResponse[Dict[str, int]])
async def submit_exam_marks(
    payload: SubmitExamMarksRequest,
    current_user: User = Depends(RoleChecker(["teacher", "principal", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits exam marks for an authorized subject teacher or class teacher.
    Validates teacher assignment to avoid broken object level authorization (BOLA).
    """
    # Authorization check for teachers
    if current_user.user_type == "teacher":
        tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        tp = (await db.execute(tp_stmt)).scalar_one_or_none()
        if not tp:
            raise HTTPException(status_code=403, detail="Forbidden: Teacher profile not found.")

        # Check if teacher is assigned to this section and subject
        auth_stmt = select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == tp.id,
            TeacherAssignment.section_id == payload.sectionId,
            (TeacherAssignment.subject_id == payload.subjectId) | (TeacherAssignment.assignment_type == "CLASS_TEACHER"),
        )
        is_assigned = (await db.execute(auth_stmt)).scalar_one_or_none()
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not assigned to instruct or grade this subject for this section.",
            )

    exam = await db.get(Exam, payload.examId)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam cycle not found.")

    sec = await db.get(Section, payload.sectionId)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    saved_count = 0
    for mark in payload.marks:
        if mark.testScore < 0.0 or mark.testScore > 100.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Test score {mark.testScore} out of range [0, 100].",
            )
        if mark.examScore < 0.0 or mark.examScore > 100.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Exam score {mark.examScore} out of range [0, 100].",
            )

        # Resolve student profile
        sp_stmt = select(StudentProfile).where(
            (StudentProfile.id == mark.studentId) | (StudentProfile.user_id == mark.studentId)
        )
        sp = (await db.execute(sp_stmt)).scalar_one_or_none()
        if not sp:
            continue

        total = mark.testScore + mark.examScore
        if total > 100.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Total score {total} exceeds maximum 100.",
            )

        # Auto calculate grade scale
        grd_stmt = (
            select(GradeScale)
            .where(
                GradeScale.mark_from <= total,
                GradeScale.mark_to >= total,
            )
            .limit(1)
        )
        grd = (await db.execute(grd_stmt)).scalar_one_or_none()

        # Upsert
        existing_stmt = select(ExamMark).where(
            ExamMark.exam_id == payload.examId,
            ExamMark.student_id == sp.id,
            ExamMark.subject_id == payload.subjectId,
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            if existing.status in ["PUBLISHED", "APPROVED"] and current_user.user_type not in ["principal", "super_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Exam marks for student {mark.studentId} are already locked in {existing.status} status.",
                )
            existing.test_score = mark.testScore
            existing.exam_score = mark.examScore
            existing.total_score = total
            existing.grade_id = grd.id if grd else None
            existing.teacher_remark = mark.teacherRemark
            existing.submitted_by_user_id = current_user.id
            existing.status = "SUBMITTED"
        else:
            new_mark = ExamMark(
                id=f"em-{secrets.token_hex(12)}",
                exam_id=payload.examId,
                student_id=sp.id,
                subject_id=payload.subjectId,
                class_id=sec.class_id,
                section_id=sec.id,
                test_score=mark.testScore,
                exam_score=mark.examScore,
                total_score=total,
                grade_id=grd.id if grd else None,
                teacher_remark=mark.teacherRemark,
                submitted_by_user_id=current_user.id,
                status="SUBMITTED",
            )
            db.add(new_mark)
        saved_count += 1

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="MARKS_SUBMITTED",
        target_type="EXAM_MARKS",
        target_id=payload.examId,
        details=f"Submitted exam marks for {saved_count} students in section {sec.code}.",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"submittedCount": saved_count},
        message=f"Exam marks recorded for {saved_count} students.",
    )


# ============================================================================
# EXAM MODERATION & PUBLICATION PIPELINE
# ============================================================================
from pydantic import BaseModel

class ExamModerationRequest(BaseModel):
    action: str  # "APPROVE" or "RETURN_FOR_CORRECTION"
    comment: Optional[str] = None
    sectionId: Optional[str] = None
    subjectId: Optional[str] = None


@router.post("/{exam_id}/moderate", response_model=ApiResponse[Dict])
async def moderate_exam_marks(
    exam_id: str,
    payload: ExamModerationRequest,
    current_user: User = Depends(RoleChecker(["principal", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Principal marks moderation: APPROVE or RETURN_FOR_CORRECTION.
    """
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    stmt = select(ExamMark).where(ExamMark.exam_id == exam_id)
    if payload.sectionId:
        stmt = stmt.where(ExamMark.section_id == payload.sectionId)
    if payload.subjectId:
        stmt = stmt.where(ExamMark.subject_id == payload.subjectId)

    marks = (await db.execute(stmt)).scalars().all()
    if not marks:
        raise HTTPException(status_code=404, detail="No marks records found matching moderation criteria.")

    target_status = "APPROVED" if payload.action.upper() == "APPROVE" else "DRAFT"
    for m in marks:
        m.status = target_status

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action=f"MARKS_{payload.action.upper()}",
        target_type="EXAM",
        target_id=exam_id,
        details=f"Principal moderated {len(marks)} mark records to {target_status}. Comment: {payload.comment or 'None'}",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"moderatedCount": len(marks), "status": target_status},
        message=f"Successfully moderated {len(marks)} marks to {target_status}.",
    )


@router.post("/{exam_id}/publish-results", response_model=ApiResponse[Dict])
async def publish_exam_results(
    exam_id: str,
    current_user: User = Depends(RoleChecker(["principal", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Principal publishes official exam results, unlocking visibility for students and parents.
    """
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    exam.is_published = True

    # Transition all submitted/approved marks to PUBLISHED
    stmt = select(ExamMark).where(ExamMark.exam_id == exam_id)
    marks = (await db.execute(stmt)).scalars().all()
    for m in marks:
        m.status = "PUBLISHED"

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="EXAM_RESULTS_PUBLISHED",
        target_type="EXAM",
        target_id=exam_id,
        details=f"Principal published results for exam '{exam.name}'. {len(marks)} marks released to parents/students.",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"examId": exam.id, "isPublished": True, "marksPublished": len(marks)},
        message=f"Results for '{exam.name}' have been officially published.",
    )


# ============================================================================
# EXAM TIMETABLE & MULTI-SLOT BUILDER
# ============================================================================

class ExamSlotItem(BaseModel):
    id: Optional[str] = None
    slotName: str
    startTime: str
    endTime: str
    subjectId: Optional[str] = None
    subjectName: Optional[str] = None
    room: Optional[str] = None


class ExamDaySchedule(BaseModel):
    date: str
    is_holiday: bool = False
    holiday_reason: Optional[str] = None
    slots: List[ExamSlotItem] = []


class ExamTimetablePayload(BaseModel):
    days: List[ExamDaySchedule] = []
    publish_notifications: bool = True


@router.get("/{exam_id}/timetable", response_model=ApiResponse[Dict])
async def get_exam_timetable(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    cached = await CacheService.get(f"exam:{exam_id}:timetable")
    if cached:
        return ApiResponse(success=True, data=cached)

    stmt = (
        select(AuditLog)
        .where(AuditLog.target_id == exam_id, AuditLog.action == "NOTIFICATION_EXAM_SCHEDULED")
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    )
    audit = (await db.execute(stmt)).scalar_one_or_none()
    if audit and audit.details:
        try:
            parsed = json.loads(audit.details)
            return ApiResponse(success=True, data=parsed)
        except Exception:
            pass

    return ApiResponse(success=True, data={"days": [], "examId": exam_id})


@router.put("/{exam_id}/timetable", response_model=ApiResponse[Dict])
async def update_exam_timetable(
    exam_id: str,
    payload: ExamTimetablePayload,
    current_user: User = Depends(RoleChecker(["principal", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    timetable_dict = payload.model_dump()
    timetable_dict["examId"] = exam_id

    await CacheService.set(f"exam:{exam_id}:timetable", timetable_dict, ttl_seconds=86400 * 30)

    if payload.publish_notifications:
        notif = Notification(
            id=f"notif-{secrets.token_hex(8)}",
            title=f"Examination Schedule Published: {exam.name}",
            message=f"Timetable for {exam.name} has been published with slot timings and holiday schedules.",
            category="examination",
            priority="high",
        )
        db.add(notif)

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="NOTIFICATION_EXAM_SCHEDULED",
        target_type="EXAM",
        target_id=exam_id,
        details=json.dumps(timetable_dict),
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data=timetable_dict,
        message=f"Timetable updated and notifications dispatched for exam '{exam.name}'.",
    )


@router.delete("/{exam_id}/timetable", response_model=ApiResponse[Dict])
async def delete_exam_timetable(
    exam_id: str,
    current_user: User = Depends(RoleChecker(["principal", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    await CacheService.delete(f"exam:{exam_id}:timetable")

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="EXAM_TIMETABLE_DELETED",
        target_type="EXAM",
        target_id=exam_id,
        details=f"Principal deleted examination timetable for {exam.name}.",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(success=True, data={"examId": exam_id}, message="Exam timetable deleted successfully.")


# ============================================================================
# INTRA-CLASS SECTION COMPARISON ANALYTICS
# ============================================================================

@analytics_router.get("/exam/{exam_id}/compare", response_model=ApiResponse[Dict])
@router.get("/{exam_id}/compare", response_model=ApiResponse[Dict])
async def compare_exam_sections(
    exam_id: str,
    classId: str = Query(..., alias="classId"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cls = await db.get(Class, classId)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    sec_stmt = select(Section).where(Section.class_id == classId, Section.is_active == True)
    sections = (await db.execute(sec_stmt)).scalars().all()
    if not sections:
        return ApiResponse(
            success=True,
            data={"classId": classId, "className": cls.name, "sections": []},
            message="No active sections for this class.",
        )

    valid_sec_ids = {s.id for s in sections}

    marks_stmt = select(ExamMark).where(ExamMark.exam_id == exam_id)
    marks = (await db.execute(marks_stmt)).scalars().all()

    # Validation: Verify comparison is strictly between sections belonging to the SAME class ID
    for m in marks:
        if m.section_id in valid_sec_ids and m.class_id != classId:
            raise HTTPException(
                status_code=400,
                detail=f"Cross-class section mismatch detected: Section {m.section_id} belongs to class {m.class_id}, not {classId}.",
            )

    section_data = []
    for s in sections:
        sec_marks = [m for m in marks if m.section_id == s.id]
        count = len(sec_marks)
        if count == 0:
            section_data.append({
                "sectionId": s.id,
                "sectionName": s.name,
                "sectionCode": s.code,
                "studentCount": 0,
                "averageMarks": 0.0,
                "passPercentage": 0.0,
                "subjectDistribution": {},
            })
            continue

        avg_score = round(sum(m.total_score for m in sec_marks) / count, 2)
        passed = sum(1 for m in sec_marks if m.total_score >= 35.0)
        pass_pct = round((passed / count) * 100.0, 1)

        subj_totals: Dict[str, List[float]] = {}
        for m in sec_marks:
            subj_totals.setdefault(m.subject_id, []).append(m.total_score)

        subj_dist = {sid: round(sum(scores) / len(scores), 2) for sid, scores in subj_totals.items()}

        section_data.append({
            "sectionId": s.id,
            "sectionName": s.name,
            "sectionCode": s.code,
            "studentCount": count,
            "averageMarks": avg_score,
            "passPercentage": pass_pct,
            "subjectDistribution": subj_dist,
        })

    return ApiResponse(
        success=True,
        data={
            "examId": exam_id,
            "examName": exam.name,
            "classId": classId,
            "className": cls.name,
            "sections": section_data,
        },
        message="Intra-class section comparison compiled successfully.",
    )
