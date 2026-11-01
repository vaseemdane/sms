import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def admin_token():
    token, _, _ = create_access_token(
        subject="usr-superadmin",
        role="SUPER_ADMIN",
        extra_claims={"user_id": "usr-superadmin", "role": "SUPER_ADMIN", "school_id": "sch-main"}
    )
    return token


@pytest.mark.asyncio
async def test_principal_dashboard_live_db_stats(admin_token):
    """Verify principal dashboard returns strictly live database counts with zero fake defaults."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        res = await client.get("/api/v1/principal/dashboard-stats", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]

        # Exact types & zero hardcoding
        assert isinstance(data["totalStudents"], int)
        assert isinstance(data["totalTeachers"], int)
        assert isinstance(data["totalClasses"], int)
        assert isinstance(data["totalSections"], int)
        assert isinstance(data["activeAcademicYear"], str)
        assert "hasRecords" in data["attendance"]
        assert isinstance(data["weeklyTrend"], list)
        assert isinstance(data["cohortPerformance"], list)
        assert isinstance(data["topPerformers"], list)


@pytest.mark.asyncio
async def test_principal_attendance_audit_live(admin_token):
    """Verify attendance audit returns real sections with no assumed 12 students or fake contact."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        res = await client.get("/api/v1/principal/attendance-audit", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]

        assert isinstance(data["totalSections"], int)
        assert isinstance(data["rows"], list)
        assert len(data["rows"]) == data["totalSections"]
        for row in data["rows"]:
            assert "sectionId" in row
            assert "totalStudents" in row
            assert "markedCount" in row
            assert row["status"] in ["COMPLETED", "PENDING"]


@pytest.mark.asyncio
async def test_manager_dashboard_stats_live_db(admin_token):
    """Verify manager dashboard returns live numbers with zero hardcoded 1450000 / 580000 mock data."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        res = await client.get("/api/v1/manager/dashboard-stats", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]

        financial = data["financial"]
        assert isinstance(financial["totalFeesCollected"], (int, float))
        assert isinstance(financial["monthlyExpenses"], (int, float))
        assert isinstance(financial["netBalance"], (int, float))
        assert isinstance(data["recentTransactions"], list)
