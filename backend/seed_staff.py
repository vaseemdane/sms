import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash
from sqlalchemy import select

STAFF_ACCOUNTS = [
    {
        "id": "usr-staff-accountant",
        "username": "accountant",
        "email": "accountant@edupulse.edu.in",
        "name": "Ramesh Poojary",
        "user_type": "accountant",
        "role_id": "role-accountant",
        "password": "Accountant@123",
        "phone": "9880123451",
    },
    {
        "id": "usr-staff-finance",
        "username": "finance",
        "email": "finance@edupulse.edu.in",
        "name": "Nagaraj Shenoy",
        "user_type": "finance",
        "role_id": "role-finance",
        "password": "Finance@123",
        "phone": "9880123452",
    },
    {
        "id": "usr-staff-general",
        "username": "staff",
        "email": "staff@edupulse.edu.in",
        "name": "Gowramma Hiremath",
        "user_type": "staff",
        "role_id": "role-staff",
        "password": "Staff@123",
        "phone": "9880123453",
    },
    {
        "id": "usr-staff-warden",
        "username": "warden",
        "email": "warden@edupulse.edu.in",
        "name": "Chandrashekar Patil",
        "user_type": "hostel_warden",
        "role_id": "role-hostel_warden",
        "password": "Warden@123",
        "phone": "9880123454",
    },
    {
        "id": "usr-staff-librarian",
        "username": "librarian",
        "email": "librarian@edupulse.edu.in",
        "name": "Sowmya Kulkarni",
        "user_type": "librarian",
        "role_id": "role-librarian",
        "password": "Librarian@123",
        "phone": "9880123455",
    },
]

async def seed_staff():
    async with AsyncSessionLocal() as db:
        for acc in STAFF_ACCOUNTS:
            res = await db.execute(select(User).where((User.username == acc["username"]) | (User.email == acc["email"])))
            existing = res.scalar_one_or_none()
            if existing:
                existing.name = acc["name"]
                existing.user_type = acc["user_type"]
                existing.role_id = acc["role_id"]
                existing.password_hash = get_password_hash(acc["password"])
                existing.is_active = True
                existing.must_change_password = False
                existing.phone = acc["phone"]
                print("Updated " + acc["username"])
            else:
                user = User(
                    id=acc["id"],
                    username=acc["username"],
                    email=acc["email"],
                    name=acc["name"],
                    user_type=acc["user_type"],
                    role_id=acc["role_id"],
                    password_hash=get_password_hash(acc["password"]),
                    is_active=True,
                    must_change_password=False,
                    phone=acc["phone"],
                    state="Karnataka",
                    district="Bengaluru Urban",
                    address="Vidhana Soudha Road, Bengaluru",
                )
                db.add(user)
                print("Created " + acc["username"])
        await db.commit()
        print("All staff users committed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_staff())
