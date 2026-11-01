import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        users = await conn.execute(text("SELECT id, name, user_type, school_id FROM users WHERE user_type = 'student' LIMIT 5"))
        print('Students:', users.fetchall())
        teachers = await conn.execute(text("SELECT id, name, user_type, school_id FROM users WHERE user_type = 'teacher' LIMIT 5"))
        print('Teachers:', teachers.fetchall())
        sections = await conn.execute(text("SELECT id, code, academic_year_id FROM sections LIMIT 5"))
        print('Sections:', sections.fetchall())
        classes = await conn.execute(text("SELECT id, name, is_active FROM classes LIMIT 5"))
        print('Classes:', classes.fetchall())

asyncio.run(check())

