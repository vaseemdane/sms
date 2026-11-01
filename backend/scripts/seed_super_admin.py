import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.user import User


async def seed_super_admin():
    """
    Production-ready seed script: Initializes ONLY the Super Admin account if it does not exist.
    Credentials sourced from .env with safe local fallbacks:
      - SUPER_ADMIN_EMAIL (fallback: admin@school.com)
      - SUPER_ADMIN_USERNAME (fallback: admin)
      - SUPER_ADMIN_PASSWORD (fallback: SuperAdmin@123)
    Password is saved hashed with Argon2id.
    """
    email = os.getenv("SUPER_ADMIN_EMAIL", "admin@school.com").strip().lower()
    username = os.getenv("SUPER_ADMIN_USERNAME", "admin").strip().lower()
    raw_password = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@123")
    name = os.getenv("SUPER_ADMIN_NAME", "Super Administrator").strip()
    phone = os.getenv("SUPER_ADMIN_PHONE", "+91 9880011223")

    print(f"Checking Super Admin account for email: {email} / username: {username}...")

    async with AsyncSessionLocal() as session:
        # Check if already exists
        stmt = select(User).where(
            (User.email == email) | (User.username == username) | (User.user_type == "super_admin")
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()

        if existing:
            print(f"Super Admin already exists with ID: {existing.id} ({existing.email}). Skipping seed.")
            return

        password_hash = get_password_hash(raw_password)

        sa_user = User(
            id="usr-superadmin",
            name=name,
            email=email,
            username=username,
            password_hash=password_hash,
            user_type="super_admin",
            phone=phone,
            code="EDP/SA/001",
            state="Karnataka",
            district="Bengaluru Urban",
            address="Vidhana Soudha Road, Bengaluru",
            is_active=True,
            must_change_password=False,
            school_id=None,
        )

        from app.models.school import School
        existing_school = (await session.execute(select(School).where(School.id == "sch-main"))).scalar_one_or_none()
        if not existing_school:
            default_school = School(
                id="sch-main",
                name=os.getenv("DEFAULT_SCHOOL_NAME", "Megha Public School"),
                code="MPS-KA",
                board="CBSE",
                city="Bengaluru Urban",
                state="Karnataka",
                is_active=True,
            )
            session.add(default_school)
            await session.flush()
            print(f"Created default school: {default_school.name} ({default_school.id})")

        session.add(sa_user)
        await session.commit()
        print(f"SUCCESS: Super Admin created successfully with ID: {sa_user.id} ({sa_user.email})")


if __name__ == "__main__":
    asyncio.run(seed_super_admin())
