import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
import json

from app.main import app
from app.db.session import get_db
from app.models import Base, User, AcademicYear, Class, Section, Stream, StudentProfile, StudentEnrollment
from app.core.security import create_access_token, get_password_hash


# In-memory SQLite async engine for automated isolation testing
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_test_db():
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    app.dependency_overrides[get_db] = override_test_db
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed baseline Admin, Principal, and Teacher
    async with TestSession() as session:
        pwd = get_password_hash("Secret123!")
        admin_user = User(
            id="usr-admin-test",
            email="admin@test.edu",
            username="admin_test",
            password_hash=pwd,
            name="Super Admin",
            user_type="super_admin",
            is_active=True,
        )
        principal_user = User(
            id="usr-principal-test",
            email="principal@test.edu",
            username="principal_test",
            password_hash=pwd,
            name="School Principal",
            user_type="principal",
            is_active=True,
        )
        teacher_user = User(
            id="usr-teacher-test",
            email="teacher@test.edu",
            username="teacher_test",
            password_hash=pwd,
            name="Teacher One",
            user_type="teacher",
            is_active=True,
        )
        session.add_all([admin_user, principal_user, teacher_user])
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    from conftest import override_get_db
    app.dependency_overrides[get_db] = override_get_db


def make_auth_headers(user_id: str, email: str, role: str) -> dict:
    token_str, _, _ = create_access_token(subject=user_id, role=role, extra_claims={"email": email})
    return {"Authorization": f"Bearer {token_str}"}


