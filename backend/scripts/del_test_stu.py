import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def del_test_stu():
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM users WHERE name = 'vaseem dange' OR username = '9738176663'"))
        await session.commit()
        print('Deleted test student vaseem dange')

if __name__ == "__main__":
    asyncio.run(del_test_stu())

