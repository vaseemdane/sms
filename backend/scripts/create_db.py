import asyncio
import asyncpg

async def create_sms_db():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5433/postgres")
    exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname='sms_db'")
    if not exists:
        await conn.execute("CREATE DATABASE sms_db")
        print("SUCCESS: Database sms_db created.")
    else:
        print("INFO: Database sms_db already exists.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(create_sms_db())