@pytest.mark.asyncio
async def test_academic_session_atomic_activation():
    """Test A: Session Management - Only one session current at a time."""
    admin_hdr = make_auth_headers("usr-admin-test", "admin@test.edu", "super_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create 2026-2027 as current
        r1 = await client.post("/api/v1/academics/years", json={
            "name": "2026-2027",
            "code": "2026-27",
            "startDate": "2026-06-01",
            "endDate": "2027-04-30",
            "isCurrent": True
        }, headers=admin_hdr)
        assert r1.status_code == 200
        assert r1.json()["data"]["isCurrent"] is True

        # Create 2027-2028 (not current)
        r2 = await client.post("/api/v1/academics/years", json={
            "name": "2027-2028",
            "code": "2027-28",
            "startDate": "2027-06-01",
            "endDate": "2028-04-30",
            "isCurrent": False
        }, headers=admin_hdr)
        assert r2.status_code == 200
        y2_id = r2.json()["data"]["id"]

        # Activate 2027-2028 atomically
        act_res = await client.patch(f"/api/v1/academics/years/{y2_id}/activate", headers=admin_hdr)
        assert act_res.status_code == 200

        # Verify 2026-2027 is now isCurrent = False
        years_res = await client.get("/api/v1/academics/years")
        years = years_res.json()["data"]
        y26 = next(y for y in years if y["name"] == "2026-2027")
        y27 = next(y for y in years if y["name"] == "2027-2028")
        assert y26["isCurrent"] is False
        assert y27["isCurrent"] is True


@pytest.mark.asyncio
async def test_stream_creation_and_class_binding():
    """Test B: Stream Management & Classes with hasStreams flag."""
    admin_hdr = make_auth_headers("usr-admin-test", "admin@test.edu", "super_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Stream Science
        st_res = await client.post("/api/v1/academics/streams", json={
            "name": "Science",
            "code": "SCI",
            "description": "PCM/PCB"
        }, headers=admin_hdr)
        assert st_res.status_code == 200
        stream_id = st_res.json()["data"]["id"]

        # 2. Create Class 12 with hasStreams = True
        c_res = await client.post("/api/v1/academics/classes", json={
            "name": "Class 12",
            "hasStreams": True,
            "orderIndex": 12
        }, headers=admin_hdr)
        assert c_res.status_code == 200
        class_id = c_res.json()["data"]["id"]

        # 3. Create Section without stream should fail with 400
        fail_sec = await client.post("/api/v1/academics/sections", json={
            "classId": class_id,
            "name": "Section A",
            "code": "12-A",
            "capacity": 30
        }, headers=admin_hdr)
        assert fail_sec.status_code == 400

        # 4. Create Section with valid stream succeeds
        ok_sec = await client.post("/api/v1/academics/sections", json={
            "classId": class_id,
            "streamId": stream_id,
            "name": "12th Science A",
            "code": "12-SCI-A",
            "capacity": 35
        }, headers=admin_hdr)
        assert ok_sec.status_code == 200
        assert ok_sec.json()["data"]["streamId"] == stream_id


@pytest.mark.asyncio
async def test_enrollment_capacity_and_roll_numbers():
    """Test C: Capacity Guardrail & Alphabetical Roll Number Recalculation."""
    admin_hdr = make_auth_headers("usr-admin-test", "admin@test.edu", "super_admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create session
        ay = await client.post("/api/v1/academics/years", json={
            "name": "2026-2027", "code": "2026-27", "startDate": "2026-06-01", "endDate": "2027-04-30", "isCurrent": True
        }, headers=admin_hdr)
        ay_id = ay.json()["data"]["id"]

        # Create class 9 (no streams)
        cls = await client.post("/api/v1/academics/classes", json={"name": "Class 9", "hasStreams": False}, headers=admin_hdr)
        cls_id = cls.json()["data"]["id"]

        # Create section with capacity 2
        sec = await client.post("/api/v1/academics/sections", json={
            "classId": cls_id, "name": "Section A", "code": "9-A", "capacity": 2
        }, headers=admin_hdr)
        sec_id = sec.json()["data"]["id"]

        # Seed 3 students directly in DB
        async with TestSession() as db:
            pwd = get_password_hash("Student123!")
            u_zara = User(id="u-zara", email="zara@test.com", username="zara", password_hash=pwd, name="Zara Sharma", user_type="student", is_active=True)
            u_aarav = User(id="u-aarav", email="aarav@test.com", username="aarav", password_hash=pwd, name="Aarav Patel", user_type="student", is_active=True)
            u_bob = User(id="u-bob", email="bob@test.com", username="bob", password_hash=pwd, name="Bob Mehta", user_type="student", is_active=True)
            db.add_all([u_zara, u_aarav, u_bob])
            await db.flush()

            sp1 = StudentProfile(id="sp-zara", user_id="u-zara", admission_number="ADM-001")
            sp2 = StudentProfile(id="sp-aarav", user_id="u-aarav", admission_number="ADM-002")
            sp3 = StudentProfile(id="sp-bob", user_id="u-bob", admission_number="ADM-003")
            db.add_all([sp1, sp2, sp3])
            await db.commit()

        # Enroll Zara first
        e1 = await client.post("/api/v1/academics/enrollments", json={
            "studentId": "sp-zara", "academicYearId": ay_id, "classId": cls_id, "sectionId": sec_id
        }, headers=admin_hdr)
        assert e1.status_code == 200
        assert e1.json()["data"]["rollNumber"] == "1"

        # Enroll Aarav second
        e2 = await client.post("/api/v1/academics/enrollments", json={
            "studentId": "sp-aarav", "academicYearId": ay_id, "classId": cls_id, "sectionId": sec_id
        }, headers=admin_hdr)
        assert e2.status_code == 200
        assert e2.json()["data"]["rollNumber"] == "2"

        # Third enrollment exceeds capacity (2) -> must fail with 400
        e3 = await client.post("/api/v1/academics/enrollments", json={
            "studentId": "sp-bob", "academicYearId": ay_id, "classId": cls_id, "sectionId": sec_id
        }, headers=admin_hdr)
        assert e3.status_code == 400
        res_json = e3.json()
        err_msg = res_json.get("detail") or res_json.get("message") or (res_json.get("error", {}).get("message") if isinstance(res_json.get("error"), dict) else "")
        assert "capacity" in err_msg.lower()

        # Recalculate Roll Numbers alphabetically: Aarav Patel (1), Zara Sharma (2)
        recalc = await client.post(f"/api/v1/academics/sections/{sec_id}/recalculate-roll-numbers", json={
            "sectionId": sec_id, "academicYearId": ay_id
        }, headers=admin_hdr)
        assert recalc.status_code == 200

        # Verify alphabetical order in roster
        roster = await client.get("/api/v1/academics/enrollments", params={"section_id": sec_id, "academic_year_id": ay_id})
        items = roster.json()["data"]
        aarav_item = next(it for it in items if it["studentName"] == "Aarav Patel")
        zara_item = next(it for it in items if it["studentName"] == "Zara Sharma")
        assert aarav_item["rollNumber"] == "1"
        assert zara_item["rollNumber"] == "2"


@pytest.mark.asyncio
async def test_rbac_ownership_separation():
    """Test D: Principal view-only on fees; Admin view-only on Timetable compile."""
    admin_hdr = make_auth_headers("usr-admin-test", "admin@test.edu", "super_admin")
    principal_hdr = make_auth_headers("usr-principal-test", "principal@test.edu", "principal")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create Class for test
        cls = await client.post("/api/v1/academics/classes", json={"name": "Class 7", "hasStreams": False}, headers=admin_hdr)
        cls_id = cls.json()["data"]["id"]

        # 1. Principal attempts to CREATE Fee Structure -> 403 FORBIDDEN
        p_fee = await client.post("/api/v1/super-admin/fees/structures", json={
            "classId": cls_id,
            "title": "Principal Illegal Fee Structure",
            "feeHeads": {"Tuition": 20000}
        }, headers=principal_hdr)
        assert p_fee.status_code == 403

        # 2. Admin attempts to COMPILE / PUBLISH Timetable -> 403 FORBIDDEN
        a_tt = await client.post("/api/v1/timetables/compile", json={
            "academic_year_id": "ay-2026-2027",
            "term_code": "TERM-1",
            "periods_per_day": 7
        }, headers=admin_hdr)
        assert a_tt.status_code == 403
