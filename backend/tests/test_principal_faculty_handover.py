import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.models.academic import Class, Section
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update


@pytest.fixture
def admin_token():
    token, _, _ = create_access_token(
        subject="usr-superadmin",
        role="SUPER_ADMIN",
        extra_claims={"user_id": "usr-superadmin", "role": "SUPER_ADMIN", "school_id": "sch-main"}
    )
    return token


@pytest.mark.asyncio
async def test_scenarios_1_to_5(admin_token):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

        # 0. Clean up any existing test principals
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(User)
                .where(User.user_type == "principal")
                .values(is_active=False)
            )
            # Delete any test accounts from previous runs if needed
            test_users = (await session.execute(
                select(User).where(User.email.in_([
                    "test_prin_a@edupulse.edu.in",
                    "test_prin_b@edupulse.edu.in",
                    "duplicate.test@edupulse.edu.in",
                    "faculty.test1@edupulse.edu.in"
                ]))
            )).scalars().all()
            for u in test_users:
                await session.delete(u)
            await session.commit()

        # TEST 1 — Create Principal With No Existing Principal
        res_create = await client.post(
            "/api/v1/admin/users/principal",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Dr. Principal Alpha",
                "email": "test_prin_a@edupulse.edu.in",
                "username": "prin_alpha",
                "phone": "+91 9111122222",
                "password": "AlphaPrincipal@2026",
            }
        )
        assert res_create.status_code == 200, f"Create failed: {res_create.text}"
        data_a = res_create.json()["data"]
        assert data_a["email"] == "test_prin_a@edupulse.edu.in"
        assert data_a["userType"] == "principal"
        assert data_a["active"] is True
        assert data_a["school_id"] == "sch-main"

        # Verify Principal A can login
        login_a = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_prin_a@edupulse.edu.in", "password": "AlphaPrincipal@2026"}
        )
        assert login_a.status_code == 200
        token_a = login_a.json()["data"]["token"]

        # TEST 2 — Attempt Duplicate Principal
        res_dup = await client.post(
            "/api/v1/admin/users/principal",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Dr. Duplicate",
                "email": "duplicate.test@edupulse.edu.in",
                "password": "Password@123",
            }
        )
        assert res_dup.status_code == 409
        assert "active Principal already exists" in res_dup.json()["error"]["message"]

        # TEST 3 — Principal Handover (Principal A -> inactive, Principal B -> active)
        # Verify school classes exist before handover
        async with AsyncSessionLocal() as session:
            class_count_before = len((await session.execute(select(Class))).scalars().all())
            section_count_before = len((await session.execute(select(Section))).scalars().all())

        res_handover = await client.post(
            "/api/v1/admin/principal/handover",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Dr. Principal Beta",
                "email": "test_prin_b@edupulse.edu.in",
                "username": "prin_beta",
                "phone": "+91 9222233333",
                "password": "BetaPrincipal@2026",
                "handover_reason": "Scheduled leadership transition"
            }
        )
        assert res_handover.status_code == 200, f"Handover failed: {res_handover.text}"
        data_b = res_handover.json()["data"]
        assert data_b["email"] == "test_prin_b@edupulse.edu.in"
        assert data_b["userType"] == "principal"
        assert data_b["active"] is True
        assert data_b["school_id"] == "sch-main"

        # Verify database state: only Principal B is active, Principal A is inactive
        async with AsyncSessionLocal() as session:
            active_principals = (await session.execute(
                select(User).where(User.user_type == "principal", User.is_active == True)
            )).scalars().all()
            assert len(active_principals) == 1
            assert active_principals[0].email == "test_prin_b@edupulse.edu.in"

            user_a = (await session.execute(
                select(User).where(User.email == "test_prin_a@edupulse.edu.in")
            )).scalar_one()
            assert user_a.is_active is False

            # Verify existing school data is 100% untouched
            class_count_after = len((await session.execute(select(Class))).scalars().all())
            section_count_after = len((await session.execute(select(Section))).scalars().all())
            assert class_count_before == class_count_after
            assert section_count_before == section_count_after

        # TEST 4 — New Principal Credentials
        login_b = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_prin_b@edupulse.edu.in", "password": "BetaPrincipal@2026"}
        )
        assert login_b.status_code == 200
        token_b = login_b.json()["data"]["token"]
        assert token_b != token_a

        # TEST 5 — Old Principal Access Denied
        # 1. Login attempt with old principal credentials fails with 403 Forbidden
        login_a_after = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_prin_a@edupulse.edu.in", "password": "AlphaPrincipal@2026"}
        )
        assert login_a_after.status_code == 403

        # 2. Existing token from old principal fails on protected endpoints with 403 Forbidden
        res_old_token = await client.get(
            "/api/v1/admin/principal",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert res_old_token.status_code == 403


@pytest.mark.asyncio
async def test_faculty_registration_and_validation(admin_token):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

        # TEST 6 & 7: Faculty registration success & duplicate failure
        res_faculty = await client.post(
            "/api/v1/admin/users/teacher",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Ravi Shastri",
                "email": "faculty.test1@edupulse.edu.in",
                "phone": "+91 9777788888",
                "specialization": "Physics",
                "district": "Bengaluru Urban"
            }
        )
        assert res_faculty.status_code == 200, f"Faculty create failed: {res_faculty.text}"
        data = res_faculty.json()["data"]
        assert data["email"] == "faculty.test1@edupulse.edu.in"
        assert data["userType"] == "teacher"

        # Faculty login with auto-password: Ravi@Teacher
        login_fac = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "faculty.test1@edupulse.edu.in", "password": "Ravi@Teacher"}
        )
        assert login_fac.status_code == 200

        # Duplicate email attempt -> must fail with 409 Conflict
        dup_faculty = await client.post(
            "/api/v1/admin/users/teacher",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Ravi Another",
                "email": "faculty.test1@edupulse.edu.in",
                "phone": "+91 9777788889",
                "specialization": "Chemistry",
                "district": "Bengaluru Urban"
            }
        )
        assert dup_faculty.status_code == 409
        assert "already exists" in dup_faculty.json()["error"]["message"]


