"""
Cleanup script to safely remove ONLY QA dummy data created by seed_qa_data.py.
Preserves all original seed data and test accounts.
Tag: BATCH_QA_2026
"""

import asyncio
from sqlalchemy import select, delete, or_
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.student import StudentProfile, StudentEnrollment, ParentChildLink
from app.models.teacher import TeacherProfile, TeacherAssignment
from app.models.attendance import Attendance
from app.models.exam import Exam, ExamMark
from app.models.academic import Subject

BATCH_TAG = "BATCH_QA_2026"

async def cleanup():
    print("Starting cleanup of QA dummy data (Tag: BATCH_QA_2026)...")
    async with AsyncSessionLocal() as session:
        # 1. Delete QA Exam Marks
        qa_exams = (await session.execute(
            select(Exam.id).where(Exam.name.like("%[TEST]%"))
        )).scalars().all()
        if qa_exams:
            del_marks = await session.execute(
                delete(ExamMark).where(ExamMark.exam_id.in_(qa_exams))
            )
            print(f"Deleted {del_marks.rowcount} QA exam marks.")
            del_ex = await session.execute(
                delete(Exam).where(Exam.id.in_(qa_exams))
            )
            print(f"Deleted {del_ex.rowcount} QA exam cycles.")

        # 2. Find QA Students
        qa_students = (await session.execute(
            select(User.id).where(
                or_(
                    User.name.like("%[TEST]%"),
                    User.email.like("%@mps-ka.edu.in"),
                    User.address.like(f"%{BATCH_TAG}%"),
                    User.code.like("%MPS/QA/2026/%")
                )
            )
        )).scalars().all()
        print(f"Found {len(qa_students)} QA student users to clean.")

        if qa_students:
            qa_sp = (await session.execute(
                select(StudentProfile.id).where(StudentProfile.user_id.in_(qa_students))
            )).scalars().all()

            if qa_sp:
                # Delete Attendance
                del_att = await session.execute(
                    delete(Attendance).where(Attendance.student_id.in_(qa_sp))
                )
                print(f"Deleted {del_att.rowcount} attendance records.")

                # Delete Enrollments
                del_enr = await session.execute(
                    delete(StudentEnrollment).where(StudentEnrollment.student_id.in_(qa_sp))
                )
                print(f"Deleted {del_enr.rowcount} student enrollments.")

                # Delete Parent Child Links
                del_pcl = await session.execute(
                    delete(ParentChildLink).where(ParentChildLink.student_profile_id.in_(qa_sp))
                )
                print(f"Deleted {del_pcl.rowcount} parent-child links.")

                # Delete Student Profiles
                del_sp = await session.execute(
                    delete(StudentProfile).where(StudentProfile.id.in_(qa_sp))
                )
                print(f"Deleted {del_sp.rowcount} student profiles.")

            # Delete QA Student Users
            del_u = await session.execute(
                delete(User).where(User.id.in_(qa_students))
            )
            print(f"Deleted {del_u.rowcount} student user accounts.")

        # 3. Find and Delete QA Teachers
        qa_teachers = (await session.execute(
            select(User.id).where(
                or_(
                    User.email.like("%@testschool.com"),
                    User.username.like("qa_tch_%"),
                    User.name.like("%[TEST]%")
                )
            )
        )).scalars().all()
        print(f"Found {len(qa_teachers)} QA teacher users to clean.")

        if qa_teachers:
            del_tp = await session.execute(
                delete(TeacherProfile).where(TeacherProfile.user_id.in_(qa_teachers))
            )
            print(f"Deleted {del_tp.rowcount} teacher profiles.")

            del_tu = await session.execute(
                delete(User).where(User.id.in_(qa_teachers))
            )
            print(f"Deleted {del_tu.rowcount} teacher user accounts.")

        # 4. Clean QA Subjects (keep original sub-1 and sub-2)
        qa_subs = await session.execute(
            delete(Subject).where(Subject.id.like("sub-cls-%"))
        )
        print(f"Deleted {qa_subs.rowcount} generated QA subjects.")

        await session.commit()
        print("Cleanup completed successfully. Original baseline records untouched.")

if __name__ == "__main__":
    asyncio.run(cleanup())

