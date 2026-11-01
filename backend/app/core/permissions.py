from typing import Dict, List, Set
from fastapi import HTTPException, status
from app.models.user import User

# Standard Granular Permission Codes
ACADEMIC_CLASSES_VIEW = "academic.classes.view"
ACADEMIC_CLASSES_MANAGE = "academic.classes.manage"
ACADEMIC_SECTIONS_VIEW = "academic.sections.view"
ACADEMIC_SECTIONS_MANAGE = "academic.sections.manage"
ACADEMIC_TEACHERS_ASSIGN = "academic.teachers.assign"
ACADEMIC_TEACHERS_VIEW = "academic.teachers.view"
ACADEMIC_TIMETABLE_VIEW = "academic.timetable.view"
ACADEMIC_TIMETABLE_MANAGE = "academic.timetable.manage"
ACADEMIC_TIMETABLE_PUBLISH = "academic.timetable.publish"
ACADEMIC_ATTENDANCE_VIEW = "academic.attendance.view"
ACADEMIC_ATTENDANCE_MARK = "academic.attendance.mark"
ACADEMIC_EXAMS_VIEW = "academic.exams.view"
ACADEMIC_EXAMS_MANAGE = "academic.exams.manage"
ACADEMIC_EXAMS_PUBLISH = "academic.exams.publish"
ACADEMIC_MARKS_VIEW = "academic.marks.view"
ACADEMIC_MARKS_ENTER = "academic.marks.enter"
ACADEMIC_MARKS_APPROVE = "academic.marks.approve"
ACADEMIC_MARKS_PUBLISH = "academic.marks.publish"
ACADEMIC_PROMOTIONS_MANAGE = "academic.promotions.manage"
ACADEMIC_REPORTS_VIEW = "academic.reports.view"

FINANCE_FEES_VIEW = "finance.fees.view"
FINANCE_FEES_MANAGE = "finance.fees.manage"
FINANCE_FEES_COLLECT = "finance.fees.collect"
FINANCE_EXPENSES_VIEW = "finance.expenses.view"
FINANCE_EXPENSES_MANAGE = "finance.expenses.manage"
FINANCE_PAYROLL_VIEW = "finance.payroll.view"
FINANCE_PAYROLL_MANAGE = "finance.payroll.manage"
FINANCE_REPORTS_VIEW = "finance.reports.view"

OPERATIONS_VENDORS_MANAGE = "operations.vendors.manage"
OPERATIONS_ASSETS_MANAGE = "operations.assets.manage"
OPERATIONS_INVENTORY_MANAGE = "operations.inventory.manage"

SYSTEM_USERS_MANAGE = "system.users.manage"
SYSTEM_CONFIG_MANAGE = "system.config.manage"
SYSTEM_AUDIT_VIEW = "system.audit.view"

# Role to Permissions Matrix
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    # Principal = Complete Academic Authority (No Finance, No System User Admin)
    "principal": {
        ACADEMIC_CLASSES_VIEW,
        ACADEMIC_CLASSES_MANAGE,
        ACADEMIC_SECTIONS_VIEW,
        ACADEMIC_SECTIONS_MANAGE,
        ACADEMIC_TEACHERS_ASSIGN,
        ACADEMIC_TEACHERS_VIEW,
        ACADEMIC_TIMETABLE_VIEW,
        ACADEMIC_TIMETABLE_MANAGE,
        ACADEMIC_TIMETABLE_PUBLISH,
        ACADEMIC_ATTENDANCE_VIEW,
        ACADEMIC_EXAMS_VIEW,
        ACADEMIC_EXAMS_MANAGE,
        ACADEMIC_EXAMS_PUBLISH,
        ACADEMIC_MARKS_VIEW,
        ACADEMIC_MARKS_APPROVE,
        ACADEMIC_MARKS_PUBLISH,
        ACADEMIC_PROMOTIONS_MANAGE,
        ACADEMIC_REPORTS_VIEW,
        SYSTEM_AUDIT_VIEW,
    },
    # Manager / Accountant = School Business & Operations Authority (No Academics)
    "manager": {
        FINANCE_FEES_VIEW,
        FINANCE_FEES_MANAGE,
        FINANCE_FEES_COLLECT,
        FINANCE_EXPENSES_VIEW,
        FINANCE_EXPENSES_MANAGE,
        FINANCE_PAYROLL_VIEW,
        FINANCE_PAYROLL_MANAGE,
        FINANCE_REPORTS_VIEW,
        OPERATIONS_VENDORS_MANAGE,
        OPERATIONS_ASSETS_MANAGE,
        OPERATIONS_INVENTORY_MANAGE,
        SYSTEM_AUDIT_VIEW,
    },
    "accountant": {
        FINANCE_FEES_VIEW,
        FINANCE_FEES_COLLECT,
        FINANCE_EXPENSES_VIEW,
        FINANCE_REPORTS_VIEW,
    },
    # Super Admin = System Owner / Platform Administrator (Governance & Identities)
    "super_admin": {
        SYSTEM_USERS_MANAGE,
        SYSTEM_CONFIG_MANAGE,
        SYSTEM_AUDIT_VIEW,
        ACADEMIC_CLASSES_VIEW,
        ACADEMIC_REPORTS_VIEW,
        FINANCE_REPORTS_VIEW,
    },
    "admin": {
        SYSTEM_USERS_MANAGE,
        SYSTEM_CONFIG_MANAGE,
        SYSTEM_AUDIT_VIEW,
        ACADEMIC_CLASSES_VIEW,
        ACADEMIC_CLASSES_MANAGE,
        ACADEMIC_SECTIONS_VIEW,
        ACADEMIC_SECTIONS_MANAGE,
        ACADEMIC_TEACHERS_VIEW,
        ACADEMIC_TEACHERS_ASSIGN,
        ACADEMIC_REPORTS_VIEW,
        FINANCE_FEES_VIEW,
        FINANCE_FEES_MANAGE,
        FINANCE_FEES_COLLECT,
        FINANCE_REPORTS_VIEW,
    },
    # Teacher = Assigned Instruction & Grading
    "teacher": {
        ACADEMIC_CLASSES_VIEW,
        ACADEMIC_SECTIONS_VIEW,
        ACADEMIC_TIMETABLE_VIEW,
        ACADEMIC_ATTENDANCE_MARK,
        ACADEMIC_EXAMS_VIEW,
        ACADEMIC_MARKS_VIEW,
        ACADEMIC_MARKS_ENTER,
    },
    # Student = Learning Info
    "student": {
        ACADEMIC_TIMETABLE_VIEW,
        ACADEMIC_MARKS_VIEW,
    },
    # Parent = Child Monitoring
    "parent": {
        ACADEMIC_TIMETABLE_VIEW,
        ACADEMIC_MARKS_VIEW,
        FINANCE_FEES_VIEW,
    },
}

