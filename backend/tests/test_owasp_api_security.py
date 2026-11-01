import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_broken_function_level_authorization(setup_test_auth_fixtures):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as student
        s_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@school.com", "password": "student@123"},
        )
        s_token = s_login.json()["data"]["token"]

        # Student calls admin user list -> 403 Forbidden
        res_admin = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {s_token}"},
        )
        assert res_admin.status_code == 403

        # Student calls teacher attendance endpoint -> 403 Forbidden
        res_att = await client.post(
            "/api/v1/attendance/sections/sec-10a",
            headers={"Authorization": f"Bearer {s_token}"},
            json={"sectionId": "sec-10a", "date": "2026-10-24", "records": {}},
        )
        assert res_att.status_code == 403


@pytest.mark.asyncio
async def test_teacher_marks_broken_object_authorization(setup_test_auth_fixtures):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as Teacher 2 (Sunita Iyer - Science Teacher for 10A, but NOT Math Teacher and NOT assigned to 9A)
        t2_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "sunita.sci@edupulse.edu.in", "password": "teacher@123"},
        )
        t2_token = t2_login.json()["data"]["token"]

        # Teacher 2 tries to submit Mathematics (sub-1) marks for 10A (she only teaches Science)
        unauth_marks_payload = {
            "examId": "ex-1",
            "sectionId": "sec-10a",
            "subjectId": "sub-1",  # Mathematics
            "marks": [
                {
                    "id": "m-temp",
                    "studentId": "usr-student-1",
                    "academicYear": "2026-2027",
                    "term": 1,
                    "examName": "Mid-Term",
                    "subject": "Mathematics",
                    "subjectId": "sub-1",
                    "testScore": 25,
                    "examScore": 60,
                    "totalScore": 85,
                    "grade": "A2",
                    "gradePoint": 9.0,
                    "status": "SUBMITTED",
                }
            ],
        }

        res = await client.post(
            "/api/v1/examinations/marks",
            headers={"Authorization": f"Bearer {t2_token}"},
            json=unauth_marks_payload,
        )
        # Must be rejected because Sunita is NOT the Math teacher for 10A and NOT the Class Teacher of 10A!
        assert res.status_code == 403
        assert "not assigned to instruct or grade this subject" in res.json()["error"]["message"]
