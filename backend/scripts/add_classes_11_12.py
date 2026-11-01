import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def add_senior_secondary_classes():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id FROM classes WHERE id IN ('cls-class11', 'cls-class12')"))
        existing = [r[0] for r in res.fetchall()]
        
        if 'cls-class11' not in existing:
            await session.execute(text("""
                INSERT INTO classes (id, class_type_id, name, order_index, has_streams, is_active, created_at, updated_at)
                VALUES ('cls-class11', 'ct-higher_secondary', 'Class 11', 14, true, true, NOW(), NOW())
            """))
            print("Added Class 11")

        if 'cls-class12' not in existing:
            await session.execute(text("""
                INSERT INTO classes (id, class_type_id, name, order_index, has_streams, is_active, created_at, updated_at)
                VALUES ('cls-class12', 'ct-higher_secondary', 'Class 12', 15, true, true, NOW(), NOW())
            """))
            print("Added Class 12")

        sections_to_add = [
            ('sec-11-sci', 'cls-class11', 'str-science', 'Section 11-Science', '11-SCI', 40),
            ('sec-11-comm', 'cls-class11', 'str-commerce', 'Section 11-Commerce', '11-COMM', 40),
            ('sec-11-arts', 'cls-class11', 'str-arts', 'Section 11-Arts', '11-ARTS', 40),
            ('sec-12-sci', 'cls-class12', 'str-science', 'Section 12-Science', '12-SCI', 40),
            ('sec-12-comm', 'cls-class12', 'str-commerce', 'Section 12-Commerce', '12-COMM', 40),
            ('sec-12-arts', 'cls-class12', 'str-arts', 'Section 12-Arts', '12-ARTS', 40),
        ]
        
        for sid, cid, str_id, sname, scode, scap in sections_to_add:
            chk = await session.execute(text(f"SELECT id FROM sections WHERE id = '{sid}'"))
            if not chk.first():
                await session.execute(text(f"""
                    INSERT INTO sections (id, class_id, stream_id, name, code, capacity, is_active, created_at, updated_at)
                    VALUES ('{sid}', '{cid}', '{str_id}', '{sname}', '{scode}', {scap}, true, NOW(), NOW())
                """))
                print(f"Added section {sid} ({sname})")

        await session.commit()
        print("Senior secondary classes & stream sections committed successfully.")

if __name__ == "__main__":
    asyncio.run(add_senior_secondary_classes())