# Granular module:action permission sets
GRANULAR_ROLE_PERMS: Dict[str, Set[str]] = {
    "super_admin": {
        "classes:write", "classes:read",
        "sections:write", "sections:read",
        "timetable:read",  # STRICTLY NO timetable:write
        "fees:manage", "fees:read", "fees:collect",
        "hostel:manage", "hostel:read",
        "users:admit", "users:read", "users:reset_password", "roles:manage",
        "admissions:config:manage", "admissions:batches:manage",
        "admissions:applications:view", "admissions:applications:triage",
        "admissions:assessments:manage", "admissions:assessments:evaluate",
        "admissions:fees:verify", "admissions:enroll:convert",
    },
    "admin": {
        "classes:write", "classes:read",
        "sections:write", "sections:read",
        "timetable:read",
        "fees:manage", "fees:read", "fees:collect",
        "hostel:manage", "hostel:read",
        "users:admit", "users:read", "users:reset_password",
        "admissions:config:manage", "admissions:batches:manage",
        "admissions:applications:view", "admissions:applications:triage",
        "admissions:assessments:manage", "admissions:assessments:evaluate",
        "admissions:fees:verify", "admissions:enroll:convert",
    },
    "parent": {
        "classes:read", "timetable:read", "fees:read",
    },
    "principal": {
        "classes:read", "sections:read",  # STRICTLY NO classes:write or sections:write
        "timetable:write", "timetable:read",
        "fees:read", "hostel:read",
        "users:read",
        "admissions:applications:view", "admissions:applications:triage",
        "admissions:assessments:manage", "admissions:assessments:evaluate",
    },
    "teacher": {
        "classes:read", "sections:read", "timetable:read", "users:read",
        "admissions:applications:view", "admissions:assessments:evaluate",
    },
    "student": {
        "classes:read", "timetable:read",
    },
    "accountant": {
        "fees:read", "fees:collect", "classes:read", "sections:read", "users:read",
        "admissions:applications:view", "admissions:fees:verify",
    },
    "finance": {
        "fees:manage", "fees:read", "fees:collect", "classes:read", "sections:read", "users:read",
        "admissions:applications:view", "admissions:fees:verify",
    },
    "manager": {
        "fees:read", "fees:collect", "classes:read", "sections:read", "users:read",
        "admissions:applications:view", "admissions:fees:verify",
    },
    "hostel_warden": {
        "hostel:manage", "hostel:read", "users:read",
    },
}


def has_permission(user_role: str, permission: str) -> bool:
    """Checks whether a role possesses a specific permission."""
    perms = ROLE_PERMISSIONS.get(user_role.lower(), set()) | GRANULAR_ROLE_PERMS.get(user_role.lower(), set())
    return permission in perms


class PermissionChecker:
    """
    FastAPI dependency for verifying that authenticated user has ALL required permissions.
    """
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    def __call__(self, current_user: User) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.user_type.lower(), set()) | GRANULAR_ROLE_PERMS.get(current_user.user_type.lower(), set())
        missing = [p for p in self.required_permissions if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permissions: {missing}",
            )
        return current_user
