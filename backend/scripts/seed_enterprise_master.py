import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.role import Role, Permission, RolePermission
from app.models.academic import AcademicYear, ClassType, Class, Section
from app.models.hostel import HostelBlock, HostelRoom, MessPlan
from app.models.user import User

SYSTEM_ROLES = [
    ("SUPER_ADMIN", "Super Administrator", "Full system governance and master data authority", True),
    ("PRINCIPAL", "School Principal", "Complete academic authority, timetables, and teacher assignments", True),
    ("TEACHER", "Faculty / Teacher", "Instruction, attendance marking, and grading", True),
    ("STAFF", "School Staff", "General school administration support", True),
    ("STUDENT", "Student", "Access to personal classes, schedules, and marks", True),
    ("ACCOUNTANT", "Accountant / Cashier", "Fee collections, receipts, and expense tracking", True),
    ("FINANCE", "Finance Manager", "Fee structures, ledger audits, and financial reporting", False),
    ("HOSTEL_WARDEN", "Hostel Warden", "Hostel block allocation, room occupancy, and mess operations", False),
    ("LIBRARIAN", "School Librarian", "Library book inventory and student checkouts", False),
]

PERMISSIONS = [
    # Classes & Sections
    ("classes:write", "classes", "write", "Create, edit, reorder, and archive classes"),
    ("classes:read", "classes", "read", "View class hierarchy and curriculum"),
    ("sections:write", "sections", "write", "Create, configure, and manage class sections"),
    ("sections:read", "sections", "read", "View sections under classes"),
    # Timetables
    ("timetable:write", "timetable", "write", "Build, modify, conflict-check, and publish timetables"),
    ("timetable:read", "timetable", "read", "View class and faculty timetables"),
    # Fees & Finance
    ("fees:manage", "fees", "manage", "Create, modify, soft-delete yearly fee structures"),
    ("fees:read", "fees", "read", "View fee structures and summaries"),
    ("fees:collect", "fees", "collect", "Accept payments and generate receipts"),
    # Hostel & Mess
    ("hostel:manage", "hostel", "manage", "Manage hostel blocks, rooms, capacities, and mess plans"),
    ("hostel:read", "hostel", "read", "View hostel rooms, occupancy, and mess details"),
    # User Administration
    ("users:admit", "users", "admit", "Admit and onboard students, teachers, and staff"),
    ("users:read", "users", "read", "View user directories and profiles"),
    ("users:reset_password", "users", "reset_password", "Admin override password reset with forced rotation"),
    ("roles:manage", "roles", "manage", "Create, edit, and assign custom roles and permissions"),
]

# Strict separation of duties matrix
ROLE_PERMS_MAP = {
    "SUPER_ADMIN": [
        "classes:write", "classes:read",
        "sections:write", "sections:read",
        # NOTE: timetable:write is STRICTLY EXCLUDED for SUPER_ADMIN
        "timetable:read",
        "fees:manage", "fees:read", "fees:collect",
        "hostel:manage", "hostel:read",
        "users:admit", "users:read", "users:reset_password", "roles:manage",
    ],
    "PRINCIPAL": [
        # NOTE: classes:write and sections:write are STRICTLY EXCLUDED for PRINCIPAL
        "classes:read", "sections:read",
        "timetable:write", "timetable:read",
        "fees:read", "hostel:read",
        "users:read",
    ],
    "TEACHER": [
        "classes:read", "sections:read",
        "timetable:read",
        "users:read",
    ],
    "STUDENT": [
        "timetable:read",
        "classes:read",
    ],
    "ACCOUNTANT": [
        "fees:read", "fees:collect",
        "classes:read", "sections:read",
        "users:read",
    ],
    "FINANCE": [
        "fees:manage", "fees:read", "fees:collect",
        "classes:read", "sections:read",
        "users:read",
    ],
    "HOSTEL_WARDEN": [
        "hostel:manage", "hostel:read",
        "users:read",
    ],
    "LIBRARIAN": [
        "users:read", "classes:read",
    ],
    "STAFF": [
        "users:read", "classes:read",
    ],
}

