import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def clean_roles():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("DELETE FROM roles WHERE name LIKE 'AUDITOR_%' OR name = 'TEST_AUDITOR' RETURNING name"))
        deleted = res.fetchall()
        await session.commit()
        print("Deleted junk roles:", [d[0] for d in deleted])
        res = await session.execute(text("SELECT id, name, display_name, is_system FROM roles ORDER BY name"))
        print("Remaining roles:")
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(clean_roles())