@pytest.mark.asyncio
async def test_delete_principal_endpoints(admin_token):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

        # 1. Clean out any active principal
        res_del = await client.delete("/api/v1/admin/principal", headers=headers)
        assert res_del.status_code == 200

        # Verify get_active_principal returns None
        res_get = await client.get("/api/v1/admin/principal", headers=headers)
        assert res_get.status_code == 200
        assert res_get.json()["data"] is None

        # 2. Create a test principal
        res_create = await client.post(
            "/api/v1/admin/users/principal",
            headers=headers,
            json={
                "school_id": "sch-main",
                "name": "Dr. Test ToDelete",
                "email": "test_todelete@edupulse.edu.in",
                "username": "prin_todelete",
                "phone": "+91 9111122222",
                "password": "DeleteMe@123",
            }
        )
        assert res_create.status_code == 200
        prin_id = res_create.json()["data"]["id"]

        # Verify login works
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_todelete@edupulse.edu.in", "password": "DeleteMe@123"}
        )
        assert login_res.status_code == 200

        # 3. Delete active principal via DELETE /api/v1/admin/principal
        del_active = await client.delete("/api/v1/admin/principal", headers=headers)
        assert del_active.status_code == 200
        assert del_active.json()["success"] is True

        # 4. Verify login fails (credentials completely purged)
        login_after = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_todelete@edupulse.edu.in", "password": "DeleteMe@123"}
        )
        assert login_after.status_code in [400, 401]

        # 5. Verify principal is None in admin query
        res_get2 = await client.get("/api/v1/admin/principal", headers=headers)
        assert res_get2.status_code == 200
        assert res_get2.json()["data"] is None
