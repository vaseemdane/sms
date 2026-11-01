import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        curr_year = (await conn.execute(text("SELECT id FROM academic_years WHERE is_current = True"))).scalar()
        print('Current year:', curr_year)
        enr = (await conn.execute(text(f"SELECT count(DISTINCT student_id) FROM student_enrollments WHERE academic_year_id = '{curr_year}' AND status = 'ACTIVE'"))).scalar()
        print('Enrolled active:', enr)
        all_stu = (await conn.execute(text("SELECT count(id) FROM student_profiles"))).scalar()
        print('All stu:', all_stu)
        all_tch = (await conn.execute(text("SELECT count(id) FROM teacher_profiles"))).scalar()
        print('All tch:', all_tch)

asyncio.run(check())