CLASSES_DATA = [
    # (name, class_type_category, order_index)
    ("Nursery", "NURSERY", 1),
    ("LKG", "NURSERY", 2),
    ("UKG", "NURSERY", 3),
    ("Class 1", "PRIMARY", 4),
    ("Class 2", "PRIMARY", 5),
    ("Class 3", "PRIMARY", 6),
    ("Class 4", "PRIMARY", 7),
    ("Class 5", "PRIMARY", 8),
    ("Class 6", "MIDDLE", 9),
    ("Class 7", "MIDDLE", 10),
    ("Class 8", "MIDDLE", 11),
    ("Class 9", "SECONDARY", 12),
    ("Class 10", "SECONDARY", 13),
    ("Class 11", "HIGHER_SECONDARY", 14),
    ("Class 12", "HIGHER_SECONDARY", 15),
]


async def seed_all():
    async with AsyncSessionLocal() as session:
        print("1. Seeding Permissions...")
        perm_objs = {}
        for code, mod, act, desc in PERMISSIONS:
            existing = (await session.execute(select(Permission).where(Permission.code == code))).scalar_one_or_none()
            if not existing:
                p = Permission(
                    id=f"perm-{code.replace(':', '-')}",
                    code=code,
                    module=mod,
                    action=act,
                    description=desc,
                )
                session.add(p)
                perm_objs[code] = p
            else:
                perm_objs[code] = existing
        await session.flush()

        print("2. Seeding Roles & Permission Mappings...")
        role_objs = {}
        for name, dname, desc, is_sys in SYSTEM_ROLES:
            r = (await session.execute(select(Role).where(Role.name == name))).scalar_one_or_none()
            if not r:
                r = Role(
                    id=f"role-{name.lower()}",
                    name=name,
                    display_name=dname,
                    description=desc,
                    is_system=is_sys,
                    is_active=True,
                )
                session.add(r)
                await session.flush()
            role_objs[name] = r

            # Map permissions
            assigned_codes = ROLE_PERMS_MAP.get(name, [])
            for c in assigned_codes:
                p = perm_objs.get(c)
                if p:
                    link_exists = (await session.execute(
                        select(RolePermission).where(
                            RolePermission.role_id == r.id,
                            RolePermission.permission_id == p.id,
                        )
                    )).scalar_one_or_none()
                    if not link_exists:
                        session.add(RolePermission(role_id=r.id, permission_id=p.id))

        await session.flush()

        print("3. Syncing existing Users to Roles...")
        users = (await session.execute(select(User))).scalars().all()
        for u in users:
            role_key = u.user_type.upper() if u.user_type else "STAFF"
            matched_role = role_objs.get(role_key)
            if matched_role and u.role_id != matched_role.id:
                u.role_id = matched_role.id
        await session.flush()

        print("4. Seeding Academic Year & Class Hierarchy (Nursery - 12th)...")
        ay = (await session.execute(select(AcademicYear).where(AcademicYear.id == "ay-2026-2027"))).scalar_one_or_none()
        if not ay:
            ay = AcademicYear(
                id="ay-2026-2027",
                name="2026-2027",
                code="2026-27",
                start_date="2026-06-01",
                end_date="2027-04-30",
                is_current=True,
            )
            session.add(ay)
            await session.flush()

        # Class Types
        type_map = {}
        for cat in ["NURSERY", "PRIMARY", "MIDDLE", "SECONDARY", "HIGHER_SECONDARY"]:
            ct = (await session.execute(select(ClassType).where(ClassType.category == cat))).scalar_one_or_none()
            if not ct:
                ct = ClassType(
                    id=f"ct-{cat.lower()}",
                    name=f"{cat.title()} Wing",
                    code=cat[:3].upper(),
                    category=cat,
                )
                session.add(ct)
                await session.flush()
            type_map[cat] = ct

        # Classes and Sections
        for cname, cat, oidx in CLASSES_DATA:
            cid = f"cls-{cname.lower().replace(' ', '')}"
            cls_obj = (await session.execute(select(Class).where(Class.name == cname))).scalar_one_or_none()
            if not cls_obj:
                cls_obj = Class(
                    id=cid,
                    name=cname,
                    class_type_id=type_map[cat].id,
                    order_index=oidx,
                    is_active=True,
                    academic_year_id=ay.id,
                )
                session.add(cls_obj)
                await session.flush()

            # Seed Sections A and B
            for sec_letter, room_no in [("A", f"{oidx}01"), ("B", f"{oidx}02")]:
                sec_code = f"{cname.replace('Class ', '').replace(' ', '')}{sec_letter}"
                sec_id = f"sec-{sec_code.lower()}"
                sec_name = f"Section {sec_letter}"

                existing_sec = (await session.execute(
                    select(Section).where(Section.class_id == cls_obj.id, Section.name == sec_name)
                )).scalar_one_or_none()

                if not existing_sec:
                    session.add(
                        Section(
                            id=sec_id,
                            class_id=cls_obj.id,
                            name=sec_name,
                            code=sec_code,
                            capacity=40,
                            room_number=room_no,
                            academic_year_id=ay.id,
                            is_active=True,
                        )
                    )

        await session.flush()

        print("5. Seeding Hostel & Mess Master...")
        hb_boys = (await session.execute(select(HostelBlock).where(HostelBlock.code == "HB-BOYS"))).scalar_one_or_none()
        if not hb_boys:
            hb_boys = HostelBlock(
                id="hostel-block-boys",
                name="Aravali Boys Hostel Block",
                code="HB-BOYS",
                gender="Boys",
                description="Senior and Junior Boys residential wing",
                is_active=True,
            )
            session.add(hb_boys)
            await session.flush()

            # Rooms for Boys
            session.add(HostelRoom(
                id="room-b-101",
                hostel_id=hb_boys.id,
                room_number="B-101",
                room_type="2-Sharing AC",
                capacity=2,
                annual_fee=48000.0,
            ))
            session.add(HostelRoom(
                id="room-b-102",
                hostel_id=hb_boys.id,
                room_number="B-102",
                room_type="4-Sharing Non-AC",
                capacity=4,
                annual_fee=28000.0,
            ))

        hb_girls = (await session.execute(select(HostelBlock).where(HostelBlock.code == "HB-GIRLS"))).scalar_one_or_none()
        if not hb_girls:
            hb_girls = HostelBlock(
                id="hostel-block-girls",
                name="Nilgiri Girls Hostel Block",
                code="HB-GIRLS",
                gender="Girls",
                description="Secure Girls residential campus wing",
                is_active=True,
            )
            session.add(hb_girls)
            await session.flush()

            session.add(HostelRoom(
                id="room-g-101",
                hostel_id=hb_girls.id,
                room_number="G-101",
                room_type="2-Sharing AC",
                capacity=2,
                annual_fee=48000.0,
            ))
            session.add(HostelRoom(
                id="room-g-102",
                hostel_id=hb_girls.id,
                room_number="G-102",
                room_type="4-Sharing Non-AC",
                capacity=4,
                annual_fee=28000.0,
            ))

        # Mess Plans
        mess_plans = [
            ("mess-veg-std", "Standard Vegetarian Mess Plan", "Nutritious 3-course South & North Indian vegetarian meals with evening snacks", 24000.0, "Breakfast: 7:30AM | Lunch: 12:30PM | Dinner: 7:30PM"),
            ("mess-nonveg-deluxe", "Deluxe Multi-Cuisine Mess Plan", "Includes 4 non-vegetarian meals weekly + special Sunday feast", 36000.0, "Breakfast: 7:30AM | Lunch: 12:30PM | Dinner: 7:30PM"),
        ]
        for mid, mname, mdesc, fee, sched in mess_plans:
            existing_mp = (await session.execute(select(MessPlan).where(MessPlan.id == mid))).scalar_one_or_none()
            if not existing_mp:
                session.add(MessPlan(
                    id=mid,
                    name=mname,
                    description=mdesc,
                    annual_fee=fee,
                    meal_schedule=sched,
                    is_active=True,
                ))

        await session.commit()
        print("Enterprise master seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_all())
