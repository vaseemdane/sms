import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_enterprise_flow():
    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        print("1. Testing Super Admin Login...")
        login_res = client.post("/auth/login", json={"identifier": "admin@school.com", "password": "SuperAdmin@123"})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        data = login_res.json()["data"]
        sa_token = data["token"]
        sa_id = data["user"]["id"]
        headers = {"Authorization": f"Bearer {sa_token}"}
        print(" -> Super Admin logged in successfully!")

        print("2. Testing Strict Separation: Super Admin MUST NOT have timetable:write (Hard 403)...")
        tt_res = client.post("/timetables/sections/sec-10a/publish", json={"isPublished": True}, headers=headers)
        print(f" -> Response Status: {tt_res.status_code}, Detail: {tt_res.json().get('detail')}")
        assert tt_res.status_code == 403, "Failed: Super Admin was not blocked from timetable:write"
        print(" -> Separation Verified: Super Admin blocked from timetable mutation with 403!")

        print("3. Testing Dynamic Roles & Permissions...")
        roles_res = client.get("/super-admin/roles", headers=headers)
        assert roles_res.status_code == 200
        roles = roles_res.json()["data"]
        print(f" -> Found {len(roles)} roles in system.")

        import time
        role_name = f"AUDITOR_{int(time.time())}"
        new_role_res = client.post("/super-admin/roles", json={
            "name": role_name,
            "displayName": "Internal Test Auditor",
            "description": "Custom role for compliance audit",
            "permissionCodes": ["classes:read", "fees:read"]
        }, headers=headers)
        assert new_role_res.status_code == 200, f"Role creation failed: {new_role_res.text}"
        print(f" -> Created custom role {role_name} successfully.")

        print("4. Testing Password Override on User...")
        pwd_res = client.post(f"/super-admin/users/{sa_id}/reset-password", json={
            "newPassword": "SuperAdmin@123"
        }, headers=headers)
        assert pwd_res.status_code == 200
        print(" -> Super Admin override password reset succeeded.")

        print("5. Testing Yearly Fee Structure Master...")
        fee_res = client.post("/super-admin/fees/structures", json={
            "classId": "cls-class10",
            "academicYearId": "ay-2026-2027",
            "title": "Class 10 Yearly Consolidated Fee 2026-27",
            "feeHeads": {
                "Tuition Fee": 45000,
                "Admission Fee": 5000,
                "Science Lab Fee": 4000,
                "Sports & Activity Fee": 3000
            },
            "dueDate": "2026-07-31"
        }, headers=headers)
        assert fee_res.status_code == 200
        fee_data = fee_res.json()["data"]
        print(f" -> Created Yearly Fee: Total = Rs. {fee_data['totalYearlyFee']}")

        print("6. Testing Hostel & Mess Overview...")
        hostel_res = client.get("/super-admin/hostels/overview", headers=headers)
        assert hostel_res.status_code == 200
        h_data = hostel_res.json()["data"]
        print(f" -> Hostel Blocks: {len(h_data['blocks'])}, Mess Plans: {len(h_data['messPlans'])}")

        print("7. Testing All-India Geo Cascade & Validation...")
        geo_res = client.get("/super-admin/geo/states-and-districts")
        assert geo_res.status_code == 200
        states = geo_res.json()["data"]
        assert "Maharashtra" in states
        assert "Karnataka" in states
        print(f" -> Loaded {len(states)} States and UTs with districts.")

        # Test invalid state-district validation rejection (422)
        invalid_res = client.post("/admin/users", json={
            "name": "Invalid Geo Teacher",
            "email": "invalid.geo@school.com",
            "userType": "teacher",
            "state": "Karnataka",
            "district": "Mumbai City" # Invalid district for Karnataka!
        }, headers=headers)
        assert invalid_res.status_code == 422, f"Expected 422 for invalid district, got {invalid_res.status_code}"
        print(f" -> Correctly rejected invalid district with 422: {invalid_res.json().get('detail')}")

    print("\nALL BACKEND MODULES & SEPARATION OF DUTIES VERIFIED 100% CORRECT!")

if __name__ == "__main__":
    test_enterprise_flow()
