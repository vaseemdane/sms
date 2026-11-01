from fastapi import APIRouter
from app.api.v1.academics import router as academics_router
from app.api.v1.admin import router as admin_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.auth import router as auth_router
from app.api.v1.communication import router as comm_router
from app.api.v1.examinations import router as exam_router, academic_marks_router, analytics_router
from app.api.v1.materials import router as materials_router
from app.api.v1.parents import router as parents_router
from app.api.v1.students import router as students_router
from app.api.v1.teachers import router as teachers_router
from app.api.v1.timetable import router as timetable_router

from app.api.v1.principal import router as principal_router
from app.api.v1.manager import router as manager_router

from app.api.v1.super_admin import router as super_admin_router

from app.api.v1.school_operations import router as operations_router
from app.api.v1.admissions import router as admissions_router
from app.api.v1.education import router as education_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(super_admin_router)
api_router.include_router(principal_router)
api_router.include_router(manager_router)
api_router.include_router(academics_router, prefix="/academics")
api_router.include_router(academics_router, prefix="/academic")
api_router.include_router(attendance_router)
api_router.include_router(timetable_router)
api_router.include_router(teachers_router)
api_router.include_router(students_router)
api_router.include_router(parents_router)
api_router.include_router(exam_router, prefix="/examinations")
api_router.include_router(exam_router, prefix="/exams")
api_router.include_router(academic_marks_router)
api_router.include_router(analytics_router)
api_router.include_router(materials_router)
api_router.include_router(comm_router)
api_router.include_router(operations_router)
api_router.include_router(admissions_router)
api_router.include_router(education_router)
