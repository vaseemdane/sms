import asyncio
from sqlalchemy import text
from app.core.database import engine

MIGRATION_SQL = """
-- 1. Create Roles and Permissions tables
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(64) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(64) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR(64) REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- 3. Add columns to classes and sections
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(32) REFERENCES academic_years(id) ON DELETE SET NULL;

ALTER TABLE sections ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 40 NOT NULL;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS room_number VARCHAR(32);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(32) REFERENCES academic_years(id) ON DELETE SET NULL;

-- 4. Add columns to fee_structures
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS deleted_at VARCHAR(32);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS fee_breakdown VARCHAR(1024);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS total_yearly_fee DOUBLE PRECISION;

-- 5. Create Hostel and Mess tables
CREATE TABLE IF NOT EXISTS hostel_blocks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    code VARCHAR(32) UNIQUE NOT NULL,
    gender VARCHAR(16) DEFAULT 'Co-Ed' NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
    id VARCHAR(64) PRIMARY KEY,
    hostel_id VARCHAR(64) REFERENCES hostel_blocks(id) ON DELETE CASCADE,
    room_number VARCHAR(32) NOT NULL,
    room_type VARCHAR(64) DEFAULT '2-Sharing' NOT NULL,
    capacity INTEGER DEFAULT 2 NOT NULL,
    occupied INTEGER DEFAULT 0 NOT NULL,
    annual_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_hostel_room_no UNIQUE (hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS mess_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    description VARCHAR(255),
    annual_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    meal_schedule VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Add columns to student_profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS hostel_room_id VARCHAR(64) REFERENCES hostel_rooms(id) ON DELETE SET NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS mess_plan_id VARCHAR(64) REFERENCES mess_plans(id) ON DELETE SET NULL;
"""

async def run_migration():
    print("Running non-destructive enterprise schema migration...")
    async with engine.begin() as conn:
        for stmt in MIGRATION_SQL.strip().split(";"):
            clean_stmt = stmt.strip()
            if clean_stmt:
                await conn.execute(text(clean_stmt))
    print("Migration applied successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
