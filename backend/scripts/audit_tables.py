import asyncio
from app.core.database import engine
from sqlalchemy import text

async def list_tables():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"))
        tables = [r[0] for r in result.fetchall()]
        print("Existing tables count:", len(tables))
        for t in tables:
            print(" -", t)

if __name__ == "__main__":
    asyncio.run(list_tables())
