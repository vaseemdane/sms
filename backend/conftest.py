import os
import sys
import pytest
import redis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.session import get_db
from app.main import app

# Set generous rate limit for test executions
settings.RATE_LIMIT_LOGIN_PER_MIN = 1000

test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def ensure_db_override():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def clear_test_rate_limits():
    """Clears redis rate limit keys before every test using synchronous client."""
    import app.core.redis as app_redis
    app_redis._redis_client = None
    try:
        r = redis.Redis(host="localhost", port=6380, decode_responses=True)
        keys = r.keys("rate_limit:*")
        if keys:
            r.delete(*keys)
        r.close()
    except Exception:
        pass
    yield
    app_redis._redis_client = None


import pytest_asyncio


@pytest_asyncio.fixture(autouse=True)
async def setup_test_auth_fixtures():
    from app.core.security import get_password_hash
    from app.models import (
        User, ClassType, Class, Section, Subject, AcademicYear,
        TeacherProfile, TeacherAssignment, Exam
    )
    from sqlalchemy import select

    async with TestingSessionLocal() as session:
        # 1. Academic Year
        ay = await session.get(AcademicYear, "ay-2026-2027")
        if not ay:
            session.add(AcademicYear(
                id="ay-2026-2027", name="2026-2027", code="2026-27",
                start_date="2026-06-01", end_date="2027-04-30", is_current=True
            ))

        # 2. Class 10 (use existing cls-class10)
        ct = await session.get(ClassType, "ct-secondary")
        if not ct:
            ct = ClassType(id="ct-secondary", name="Secondary", code="SEC", category="SECONDARY")
            session.add(ct)
            await session.flush()

        cls10 = await session.get(Class, "cls-class10")
        if not cls10:
            cls10 = Class(id="cls-class10", name="Class 10", class_type_id="ct-secondary", order_index=10, is_active=True)
            session.add(cls10)
            await session.flush()

        # 3. Subjects
        for subid, subname in [("sub-1", "Mathematics"), ("sub-2", "Science")]:
            sub = await session.get(Subject, subid)
            if not sub:
                session.add(Subject(id=subid, class_id=cls10.id, name=subname, slug=subname.lower(), code=subid, is_core=True))

        # 4. Test Users
        t_pass = get_password_hash("teacher@123")
        s_pass = get_password_hash("student@123")
        sa_pass = get_password_hash("SuperAdmin@123")

        usa = (await session.execute(select(User).where((User.email == "admin@school.com") | (User.username == "admin")))).scalar_one_or_none()
        if not usa:
            usa = User(
                id="usr-superadmin",
                name="Super Administrator",
                email="admin@school.com",
                username="admin",
                password_hash=sa_pass,
                user_type="super_admin",
                is_active=True,
            )
            session.add(usa)
        else:
            usa.password_hash = sa_pass
            usa.is_active = True

        u1 = (await session.execute(select(User).where(User.email == "rajesh.math@edupulse.edu.in"))).scalar_one_or_none()
        if not u1:
            u1 = User(id="usr-t1", email="rajesh.math@edupulse.edu.in", username="rajesh_math", password_hash=t_pass, user_type="teacher", name="Rajesh Kulkarni", is_active=True)
            session.add(u1)

        u2 = (await session.execute(select(User).where(User.email == "sunita.sci@edupulse.edu.in"))).scalar_one_or_none()
        if not u2:
            u2 = User(id="usr-t2", email="sunita.sci@edupulse.edu.in", username="sunita_sci", password_hash=t_pass, user_type="teacher", name="Sunita Iyer", is_active=True)
            session.add(u2)

        us = (await session.execute(select(User).where(User.email == "student@school.com"))).scalar_one_or_none()
        if not us:
            us = User(id="usr-student-1", email="student@school.com", username="test_student", password_hash=s_pass, user_type="student", name="Test Student", is_active=True)
            session.add(us)

        us2 = (await session.execute(select(User).where(User.email == "student2@school.com"))).scalar_one_or_none()
        if not us2:
            us2 = User(id="usr-student-2", email="student2@school.com", username="test_student2", password_hash=s_pass, user_type="student", name="Test Student 2", is_active=True)
            session.add(us2)

        await session.flush()

        from app.models.student import StudentProfile
        sp1 = await session.get(StudentProfile, "sp-1")
        if not sp1:
            session.add(StudentProfile(id="sp-1", user_id="usr-student-1", admission_number="ADM-001", current_academic_year_id="ay-2026-2027"))
        sp2 = await session.get(StudentProfile, "sp-2")
        if not sp2:
            session.add(StudentProfile(id="sp-2", user_id="usr-student-2", admission_number="ADM-002", current_academic_year_id="ay-2026-2027"))

        # 5. Teacher Profiles
        tp1 = await session.get(TeacherProfile, "tp-t1")
        if not tp1:
            session.add(TeacherProfile(id="tp-t1", user_id=u1.id, employee_code="T-101", designation="Class Teacher"))
        
        tp2 = await session.get(TeacherProfile, "tp-t2")
        if not tp2:
            session.add(TeacherProfile(id="tp-t2", user_id=u2.id, employee_code="T-102", designation="Subject Teacher"))

        await session.flush()

        # 6. Section
        sec10a = await session.get(Section, "sec-10a")
        if not sec10a:
            session.add(Section(id="sec-10a", class_id=cls10.id, name="Section A", code="10A", capacity=40, is_active=True))
            await session.flush()

        # 7. Teacher Assignments
        ta1 = await session.get(TeacherAssignment, "ta-t1-10a")
        if not ta1:
            session.add(TeacherAssignment(
                id="ta-t1-10a", teacher_id="tp-t1", academic_year_id="ay-2026-2027",
                class_id=cls10.id, section_id="sec-10a", subject_id="sub-1",
                assignment_type="CLASS_TEACHER", is_primary=True
            ))

        ta2 = await session.get(TeacherAssignment, "ta-t2-10a")
        if not ta2:
            session.add(TeacherAssignment(
                id="ta-t2-10a", teacher_id="tp-t2", academic_year_id="ay-2026-2027",
                class_id=cls10.id, section_id="sec-10a", subject_id="sub-2",
                assignment_type="SUBJECT_TEACHER", is_primary=False
            ))

        # 8. Exam
        ex = await session.get(Exam, "ex-1")
        if not ex:
            session.add(Exam(
                id="ex-1", academic_year_id="ay-2026-2027", name="Mid-Term", term=1,
                start_date="2026-09-15", end_date="2026-09-28", is_published=True
            ))

        await session.commit()
    yield
