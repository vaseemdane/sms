import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models import (
    User,
    AcademicYear,
    ClassType,
    Class,
    Section,
    Subject,
    TeacherProfile,
    TeacherAssignment,
    StudentProfile,
    StudentEnrollment,
    ParentChildLink,
    GradeScale,
    Exam,
    ExamMark,
    Timetable,
    TimetableSlot,
    FeeCategory,
    FeeStructure,
    Dormitory,
    Notification,
    Announcement,
)


async def seed():
    print("Starting database seed...")
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select
        existing_ay = (await session.execute(select(AcademicYear).where(AcademicYear.id == "ay-2026-2027"))).scalar_one_or_none()
        if existing_ay:
            print("Database already seeded with academic year ay-2026-2027. Skipping seed.")
            return

        # 1. Academic Year
        ay = AcademicYear(
            id="ay-2026-2027",
            name="2026-2027",
            code="2026-27",
            start_date="2026-06-01",
            end_date="2027-04-30",
            is_current=True,
        )
        session.add(ay)
        await session.flush()

        # 2. Class Types
        ct_sec = ClassType(id="ct-4", name="Secondary (Class 9-10)", code="SEC", category="SECONDARY")
        ct_pry = ClassType(id="ct-2", name="Primary School (Class 1-5)", code="PRY", category="PRIMARY")
        session.add_all([ct_sec, ct_pry])
        await session.flush()

        # 3. Classes
        cls_10 = Class(id="cls-10", name="Class 10", class_type_id="ct-4", order_index=10)
        cls_9 = Class(id="cls-9", name="Class 9", class_type_id="ct-4", order_index=9)
        session.add_all([cls_10, cls_9])
        await session.flush()

        # 4. Sections
        sec_10a = Section(id="sec-10a", class_id="cls-10", name="Section A", code="10A", is_active=True)
        sec_10b = Section(id="sec-10b", class_id="cls-10", name="Section B", code="10B", is_active=True)
        sec_9a = Section(id="sec-9a", class_id="cls-9", name="Section A", code="9A", is_active=True)
        session.add_all([sec_10a, sec_10b, sec_9a])
        await session.flush()

        # 5. Subjects
        sub_math = Subject(id="sub-1", class_id="cls-10", name="Mathematics", slug="mathematics", code="MATH101", is_core=True)
        sub_sci = Subject(id="sub-2", class_id="cls-10", name="Science", slug="science", code="SCI101", is_core=True)
        sub_eng = Subject(id="sub-3", class_id="cls-10", name="English Language", slug="english", code="ENG101", is_core=True)
        session.add_all([sub_math, sub_sci, sub_eng])
        await session.flush()

        # 6. Default School & Clean Super Admin
        from app.models.school import School
        existing_school = (await session.execute(select(School).where(School.id == "sch-main"))).scalar_one_or_none()
        if not existing_school:
            default_school = School(
                id="sch-main",
                name=os.getenv("DEFAULT_SCHOOL_NAME", "Megha Public School"),
                code="MPS-KA",
                board="CBSE",
                city="Bengaluru Urban",
                state="Karnataka",
                is_active=True,
            )
            session.add(default_school)
            await session.flush()

        sa_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@school.com").strip().lower()
        sa_user = os.getenv("SUPER_ADMIN_USERNAME", "admin").strip().lower()
        sa_pass = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@123")
        pass_admin = get_password_hash(sa_pass)

        u_sa = User(
            id="usr-superadmin",
            name=os.getenv("SUPER_ADMIN_NAME", "Super Administrator"),
            email=sa_email,
            username=sa_user,
            password_hash=pass_admin,
            user_type="super_admin",
            phone=os.getenv("SUPER_ADMIN_PHONE", "+91 9880011223"),
            state="Karnataka",
            district="Bengaluru Urban",
            address="Vidhana Soudha Road, Bengaluru",
            code="EDP/SA/001",
            is_active=True,
            must_change_password=False,
            school_id=None,
        )
        session.add(u_sa)
        await session.flush()

        # 7. Grade Scales
        grd_a1 = GradeScale(id="grd-1", class_type_id="ct-4", name="A1", mark_from=91, mark_to=100, grade_point=10.0, remark="Outstanding")
        grd_a2 = GradeScale(id="grd-2", class_type_id="ct-4", name="A2", mark_from=81, mark_to=90, grade_point=9.0, remark="Excellent")
        grd_b1 = GradeScale(id="grd-3", class_type_id="ct-4", name="B1", mark_from=71, mark_to=80, grade_point=8.0, remark="Very Good")
        session.add_all([grd_a1, grd_a2, grd_b1])

        # 8. Exam Infrastructure (Clean template without dummy marks)
        exam_term1 = Exam(
            id="ex-1",
            academic_year_id="ay-2026-2027",
            name="Mid-Term Examination 2026",
            term=1,
            start_date="2026-09-15",
            end_date="2026-09-28",
            is_published=True,
        )
        session.add(exam_term1)
        await session.flush()

        # 11. Timetable for 10A
        tt_10a = Timetable(
            id="tt-10a",
            academic_year_id="ay-2026-2027",
            class_id="cls-10",
            section_id="sec-10a",
            is_published=True,
            version=1,
        )
        session.add(tt_10a)
        await session.flush()

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        slots = []
        for i, day in enumerate(days):
            slots.append(
                TimetableSlot(
                    id=f"slot-{day}-1",
                    timetable_id="tt-10a",
                    day_of_week=day,
                    start_time="08:30",
                    end_time="09:00",
                    slot_type="BREAK",
                    title="Morning Assembly & Prayer",
                    room="Assembly Ground",
                )
            )
            slots.append(
                TimetableSlot(
                    id=f"slot-{day}-2",
                    timetable_id="tt-10a",
                    day_of_week=day,
                    start_time="09:00",
                    end_time="09:45",
                    slot_type="PERIOD",
                    subject_id="sub-1",
                    teacher_id=None,
                    room="Room 204",
                )
            )
            slots.append(
                TimetableSlot(
                    id=f"slot-{day}-3",
                    timetable_id="tt-10a",
                    day_of_week=day,
                    start_time="09:45",
                    end_time="10:30",
                    slot_type="PERIOD",
                    subject_id="sub-2",
                    teacher_id=None,
                    room="Science Lab 1",
                )
            )
        session.add_all(slots)

        # 12. Dormitories & Fees
        dorm = Dormitory(id="dorm-1", name="Kaveri Boys Hostel", capacity=120, description="Senior residential hostel block.")
        session.add(dorm)

        fc = FeeCategory(id="fc-1", name="Tuition Fee", description="Term tuition and laboratory fee.")
        session.add(fc)
        await session.flush()

        fs = FeeStructure(
            id="fs-1",
            academic_year_id="ay-2026-2027",
            class_id="cls-10",
            fee_category_id="fc-1",
            title="Class 10 Term 1 Tuition Fee",
            amount=32000.0,
            term=1,
            due_date="2026-07-15",
        )
        session.add(fs)

        # 13. Notifications & Announcements
        notif = Notification(
            id="notif-1",
            recipient_user_id=u_sa.id,
            title="System Initialized Cleanly",
            message="Clean system initialization complete. Ready for manual E2E evaluation.",
            category="system",
            priority="normal",
            link="/dashboard",
            is_read=False,
        )
        ann = Announcement(
            id="ann-1",
            title="Karnataka Rajyotsava Celebrations & Exhibition",
            content="Annual cultural celebration scheduled on Nov 1st in the main auditorium.",
            priority="normal",
            published_by_user_id="usr-superadmin",
            target_audience="All School",
            category="Cultural",
            publish_date="2026-10-24",
        )
        session.add_all([notif, ann])

        await session.commit()
        print("Database seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
