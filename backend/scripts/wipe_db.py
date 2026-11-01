import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from app.models import Base


async def wipe_database():
    """Wipes all database tables for test/dev environment reset."""
    print("Connecting to database and dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("All tables dropped.")
        print("Recreating clean table schema...")
        await conn.run_sync(Base.metadata.create_all)
        print("All clean tables created successfully!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(wipe_database())
