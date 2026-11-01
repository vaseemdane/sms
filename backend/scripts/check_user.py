import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, name, username, email, phone, user_type FROM users WHERE username = '9738176663' OR email LIKE '%9738176663%'"))
        print('Users found by username/email:')
        for u in res.fetchall():
            print(dict(u._mapping))

if __name__ == "__main__":
    asyncio.run(check())

