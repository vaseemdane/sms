import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_valid_age():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={"identifier": "admin", "password": "SuperAdmin@123"})
        token = login_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "name": "vaseem dange",
            "date_of_birth": "2011-07-13",
            "mobile_number": "9738176663",
            "gender": "male",
            "state": "Karnataka",
            "district": "Belagavi",
            "academic_year_id": "ay-2026-2027",
            "class_id": "cls-class10",
            "section_id": "sec-10a",
            "dorm_id": None,
            "dorm_room_no": None
        }
        res = await client.post("/api/v1/admin/users/student", json=payload, headers=headers)
        print("Status code:", res.status_code)
        print("Response text:", res.text)

if __name__ == "__main__":
    asyncio.run(test_valid_age())

