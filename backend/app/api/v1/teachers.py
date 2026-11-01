from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.dependencies.auth import RoleChecker
from app.models.academic import Section, Subject
from app.models.material import Assignment, StudyMaterial
from app.models.teacher import TeacherAssignment, TeacherProfile
from app.models.user import User
from app.schemas.academic import SectionSchema
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("/dashboard", response_model=ApiResponse[Dict])
async def get_teacher_dashboard(
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher Desk Dashboard Summary:
    - Automatically discovers assigned classes, subjects, and Class Teacher status
    """
    tp_stmt = (
        select(TeacherProfile)
        .options(
            selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.section),
            selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.subject),
        )
        .where(TeacherProfile.user_id == current_user.id)
    )
    tp = (await db.execute(tp_stmt)).scalar_one_or_none()

    assigned_sections = []
    assigned_subjects = set()
    is_class_teacher = False
    class_teacher_section = None

    if tp:
        for a in tp.assignments:
            if a.assignment_type == "CLASS_TEACHER":
                is_class_teacher = True
                class_teacher_section = {
                    "id": a.section.id,
                    "code": a.section.code,
                    "name": a.section.name,
                    "classId": a.section.class_id,
                }
            if a.section:
                assigned_sections.append({
                    "id": a.section.id,
                    "code": a.section.code,
                    "name": a.section.name,
                    "classId": a.section.class_id,
                    "assignmentType": a.assignment_type,
                    "subjectName": a.subject.name if a.subject else None,
                })
            if a.subject:
                assigned_subjects.add(a.subject.name)

    return ApiResponse(
        success=True,
        data={
            "teacherName": current_user.name,
            "employeeCode": tp.employee_code if tp else current_user.code,
            "specialization": tp.specialization if tp else "General",
            "isClassTeacher": is_class_teacher,
            "classTeacherSection": class_teacher_section,
            "assignedSections": assigned_sections,
            "assignedSubjects": list(assigned_subjects),
        },
    )


@router.get("/assignments", response_model=ApiResponse[List[Dict]])
async def get_teacher_assignments(
    current_user: User = Depends(RoleChecker(["teacher", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    tp_stmt = (
        select(TeacherProfile)
        .options(
            selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.section),
            selectinload(TeacherProfile.assignments).selectinload(TeacherAssignment.subject),
        )
        .where(TeacherProfile.user_id == current_user.id)
    )
    tp = (await db.execute(tp_stmt)).scalar_one_or_none()

    output = []
    if tp:
        for a in tp.assignments:
            output.append({
                "id": a.id,
                "teacherId": current_user.id,
                "academicYear": a.academic_year_id,
                "classId": a.class_id,
                "sectionId": a.section_id,
                "sectionName": a.section.code if a.section else "",
                "assignmentType": a.assignment_type,
                "subjectId": a.subject_id,
                "subjectName": a.subject.name if a.subject else None,
                "isPrimary": a.is_primary,
            })
    return ApiResponse(success=True, data=output)
