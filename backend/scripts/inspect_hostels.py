import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.erp_operations import HostelBlock, HostelRoom

async def main():
    async with AsyncSessionLocal() as s:
        b = (await s.execute(select(HostelBlock))).scalars().all()
        print("HostelBlocks:", [(x.id, x.name, x.gender_type) for x in b])
        rm = (await s.execute(select(HostelRoom))).scalars().all()
        print("HostelRooms:", [(x.id, x.block_id, x.room_number) for x in rm])

if __name__ == "__main__":
    asyncio.run(main())

