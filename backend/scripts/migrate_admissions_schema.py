import asyncio
from app.core.database import engine
from app.db.base import Base
import app.models.admission  # noqa: F401 - registers admission models on Base.metadata


async def run_admissions_migration():
    print("Applying non-destructive Admissions & Enrollment tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Admissions & Enrollment tables created successfully!")


if __name__ == "__main__":
    asyncio.run(run_admissions_migration())
