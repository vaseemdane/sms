import os
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import Section, Subject
from app.models.communication import AuditLog
from app.models.material import (
    Assignment,
    AssignmentSubmission,
    AssignmentTarget,
    StudyMaterial,
    StudyMaterialTarget,
)
from app.models.student import StudentEnrollment, StudentProfile
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.material import (
    AssignmentCreateRequest,
    AssignmentSchema,
    AssignmentSubmissionSchema,
    StudyMaterialSchema,
)

router = APIRouter(prefix="/materials", tags=["Study Materials & Assignments"])


@router.post("", response_model=ApiResponse[StudyMaterialSchema])
async def upload_study_material(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subjectId: str = Form(...),
    targetSectionIds: str = Form(...),  # Comma separated e.g. "sec-10a,sec-10b"
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads courseware file with strict target class authorization.
    Rejects upload if teacher is not assigned to the targeted section!
    """
    sec_ids = [s.strip() for s in targetSectionIds.split(",") if s.strip()]
    if not sec_ids:
        raise HTTPException(status_code=400, detail="At least one target section required.")

    tp = None
    if current_user.user_type == "teacher":
        tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        tp = (await db.execute(tp_stmt)).scalar_one_or_none()
        if not tp:
            raise HTTPException(status_code=403, detail="Teacher profile not found.")

        # Validate that teacher is assigned to ALL targeted sections
        for sec_id in sec_ids:
            auth_stmt = select(TeacherAssignment).where(
                TeacherAssignment.teacher_id == tp.id,
                TeacherAssignment.section_id == sec_id,
            )
            is_assigned = (await db.execute(auth_stmt)).scalar_one_or_none()
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: You are not assigned to target section '{sec_id}'.",
                )

    sub = await db.get(Subject, subjectId)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found.")

    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".epub", ".jpg", ".jpeg", ".png", ".txt"}
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/epub+zip",
        "image/jpeg",
        "image/png",
        "text/plain",
    }

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS or (file.content_type and file.content_type not in ALLOWED_MIME_TYPES):
        raise HTTPException(status_code=400, detail="Disallowed file type.")

    # Save file to upload directory with bounded memory consumption
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = secrets.token_hex(16)
    storage_key = f"materials/{file_id}{file_ext}"
    local_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{file_ext}")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_size = 0

    with open(local_path, "wb") as f:
        while chunk := await file.read(65536):
            total_size += len(chunk)
            if total_size > max_bytes:
                f.close()
                if os.path.exists(local_path):
                    os.remove(local_path)
                raise HTTPException(status_code=413, detail="File exceeds maximum allowable size limit.")
            f.write(chunk)

    file_size_kb = total_size // 1024

    teacher_id_val = tp.id if tp else "tp-1"

    new_mat = StudyMaterial(
        id=f"mat-{file_id}",
        academic_year_id="ay-2026-2027",
        teacher_id=teacher_id_val,
        subject_id=subjectId,
        title=title,
        description=description,
        storage_key=storage_key,
        file_name=file.filename or "file",
        file_size=f"{file_size_kb} KB",
        file_type=file.content_type or "application/octet-stream",
    )
    db.add(new_mat)

    for sec_id in sec_ids:
        db.add(StudyMaterialTarget(id=f"smt-{secrets.token_hex(8)}", material_id=new_mat.id, section_id=sec_id))

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="STUDY_MATERIAL_UPLOADED",
        target_type="MATERIAL",
        target_id=new_mat.id,
        details=f"Uploaded material '{title}' for {len(sec_ids)} section(s).",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data=StudyMaterialSchema(
            id=new_mat.id,
            title=new_mat.title,
            description=new_mat.description,
            subject=sub.name,
            subjectId=sub.id,
            teacherId=current_user.id,
            teacherName=current_user.name,
            targetSectionIds=sec_ids,
            targetSectionCodes=[],
            fileName=new_mat.file_name,
            fileSize=new_mat.file_size,
            fileType=new_mat.file_type,
            academicYear=new_mat.academic_year_id,
            createdAt=str(new_mat.created_at),
        ),
        message="Study material uploaded successfully.",
    )


@router.get("/section/{section_id}", response_model=ApiResponse[List[StudyMaterialSchema]])
async def get_section_materials(
    section_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetches materials targeted to a student's section."""
    stmt = (
        select(StudyMaterial)
        .join(StudyMaterialTarget, StudyMaterialTarget.material_id == StudyMaterial.id)
        .options(
            selectinload(StudyMaterial.subject),
            selectinload(StudyMaterial.teacher).selectinload(TeacherProfile.user),
            selectinload(StudyMaterial.target_sections).selectinload(StudyMaterialTarget.section),
        )
        .where(StudyMaterialTarget.section_id == section_id)
        .order_by(StudyMaterial.created_at.desc())
    )
    materials = (await db.execute(stmt)).scalars().all()

    output = []
    for m in materials:
        sec_ids = [t.section_id for t in m.target_sections]
        sec_codes = [t.section.code for t in m.target_sections if t.section]
        output.append(
            StudyMaterialSchema(
                id=m.id,
                title=m.title,
                description=m.description,
                subject=m.subject.name if m.subject else "",
                subjectId=m.subject_id,
                teacherId=m.teacher.user.id if m.teacher and m.teacher.user else "",
                teacherName=m.teacher.user.name if m.teacher and m.teacher.user else "",
                targetSectionIds=sec_ids,
                targetSectionCodes=sec_codes,
                fileName=m.file_name,
                fileSize=m.file_size,
                fileType=m.file_type,
                academicYear=m.academic_year_id,
                createdAt=str(m.created_at),
            )
        )
    return ApiResponse(success=True, data=output)


# ============================================================================
# ASSIGNMENTS & HOMEWORK PIPELINE
# ============================================================================
@router.post("/assignments", response_model=ApiResponse[AssignmentSchema])
async def create_assignment(
    payload: AssignmentCreateRequest,
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Creates a coursework assignment targeted to one or more sections."""
    sub = await db.get(Subject, payload.subjectId)
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found.")

    # Fetch teacher profile
    tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
    tp = (await db.execute(tp_stmt)).scalar_one_or_none()
    if not tp and current_user.user_type == "teacher":
        raise HTTPException(status_code=400, detail="Teacher profile not found.")

    teacher_profile_id = tp.id if tp else "admin-assignment-author"

    assignment = Assignment(
        id=f"asg-{secrets.token_hex(8)}",
        academic_year_id="ay-2026-2027",
        teacher_id=teacher_profile_id,
        subject_id=sub.id,
        title=payload.title,
        description=payload.description,
        due_date=payload.dueDate,
        total_marks=payload.totalMarks,
    )
    db.add(assignment)

    sec_codes = []
    for sec_id in payload.targetSectionIds:
        sec = await db.get(Section, sec_id)
        if sec:
            sec_codes.append(sec.code)
            db.add(AssignmentTarget(
                id=f"ast-{secrets.token_hex(8)}",
                assignment_id=assignment.id,
                section_id=sec_id,
            ))

    audit = AuditLog(
        id=f"aud-{secrets.token_hex(8)}",
        actor_user_id=current_user.id,
        action="ASSIGNMENT_CREATED",
        target_type="ASSIGNMENT",
        target_id=assignment.id,
        details=f"Created assignment '{assignment.title}' for {len(payload.targetSectionIds)} section(s).",
    )
    db.add(audit)
    await db.commit()

    return ApiResponse(
        success=True,
        data=AssignmentSchema(
            id=assignment.id,
            title=assignment.title,
            description=assignment.description,
            subject=sub.name,
            subjectId=sub.id,
            teacherId=current_user.id,
            teacherName=current_user.name,
            targetSectionIds=payload.targetSectionIds,
            targetSectionCodes=sec_codes,
            dueDate=assignment.due_date,
            totalMarks=assignment.total_marks,
            academicYear=assignment.academic_year_id,
            createdAt=str(assignment.created_at),
        ),
        message="Assignment created and published successfully.",
    )


@router.get("/assignments/section/{section_id}", response_model=ApiResponse[List[AssignmentSchema]])
async def get_section_assignments(
    section_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists published assignments for a specific section."""
    stmt = (
        select(Assignment)
        .join(AssignmentTarget, AssignmentTarget.assignment_id == Assignment.id)
        .options(
            selectinload(Assignment.subject),
            selectinload(Assignment.teacher).selectinload(TeacherProfile.user),
            selectinload(Assignment.target_sections).selectinload(AssignmentTarget.section),
        )
        .where(AssignmentTarget.section_id == section_id)
        .order_by(Assignment.created_at.desc())
    )
    assignments = (await db.execute(stmt)).scalars().all()

    output = []
    for a in assignments:
        sec_ids = [t.section_id for t in a.target_sections]
        sec_codes = [t.section.code for t in a.target_sections if t.section]
        output.append(
            AssignmentSchema(
                id=a.id,
                title=a.title,
                description=a.description,
                subject=a.subject.name if a.subject else "",
                subjectId=a.subject_id,
                teacherId=a.teacher.user.id if a.teacher and a.teacher.user else "",
                teacherName=a.teacher.user.name if a.teacher and a.teacher.user else "Instructor",
                targetSectionIds=sec_ids,
                targetSectionCodes=sec_codes,
                dueDate=a.due_date,
                totalMarks=a.total_marks,
                academicYear=a.academic_year_id,
                createdAt=str(a.created_at),
                attachmentName=a.attachment_name,
            )
        )
    return ApiResponse(success=True, data=output)


@router.post("/assignments/{assignment_id}/submissions", response_model=ApiResponse[AssignmentSubmissionSchema])
async def submit_assignment_work(
    assignment_id: str,
    current_user: User = Depends(RoleChecker(["student"])),
    db: AsyncSession = Depends(get_db),
):
    """Submits student work for an assignment."""
    assignment = await db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    sp_stmt = (
        select(StudentProfile)
        .options(selectinload(StudentProfile.enrollments).selectinload(StudentEnrollment.section))
        .where(StudentProfile.user_id == current_user.id)
    )
    sp = (await db.execute(sp_stmt)).scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    enrollment = sp.enrollments[0] if sp.enrollments else None
    sec_id = enrollment.section_id if enrollment else ""
    sec_code = enrollment.section.code if enrollment and enrollment.section else ""

    target_sections_stmt = select(AssignmentTarget.section_id).where(AssignmentTarget.assignment_id == assignment.id)
    target_section_ids = (await db.execute(target_sections_stmt)).scalars().all()
    student_section_ids = [e.section_id for e in sp.enrollments if e.section_id]
    if target_section_ids and not any(sid in target_section_ids for sid in student_section_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not enrolled in a section targeted by this assignment.",
        )

    # Upsert submission
    sub_stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == sp.id,
    )
    submission = (await db.execute(sub_stmt)).scalar_one_or_none()

    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()

    if submission:
        submission.submitted_at = now_str
        submission.status = "SUBMITTED"
    else:
        submission = AssignmentSubmission(
            id=f"asub-{secrets.token_hex(8)}",
            assignment_id=assignment_id,
            student_id=sp.id,
            status="SUBMITTED",
            submitted_at=now_str,
        )
        db.add(submission)

    await db.commit()

    return ApiResponse(
        success=True,
        data=AssignmentSubmissionSchema(
            id=submission.id,
            assignmentId=assignment.id,
            studentId=sp.user_id,
            studentName=current_user.name,
            sectionId=sec_id,
            sectionCode=sec_code,
            submittedAt=submission.submitted_at,
            status=submission.status,
            obtainedMarks=submission.obtained_marks,
            feedback=submission.feedback,
        ),
        message="Assignment work submitted successfully.",
    )


@router.patch("/assignments/{assignment_id}/submissions/{submission_id}/grade", response_model=ApiResponse[AssignmentSubmissionSchema])
async def grade_assignment_submission(
    assignment_id: str,
    submission_id: str,
    obtainedMarks: float = Form(...),
    feedback: Optional[str] = Form(None),
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Grades an assignment submission with feedback."""
    sub_stmt = (
        select(AssignmentSubmission)
        .options(
            selectinload(AssignmentSubmission.student_profile).selectinload(StudentProfile.user),
            selectinload(AssignmentSubmission.student_profile).selectinload(StudentProfile.enrollments).selectinload(StudentEnrollment.section),
        )
        .where(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.assignment_id == assignment_id,
        )
    )
    submission = (await db.execute(sub_stmt)).scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    if current_user.user_type == "teacher":
        tp_stmt = select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        tp = (await db.execute(tp_stmt)).scalar_one_or_none()
        if not tp:
            raise HTTPException(status_code=403, detail="Forbidden: Teacher profile not found.")

        assignment = await db.get(Assignment, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found.")

        target_sections_stmt = select(AssignmentTarget.section_id).where(AssignmentTarget.assignment_id == assignment_id)
        target_sec_ids = (await db.execute(target_sections_stmt)).scalars().all()

        auth_stmt = select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == tp.id,
            TeacherAssignment.section_id.in_(target_sec_ids),
            (TeacherAssignment.subject_id == assignment.subject_id) | (TeacherAssignment.assignment_type == "CLASS_TEACHER"),
        )
        is_assigned = (await db.execute(auth_stmt)).scalar_one_or_none()
        if assignment.teacher_id != tp.id and not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to grade submissions for this assignment.",
            )

    submission.obtained_marks = obtainedMarks
    submission.feedback = feedback
    submission.status = "GRADED"
    submission.graded_by_user_id = current_user.id

    await db.commit()

    sp = submission.student_profile
    enrollment = sp.enrollments[0] if sp and sp.enrollments else None

    return ApiResponse(
        success=True,
        data=AssignmentSubmissionSchema(
            id=submission.id,
            assignmentId=submission.assignment_id,
            studentId=sp.user_id if sp else "",
            studentName=sp.user.name if sp and sp.user else "Student",
            sectionId=enrollment.section_id if enrollment else "",
            sectionCode=enrollment.section.code if enrollment and enrollment.section else "",
            submittedAt=submission.submitted_at,
            status=submission.status,
            obtainedMarks=submission.obtained_marks,
            feedback=submission.feedback,
        ),
        message="Submission graded successfully.",
    )
