import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_and_readiness():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Public health check
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # Readiness endpoint
        ready = await client.get("/ready")
        assert ready.status_code == 200
        assert ready.json()["status"] == "ready"
        assert ready.json()["database"] == "connected"
        assert ready.json()["redis"] == "connected"


@pytest.mark.asyncio
async def test_authentication_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid credentials -> 401
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@school.com", "password": "wrongpassword123"},
        )
        assert bad_login.status_code == 401
        assert bad_login.json()["success"] is False

        # Valid Super Admin login -> 200
        good_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@school.com", "password": "SuperAdmin@123"},
        )
        assert good_login.status_code == 200
        res = good_login.json()
        assert res["success"] is True
        token = res["data"]["token"]
        assert token is not None
        assert res["data"]["role"].lower() == "super_admin"


@pytest.mark.asyncio
async def test_attendance_assignment_authorization(setup_test_auth_fixtures):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as teacher 1 (assigned to Math, sec-10a)
        t1_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "rajesh.math@edupulse.edu.in", "password": "teacher@123"},
        )
        assert t1_login.status_code == 200
        t1_token = t1_login.json()["data"]["token"]

        # Attempt to mark attendance for non-assigned class -> 403 Forbidden
        unauth_attendance = await client.post(
            "/api/v1/attendance/mark",
            headers={"Authorization": f"Bearer {t1_token}"},
            json={
                "class_id": "cls-class10",
                "section_id": "sec-non-assigned",
                "date": "2026-10-25",
                "attendance_records": [{"student_id": "usr-student-1", "status": "PRESENT"}]
            }
        )
        assert unauth_attendance.status_code in [403, 404]


@pytest.mark.asyncio
async def test_marks_lock_and_rbac(setup_test_auth_fixtures):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as student
        s_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@school.com", "password": "student@123"},
        )
        assert s_login.status_code == 200
        s_token = s_login.json()["data"]["token"]

        # Student attempts to enter marks -> 403 Forbidden
        tamper_marks = await client.post(
            "/api/v1/academic/marks/entry",
            headers={"Authorization": f"Bearer {s_token}"},
            json={
                "exam_id": "ex-1",
                "subject_id": "sub-1",
                "marks_records": [{"student_id": "usr-student-1", "marks_obtained": 99}]
            }
        )
        assert tamper_marks.status_code == 403


@pytest.mark.asyncio
async def test_parent_cross_tenant_child_isolation(setup_test_auth_fixtures):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create unassociated parent token
        from app.core.security import create_access_token
        parent_token = create_access_token(
            subject="usr-parent-fake",
            role="PARENT",
            school_id="sch-main",
            extra_claims={"user_id": "usr-parent-fake"}
        )

        # Parent attempts to fetch profile of unassociated child
        cross_child_fetch = await client.get(
            "/api/v1/parent/children/usr-student-2/report-card",
            headers={"Authorization": f"Bearer {parent_token}"}
        )
        assert cross_child_fetch.status_code in [403, 404]
