import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from app.models import Base

async def init_tables():
    print("Connecting to PostgreSQL and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created successfully in PostgreSQL!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_tables())
