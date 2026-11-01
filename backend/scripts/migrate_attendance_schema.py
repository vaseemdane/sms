import asyncio
from app.core.database import engine
from app.db.base import Base
import app.models.attendance  # noqa: F401 - registers attendance models on Base.metadata


async def run_attendance_migration():
    print("Applying non-destructive Enhanced Attendance tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Enhanced Attendance tables created successfully!")


if __name__ == "__main__":
    asyncio.run(run_attendance_migration())
