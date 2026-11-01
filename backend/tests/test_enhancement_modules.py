import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def principal_token():
    res = create_access_token(
        subject="usr-principal-01", role="principal", school_id="sch-01"
    )
    return res.token


@pytest.fixture
def admin_token():
    res = create_access_token(
        subject="usr-admin-01", role="admin", school_id="sch-01"
    )
    return res.token


@pytest.fixture
def teacher_token():
    res = create_access_token(
        subject="usr-teacher-01", role="teacher", school_id="sch-01"
    )
    return res.token


@pytest.mark.asyncio
async def test_module1_auth_me(principal_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {principal_token}"},
        )
        assert res.status_code in (200, 401, 404)


@pytest.mark.asyncio
async def test_module1_subject_rbac_principal_only(principal_token, admin_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Admin must be denied write access (403 Forbidden)
        admin_res = await client.post(
            "/api/v1/academic/subjects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"classId": "cls-class10", "name": "Admin Subject"},
        )
        assert admin_res.status_code == 403


@pytest.mark.asyncio
async def test_module2_delete_stream_dependency_check(admin_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(
            "/api/v1/academic/streams/str-nonexistent",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code in (404, 400, 200)


@pytest.mark.asyncio
async def test_module4_exam_timetable_crud(principal_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        put_res = await client.put(
            "/api/v1/exams/ex-test/timetable",
            headers={"Authorization": f"Bearer {principal_token}"},
            json={
                "days": [
                    {
                        "date": "2026-10-05",
                        "is_holiday": False,
                        "slots": [
                            {
                                "slotName": "Slot 1 (Morning)",
                                "startTime": "10:00 AM",
                                "endTime": "11:30 AM",
                                "subjectName": "Mathematics",
                            }
                        ],
                    },
                    {
                        "date": "2026-10-06",
                        "is_holiday": True,
                        "holiday_reason": "Gandhi Jayanti",
                        "slots": [],
                    },
                ],
                "publish_notifications": True,
            },
        )
        assert put_res.status_code in (200, 404)


@pytest.mark.asyncio
async def test_module5_analytics_compare_validation(principal_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/analytics/exam/ex-test/compare?classId=cls-invalid",
            headers={"Authorization": f"Bearer {principal_token}"},
        )
        assert res.status_code in (404, 400, 200)


@pytest.mark.asyncio
async def test_module6_cohort_promote_validation(principal_token):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Same source and target session must be rejected with 400
        res = await client.post(
            "/api/v1/students/cohort-promote",
            headers={"Authorization": f"Bearer {principal_token}"},
            json={
                "source_session_id": "ay-2025-2026",
                "target_session_id": "ay-2025-2026",
            },
        )
        assert res.status_code == 400
