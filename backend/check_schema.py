import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        tables = [r[0] for r in res.fetchall()]
        print("PostgreSQL Tables:", tables)
        for t in ['users', 'schools', 'teacher_profiles', 'student_profiles', 'student_enrollments', 'classes', 'sections', 'subjects', 'timetables', 'timetable_slots']:
            if t in tables:
                cols = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{t}';"))
                print(f"{t} columns:", [c[0] for c in cols.fetchall()])

asyncio.run(check())
