import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("."))

import sqlalchemy as sa
from app.core.database import engine


async def verify():
    async with engine.connect() as conn:
        ext_res = await conn.execute(sa.text("SELECT extname FROM pg_extension"))
        extensions = [r[0] for r in ext_res.fetchall()]
        print("INSTALLED EXTENSIONS:", extensions)

        table_res = await conn.execute(sa.text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
        tables = [r[0] for r in table_res.fetchall()]
        print(f"TOTAL TABLES ({len(tables)}):", tables)

        # Check unique partial indexes
        idx_res = await conn.execute(sa.text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%uq_%'"))
        indexes = idx_res.fetchall()
        print(f"PARTIAL/UNIQUE INDEXES ({len(indexes)}):", [i[0] for i in indexes])


if __name__ == "__main__":
    asyncio.run(verify())
