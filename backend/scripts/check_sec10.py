import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, class_id, name, code FROM sections WHERE class_id = 'cls-class10'"))
        print('Sections for Class 10:')
        for s in res.fetchall():
            print(dict(s._mapping))

if __name__ == "__main__":
    asyncio.run(check())

