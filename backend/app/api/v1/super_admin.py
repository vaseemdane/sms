import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.india_geo import INDIA_STATES_DISTRICTS, validate_state_and_district
from app.core.security import get_password_hash
from app.db.session import get_db
from app.dependencies.auth import RoleChecker, get_current_user
from app.models.academic import AcademicYear, Class, Section
from app.models.fee import FeeCategory, FeePayment, FeeStructure
from app.models.hostel import HostelBlock, HostelRoom, MessPlan
from app.models.role import Permission, Role, RolePermission
from app.models.student import StudentProfile
from app.models.user import RefreshToken, User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/super-admin", tags=["Enterprise Super Admin"])

super_admin_guard = RoleChecker(["super_admin"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=64)
    displayName: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = None
    permissionCodes: List[str] = Field(default_factory=list)


class RoleUpdateRequest(BaseModel):
    displayName: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None
    permissionCodes: Optional[List[str]] = None


class AdminResetPasswordRequest(BaseModel):
    newPassword: str = Field(..., min_length=8)


class YearlyFeeStructureRequest(BaseModel):
    classId: str
    streamId: Optional[str] = None
    academicYearId: str = "ay-2026-2027"
    title: str
    feeHeads: Dict[str, float]  # e.g. {"tuition": 40000, "admission": 5000, "lab": 3000, "sports": 2000}
    dueDate: str = "2026-07-31"


class HostelBlockRequest(BaseModel):
    name: str
    code: str
    gender: str = "Co-Ed"
    description: Optional[str] = None


class HostelRoomRequest(BaseModel):
    hostelId: str
    roomNumber: str
    roomType: str = "2-Sharing AC"
    capacity: int = 2
    annualFee: float = 36000.0


class MessPlanRequest(BaseModel):
    name: str
    description: Optional[str] = None
    annualFee: float = 24000.0
    mealSchedule: Optional[str] = None


class StudentHostelAssignRequest(BaseModel):
    studentId: str
    hostelRoomId: Optional[str] = None
    messPlanId: Optional[str] = None


# ==========================================
# MODULE A: DYNAMIC RBAC & CUSTOM ROLE ENGINE
# ==========================================

@router.get("/roles", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_roles(
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Lists all system and custom roles with their mapped permissions."""
    stmt = (
        select(Role)
        .options(selectinload(Role.role_permissions).selectinload(RolePermission.permission))
        .order_by(Role.is_system.desc(), Role.name.asc())
    )
    roles = (await db.execute(stmt)).scalars().all()

    result = []
    for r in roles:
        perms = [rp.permission.code for rp in r.role_permissions if rp.permission]
        result.append({
            "id": r.id,
            "name": r.name,
            "displayName": r.display_name,
            "description": r.description,
            "isSystem": r.is_system,
            "isActive": r.is_active,
            "permissions": perms,
            "permissionCount": len(perms),
        })

    return ApiResponse(success=True, data=result)


@router.post("/roles", response_model=ApiResponse[Dict[str, Any]])
async def create_custom_role(
    payload: RoleCreateRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin creates a dynamic custom role with mapped permissions."""
    clean_name = payload.name.strip().upper().replace(" ", "_")
    existing = (await db.execute(select(Role).where(Role.name == clean_name))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{clean_name}' already exists.")

    new_role = Role(
        id=f"role-{clean_name.lower()}",
        name=clean_name,
        display_name=payload.displayName.strip(),
        description=payload.description,
        is_system=False,
        is_active=True,
    )
    db.add(new_role)
    await db.flush()

    # Link permissions
    if payload.permissionCodes:
        p_stmt = select(Permission).where(Permission.code.in_(payload.permissionCodes))
        perms = (await db.execute(p_stmt)).scalars().all()
        for p in perms:
            db.add(RolePermission(role_id=new_role.id, permission_id=p.id))

    await db.commit()
    return ApiResponse(
        success=True,
        data={"id": new_role.id, "name": new_role.name, "displayName": new_role.display_name},
        message=f"Custom role '{new_role.name}' created successfully.",
    )


@router.put("/roles/{role_id}", response_model=ApiResponse[Dict[str, Any]])
async def update_custom_role(
    role_id: str,
    payload: RoleUpdateRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin edits custom role permissions or active status."""
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if payload.displayName:
        role.display_name = payload.displayName
    if payload.description is not None:
        role.description = payload.description
    if payload.isActive is not None:
        if role.is_system and not payload.isActive:
            raise HTTPException(status_code=400, detail="Cannot deactivate core system role.")
        role.is_active = payload.isActive

    if payload.permissionCodes is not None:
        # Delete existing mappings
        del_stmt = select(RolePermission).where(RolePermission.role_id == role.id)
        existing_rp = (await db.execute(del_stmt)).scalars().all()
        for rp in existing_rp:
            await db.delete(rp)

        # Add new mappings
        p_stmt = select(Permission).where(Permission.code.in_(payload.permissionCodes))
        new_perms = (await db.execute(p_stmt)).scalars().all()
        for p in new_perms:
            db.add(RolePermission(role_id=role.id, permission_id=p.id))

    await db.commit()
    return ApiResponse(success=True, data={"id": role.id, "name": role.name}, message="Role updated successfully.")


@router.delete("/roles/{role_id}", response_model=ApiResponse[bool])
async def delete_custom_role(
    role_id: str,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Deletes custom role if no users are currently assigned to it."""
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete core system role.")

    users_count = await db.scalar(select(func.count(User.id)).where(User.role_id == role.id))
    if users_count and users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role '{role.name}': {users_count} user(s) are actively assigned. Reassign users first.",
        )

    await db.delete(role)
    await db.commit()
    return ApiResponse(success=True, data=True, message=f"Role '{role.name}' deleted successfully.")


@router.get("/permissions", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_permissions(
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Returns granular permission matrix grouped by module."""
    stmt = select(Permission).order_by(Permission.module.asc(), Permission.code.asc())
    perms = (await db.execute(stmt)).scalars().all()
    output = [
        {"id": p.id, "code": p.code, "module": p.module, "action": p.action, "description": p.description}
        for p in perms
    ]
    return ApiResponse(success=True, data=output)


# ==========================================
# MODULE B: PASSWORD LIFECYCLE & ADMIN OVERRIDE
# ==========================================

@router.post("/users/{user_id}/reset-password", response_model=ApiResponse[Dict[str, Any]])
async def admin_override_password_reset(
    user_id: str,
    payload: AdminResetPasswordRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """
    Dedicated Super Admin override:
    Sets new temporary password, flags must_change_password=True,
    and invalidates all active refresh tokens/sessions.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.password_hash = get_password_hash(payload.newPassword)
    user.must_change_password = True

    # Revoke all active refresh tokens
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(is_revoked=True)
    )

    await db.commit()
    return ApiResponse(
        success=True,
        data={"userId": user.id, "email": user.email, "mustChangePassword": True},
        message=f"Temporary password set for {user.name}. Forced rotation enabled; sessions revoked.",
    )


# ==========================================
# MODULE C: DYNAMIC CLASSES & SECTIONS MASTER
# ==========================================

@router.put("/classes/{class_id}", response_model=ApiResponse[Dict[str, Any]])
async def update_class(
    class_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin renames, reorders, or archives a Class."""
    cls_obj = await db.get(Class, class_id)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Class not found.")

    if "name" in payload:
        cls_obj.name = payload["name"]
    if "orderIndex" in payload:
        cls_obj.order_index = int(payload["orderIndex"])
    if "isActive" in payload:
        cls_obj.is_active = bool(payload["isActive"])

    await db.commit()
    return ApiResponse(success=True, data={"id": cls_obj.id, "name": cls_obj.name, "isActive": cls_obj.is_active})


@router.delete("/classes/{class_id}", response_model=ApiResponse[bool])
async def archive_class(
    class_id: str,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Soft-archives a Class."""
    cls_obj = await db.get(Class, class_id)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Class not found.")
    cls_obj.is_active = False
    await db.commit()
    return ApiResponse(success=True, data=True, message=f"Class '{cls_obj.name}' archived.")


@router.put("/sections/{section_id}", response_model=ApiResponse[Dict[str, Any]])
async def update_section(
    section_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin edits Section details (capacity, room_number, code)."""
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")

    if "name" in payload:
        sec.name = payload["name"]
    if "code" in payload:
        sec.code = payload["code"]
    if "capacity" in payload:
        sec.capacity = int(payload["capacity"])
    if "roomNumber" in payload:
        sec.room_number = str(payload["roomNumber"])
    if "isActive" in payload:
        sec.is_active = bool(payload["isActive"])

    await db.commit()
    return ApiResponse(success=True, data={"id": sec.id, "code": sec.code, "capacity": sec.capacity, "room": sec.room_number})


# ==========================================
# MODULE D: YEARLY FEE STRUCTURE ENGINE
# ==========================================

@router.get("/fees/structures", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_yearly_fee_structures(
    academic_year_id: Optional[str] = "ay-2026-2027",
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Lists all active yearly fee structures with fee head breakdowns."""
    stmt = (
        select(FeeStructure)
        .options(selectinload(FeeStructure.parent_class), selectinload(FeeStructure.fee_category))
        .where(FeeStructure.is_active == True)
    )
    if academic_year_id:
        stmt = stmt.where(FeeStructure.academic_year_id == academic_year_id)

    structures = (await db.execute(stmt)).scalars().all()
    output = []
    for s in structures:
        heads = {}
        if s.fee_breakdown:
            try:
                heads = json.loads(s.fee_breakdown)
            except Exception:
                heads = {}

        output.append({
            "id": s.id,
            "classId": s.class_id,
            "className": s.parent_class.name if s.parent_class else "Class",
            "academicYearId": s.academic_year_id,
            "title": s.title,
            "feeHeads": heads,
            "totalYearlyFee": s.total_yearly_fee or s.amount,
            "dueDate": s.due_date,
        })
    return ApiResponse(success=True, data=output)


@router.post("/fees/structures", response_model=ApiResponse[Dict[str, Any]])
async def create_yearly_fee_structure(
    payload: YearlyFeeStructureRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a Yearly Fee Structure summing fee heads (Tuition, Admission, Lab, Sports, Activity).
    """
    cls_obj = await db.get(Class, payload.classId)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Class not found.")

    # Get or create General Tuition fee category
    fc = (await db.execute(select(FeeCategory).limit(1))).scalar_one_or_none()
    if not fc:
        fc = FeeCategory(id="fc-general", name="General Academic Fee", description="Annual consolidated curriculum and facility fee")
        db.add(fc)
        await db.flush()

    total = sum(float(v) for v in payload.feeHeads.values())
    fid = f"fs-yr-{payload.classId}-{secrets.token_hex(4)}"

    fs = FeeStructure(
        id=fid,
        academic_year_id=payload.academicYearId,
        class_id=payload.classId,
        stream_id=payload.streamId,
        fee_category_id=fc.id,
        title=payload.title,
        amount=total,
        term=1,
        due_date=payload.dueDate,
        is_active=True,
        fee_breakdown=json.dumps(payload.feeHeads),
        total_yearly_fee=total,
        version=1,
    )
    db.add(fs)
    await db.commit()

    return ApiResponse(
        success=True,
        data={"id": fs.id, "title": fs.title, "totalYearlyFee": total, "heads": payload.feeHeads},
        message="Yearly fee structure created successfully.",
    )


@router.delete("/fees/structures/{structure_id}", response_model=ApiResponse[bool])
async def delete_fee_structure(
    structure_id: str,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """
    Financial Integrity Guardrail:
    Blocks deletion if student payments/receipts are already linked to this structure!
    """
    fs = await db.get(FeeStructure, structure_id)
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found.")

    # Guardrail check
    linked_payments_count = await db.scalar(
        select(func.count(FeePayment.id)).where(FeePayment.fee_structure_id == structure_id)
    )
    if linked_payments_count and linked_payments_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Financial Ledger Guardrail: Cannot delete fee structure '{fs.title}'. {linked_payments_count} recorded payment(s) are bound to it.",
        )

    fs.is_active = False
    fs.deleted_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return ApiResponse(success=True, data=True, message="Fee structure soft-deleted safely.")


# ==========================================
# MODULE E: HOSTEL & MESS FACILITY MANAGEMENT
# ==========================================

@router.get("/hostels/overview", response_model=ApiResponse[Dict[str, Any]])
async def get_hostel_overview(
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Returns overview of all hostel blocks, rooms, and mess plans."""
    blocks = (await db.execute(select(HostelBlock).options(selectinload(HostelBlock.rooms)))).scalars().all()
    mess = (await db.execute(select(MessPlan).where(MessPlan.is_active == True))).scalars().all()

    block_data = []
    total_beds = 0
    total_occupied = 0

    for b in blocks:
        rooms_data = []
        for r in b.rooms:
            if r.is_active:
                total_beds += r.capacity
                total_occupied += r.occupied
                rooms_data.append({
                    "id": r.id,
                    "roomNumber": r.room_number,
                    "roomType": r.room_type,
                    "capacity": r.capacity,
                    "occupied": r.occupied,
                    "available": max(0, r.capacity - r.occupied),
                    "annualFee": r.annual_fee,
                })
        block_data.append({
            "id": b.id,
            "name": b.name,
            "code": b.code,
            "gender": b.gender,
            "description": b.description,
            "rooms": rooms_data,
        })

    mess_data = [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "annualFee": m.annual_fee,
            "mealSchedule": m.meal_schedule,
        }
        for m in mess
    ]

    return ApiResponse(
        success=True,
        data={
            "blocks": block_data,
            "messPlans": mess_data,
            "stats": {
                "totalBeds": total_beds,
                "occupiedBeds": total_occupied,
                "availableBeds": max(0, total_beds - total_occupied),
            },
        },
    )


@router.post("/hostels/blocks", response_model=ApiResponse[Dict[str, Any]])
async def create_hostel_block(
    payload: HostelBlockRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    block = HostelBlock(
        id=f"hb-{secrets.token_hex(4)}",
        name=payload.name,
        code=payload.code.upper(),
        gender=payload.gender,
        description=payload.description,
        is_active=True,
    )
    db.add(block)
    await db.commit()
    return ApiResponse(success=True, data={"id": block.id, "name": block.name, "code": block.code})


@router.post("/hostels/rooms", response_model=ApiResponse[Dict[str, Any]])
async def create_hostel_room(
    payload: HostelRoomRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    block = await db.get(HostelBlock, payload.hostelId)
    if not block:
        raise HTTPException(status_code=404, detail="Hostel block not found.")

    room = HostelRoom(
        id=f"room-{secrets.token_hex(4)}",
        hostel_id=payload.hostelId,
        room_number=payload.roomNumber,
        room_type=payload.roomType,
        capacity=payload.capacity,
        occupied=0,
        annual_fee=payload.annualFee,
        is_active=True,
    )
    db.add(room)
    await db.commit()
    return ApiResponse(success=True, data={"id": room.id, "roomNumber": room.room_number, "annualFee": room.annual_fee})


@router.post("/hostels/mess-plans", response_model=ApiResponse[Dict[str, Any]])
async def create_mess_plan(
    payload: MessPlanRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    plan = MessPlan(
        id=f"mp-{secrets.token_hex(4)}",
        name=payload.name,
        description=payload.description,
        annual_fee=payload.annualFee,
        meal_schedule=payload.mealSchedule,
        is_active=True,
    )
    db.add(plan)
    await db.commit()
    return ApiResponse(success=True, data={"id": plan.id, "name": plan.name, "annualFee": plan.annual_fee})


@router.post("/hostels/assign-student", response_model=ApiResponse[Dict[str, Any]])
async def assign_student_hostel_and_mess(
    payload: StudentHostelAssignRequest,
    current_user: User = Depends(super_admin_guard),
    db: AsyncSession = Depends(get_db),
):
    """Assigns student to hostel room & mess plan with unified annual cost."""
    sp = await db.get(StudentProfile, payload.studentId)
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    total_annual_cost = 0.0
    room_info = None
    mess_info = None

    if payload.hostelRoomId:
        room = await db.get(HostelRoom, payload.hostelRoomId)
        if not room:
            raise HTTPException(status_code=404, detail="Hostel room not found.")
        if room.occupied >= room.capacity:
            raise HTTPException(status_code=400, detail="Room is already at full capacity.")
        sp.hostel_room_id = room.id
        room.occupied += 1
        total_annual_cost += room.annual_fee
        room_info = {"roomNumber": room.room_number, "fee": room.annual_fee}

    if payload.messPlanId:
        mess = await db.get(MessPlan, payload.messPlanId)
        if not mess:
            raise HTTPException(status_code=404, detail="Mess plan not found.")
        sp.mess_plan_id = mess.id
        total_annual_cost += mess.annual_fee
        mess_info = {"planName": mess.name, "fee": mess.annual_fee}

    await db.commit()
    return ApiResponse(
        success=True,
        data={
            "studentId": sp.id,
            "room": room_info,
            "mess": mess_info,
            "totalAnnualHostelMessFee": total_annual_cost,
        },
        message="Hostel and Mess assigned successfully.",
    )


# ==========================================
# MODULE F: ALL-INDIA STATES & DISTRICTS LOOKUP
# ==========================================

@router.get("/geo/states-and-districts", response_model=ApiResponse[Dict[str, List[str]]])
async def get_states_and_districts():
    """Returns official master dataset of all 28 Indian States and 8 Union Territories mapped to districts."""
    return ApiResponse(success=True, data=INDIA_STATES_DISTRICTS)
