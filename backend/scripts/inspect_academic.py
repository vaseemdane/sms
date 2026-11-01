import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.academic import AcademicYear, Class, Section, Subject

async def dump():
    async with AsyncSessionLocal() as s:
        ay = (await s.execute(select(AcademicYear))).scalars().all()
        print("AcademicYears:", [(y.id, y.name, y.is_current) for y in ay])
        classes = (await s.execute(select(Class).order_by(Class.order_index))).scalars().all()
        print("Classes count:", len(classes))
        for c in classes:
            print(f"Class: id={c.id} name={c.name} order={c.order_index}")
        sections = (await s.execute(select(Section))).scalars().all()
        print("Sections count:", len(sections))
        for sec in sections:
            print(f"Section: id={sec.id} name={sec.name} code={sec.code} class_id={sec.class_id}")
        subjects = (await s.execute(select(Subject))).scalars().all()
        print("Subjects count:", len(subjects))
        for sub in subjects:
            print(f"Subject: id={sub.id} name={sub.name} code={sub.code} class_id={sub.class_id}")

if __name__ == "__main__":
    asyncio.run(dump())
