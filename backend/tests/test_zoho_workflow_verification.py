import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_auth_01_unauthenticated_rejected():
    """AUTH-01: Direct unauthenticated access to internal modules must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Lesson notes
        res1 = await client.get("/api/v1/operations/lesson-notes")
        assert res1.status_code == 401

        # Section materials
        res2 = await client.get("/api/v1/materials/section/sec-10a")
        assert res2.status_code == 401

        # Student attendance
        res3 = await client.get("/api/v1/attendance/student")
        assert res3.status_code == 401


@pytest.mark.asyncio
async def test_auth_02_dev_bypass_token_rejected():
    """AUTH-02: Legacy unsigned dummy tokens like sms_jwt_* must be rejected with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/attendance/student",
            headers={"Authorization": "Bearer sms_jwt_usr-student-1_1729000000"},
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_rbac_01_student_blocked_from_admin(setup_test_auth_fixtures):
    """RBAC-01: Student attempting to access School Admin endpoints must receive 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@school.com", "password": "student@123"},
        )
        token = login.json()["data"]["token"]

        res = await client.get(
            "/api/v1/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_02_student_blocked_from_teacher_gradebook(setup_test_auth_fixtures):
    """RBAC-02: Student attempting to submit exam marks must receive 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@school.com", "password": "student@123"},
        )
        token = login.json()["data"]["token"]

        res = await client.post(
            "/api/v1/examinations/marks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "examId": "ex-1",
                "sectionId": "sec-10a",
                "subjectId": "sub-1",
                "marks": [{"studentId": "sp-1", "testScore": 25, "examScore": 45}],
            },
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_03_teacher_blocked_from_exam_publish(setup_test_auth_fixtures):
    """RBAC-03: Teacher attempting to publish exam results must receive 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "rajesh.math@edupulse.edu.in", "password": "teacher@123"},
        )
        token = login.json()["data"]["token"]

        res = await client.post(
            "/api/v1/examinations/ex-1/publish-results",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_scope_parent_unlinked_child_blocked(setup_test_auth_fixtures):
    """SCOPE-04: Parent attempting to view unlinked student records must receive 403."""
    from app.db.session import get_db
    from app.models.user import User
    from app.core.security import get_password_hash
    from conftest import TestingSessionLocal

    async with TestingSessionLocal() as session:
        p_user = await session.get(User, "usr-parent-1")
        if not p_user:
            p_user = User(
                id="usr-parent-1",
                email="parent@school.com",
                username="test_parent",
                password_hash=get_password_hash("parent@123"),
                user_type="parent",
                name="Test Parent",
                is_active=True,
            )
            session.add(p_user)
            await session.commit()

    token, _, _ = create_access_token(subject="usr-parent-1", role="parent")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/attendance/student?student_id=sp-1",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "Access denied" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_grade_bounds_validation(setup_test_auth_fixtures):
    """GRADE-03: Marks submission exceeding 100 must be rejected with 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "rajesh.math@edupulse.edu.in", "password": "teacher@123"},
        )
        token = login.json()["data"]["token"]

        # Test score 105 (> 100) -> 422
        res = await client.post(
            "/api/v1/examinations/marks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "examId": "ex-1",
                "sectionId": "sec-10a",
                "subjectId": "sub-1",
                "marks": [{"studentId": "sp-1", "testScore": 105.0, "examScore": 20.0}],
            },
        )
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_assignment_workflow(setup_test_auth_fixtures):
    """ASSIGN-01 & 02: Teacher creates assignment and student submits work successfully."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Teacher creates assignment
        t_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "rajesh.math@edupulse.edu.in", "password": "teacher@123"},
        )
        t_token = t_login.json()["data"]["token"]

        asg_res = await client.post(
            "/api/v1/materials/assignments",
            headers={"Authorization": f"Bearer {t_token}"},
            json={
                "title": "Trigonometry Problem Set 1",
                "description": "Complete exercises 4.1 to 4.3 in NCERT exemplar.",
                "subjectId": "sub-1",
                "targetSectionIds": ["sec-10a"],
                "dueDate": "2026-11-05",
                "totalMarks": 50.0,
            },
        )
        assert asg_res.status_code == 200
        asg_id = asg_res.json()["data"]["id"]
        assert asg_id is not None

        # Student submits assignment
        s_login = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@school.com", "password": "student@123"},
        )
        s_token = s_login.json()["data"]["token"]

        sub_res = await client.post(
            f"/api/v1/materials/assignments/{asg_id}/submissions",
            headers={"Authorization": f"Bearer s_token"},
        )
        # Should be rejected with invalid token or accepted with valid s_token
        sub_res_valid = await client.post(
            f"/api/v1/materials/assignments/{asg_id}/submissions",
            headers={"Authorization": f"Bearer {s_token}"},
        )
        assert sub_res_valid.status_code == 200
        assert sub_res_valid.json()["data"]["status"] == "SUBMITTED"


@pytest.mark.asyncio
async def test_tenant_isolation_two_schools(setup_test_auth_fixtures):
    """AUTH-03: Multi-tenant isolation: School A admin cannot view or mutate School B users."""
    from app.models.school import School
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token
    from conftest import TestingSessionLocal

    async with TestingSessionLocal() as session:
        # Create School Alpha and School Beta
        sch_a = await session.get(School, "sch-alpha")
        if not sch_a:
            session.add(School(id="sch-alpha", name="Alpha School", code="ALPHA", board="CBSE", is_active=True))
        sch_b = await session.get(School, "sch-beta")
        if not sch_b:
            session.add(School(id="sch-beta", name="Beta Academy", code="BETA", board="ICSE", is_active=True))

        pass_hash = get_password_hash("password123")

        # Admin Alpha
        u_adm_a = await session.get(User, "usr-adm-alpha")
        if not u_adm_a:
            session.add(User(id="usr-adm-alpha", email="admin@alpha.com", username="adm_alpha", password_hash=pass_hash, user_type="admin", school_id="sch-alpha", name="Admin Alpha", is_active=True))

        # Admin Beta
        u_adm_b = await session.get(User, "usr-adm-beta")
        if not u_adm_b:
            session.add(User(id="usr-adm-beta", email="admin@beta.com", username="adm_beta", password_hash=pass_hash, user_type="admin", school_id="sch-beta", name="Admin Beta", is_active=True))

        # Student Alpha
        u_stu_a = await session.get(User, "usr-stu-alpha")
        if not u_stu_a:
            session.add(User(id="usr-stu-alpha", email="stu@alpha.com", username="stu_alpha", password_hash=pass_hash, user_type="student", school_id="sch-alpha", name="Student Alpha", is_active=True))

        # Student Beta
        u_stu_b = await session.get(User, "usr-stu-beta")
        if not u_stu_b:
            session.add(User(id="usr-stu-beta", email="stu@beta.com", username="stu_beta", password_hash=pass_hash, user_type="student", school_id="sch-beta", name="Student Beta", is_active=True))

        await session.commit()

    token_a, _, _ = create_access_token(subject="usr-adm-alpha", role="admin")
    token_b, _, _ = create_access_token(subject="usr-adm-beta", role="admin")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Admin Alpha queries users -> Must see Student Alpha, but NEVER Student Beta
        res_a = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token_a}"})
        assert res_a.status_code == 200
        user_ids_a = [u["id"] for u in res_a.json()["data"]["items"]]
        assert "usr-stu-alpha" in user_ids_a
        assert "usr-stu-beta" not in user_ids_a

        # Admin Beta queries users -> Must see Student Beta, but NEVER Student Alpha
        res_b = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token_b}"})
        assert res_b.status_code == 200
        user_ids_b = [u["id"] for u in res_b.json()["data"]["items"]]
        assert "usr-stu-beta" in user_ids_b
        assert "usr-stu-alpha" not in user_ids_b
