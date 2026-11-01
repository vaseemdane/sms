import asyncio
from app.core.database import engine
from app.db.base import Base
import app.models  # noqa: F401 - registers all 82 models on Base.metadata


async def run_education_migration():
    print("Applying non-destructive Education & School Management tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Education Management tables migrated successfully!")


if __name__ == "__main__":
    asyncio.run(run_education_migration())
