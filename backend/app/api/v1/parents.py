from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_parent_wards
from app.models.attendance import Attendance
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/parent", tags=["Parent Portal"])


@router.get("/wards", response_model=ApiResponse[List[Dict]])
async def get_parent_wards(
    current_user: User = Depends(RoleChecker(["parent", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of children linked to the authenticated parent.
    Enforces strict relational verification.
    """
    stmt = (
        select(StudentProfile, ParentChildLink, User)
        .join(ParentChildLink, ParentChildLink.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .options(
            selectinload(StudentProfile.enrollments).selectinload(StudentEnrollment.section),
            selectinload(StudentProfile.enrollments).selectinload(StudentEnrollment.parent_class),
        )
        .where(ParentChildLink.parent_user_id == current_user.id)
    )
    result = await db.execute(stmt)

    wards = []
    for sp, pcl, u in result.all():
        enrollment = sp.enrollments[0] if sp.enrollments else None
        class_name = enrollment.parent_class.name if enrollment and enrollment.parent_class else "Not Enrolled"
        section_code = enrollment.section.code if enrollment and enrollment.section else "-"

        # Real attendance percentage from attendance_records
        att_records = (await db.execute(select(Attendance).where(Attendance.student_id == sp.id))).scalars().all()
        total_att = len(att_records)
        present_att = sum(1 for a in att_records if a.status == "PRESENT")
        att_pct = round((present_att / total_att * 100), 1) if total_att > 0 else 0.0

        wards.append({
            "studentId": u.id,
            "profileId": sp.id,
            "name": u.name,
            "admissionNo": sp.admission_number,
            "rollNo": enrollment.roll_number if enrollment else None,
            "className": class_name,
            "sectionName": section_code,
            "relationship": pcl.relationship_type,
            "gender": u.gender,
            "dob": u.dob,
            "attendancePercentage": att_pct,
            "hasAttendanceRecords": total_att > 0,
            "feeDue": 0.0,
        })
    return ApiResponse(success=True, data=wards)


@router.get("/wards/{student_id}/verify", response_model=ApiResponse[bool])
async def verify_parent_access(
    student_id: str,
    linked_ward_ids: List[str] = Depends(get_current_parent_wards),
    current_user: User = Depends(RoleChecker(["parent", "super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Verifies that the requested student ID is strictly linked to this parent."""
    if current_user.user_type in ["super_admin", "admin"]:
        return ApiResponse(success=True, data=True)

    if student_id in linked_ward_ids:
        return ApiResponse(success=True, data=True)

    # Check if student_id matches user_id of a linked student profile
    if linked_ward_ids:
        sp_stmt = select(StudentProfile).where(
            StudentProfile.user_id == student_id,
            StudentProfile.id.in_(linked_ward_ids)
        )
        sp = (await db.execute(sp_stmt)).scalar_one_or_none()
        if sp:
            return ApiResponse(success=True, data=True)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: You are not authorized to access records for this student.",
    )
    return ApiResponse(success=True, data=True)
