import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth_utils import generate_secure_random_password, normalize_dob_ddmmyyyy
from app.core.india_geo import validate_state_and_district
from app.core.security import generate_blind_index, get_password_hash
from app.db.session import get_db
from app.dependencies.auth import RoleChecker
from app.models.academic import AcademicYear, Class, Section
from app.models.admission import (
    AdmissionApplication,
    AdmissionAssessment,
    AdmissionBatch,
    AdmissionBatchClass,
    AdmissionConfig,
    ApplicationDocument,
    AssessmentCandidate,
    CandidateProfile,
    EligibilityCriteria,
    FinalSelectionList,
    RequiredDocumentMaster,
)
from app.models.communication import AuditLog, Notification
from app.models.fee import FeeCategory, FeePayment, FeeStructure
from app.models.hostel import HostelRoom, MessPlan
from app.models.school import School
from app.models.student import ParentChildLink, StudentEnrollment, StudentProfile
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/admissions", tags=["Admissions & Enrollment"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class BatchCreateRequest(BaseModel):
    batchName: str
    academicYearId: str = "ay-2026-2027"
    startDate: str
    endDate: str
    applicationFee: float = 500.0
    seatCapacityPerClass: int = 40
    classQuotas: Optional[Dict[str, int]] = None  # {class_id: capacity}


class ClassAdmissionConfigRequest(BaseModel):
    classId: str
    academicYearId: str = "ay-2026-2027"
    admissionTrack: str = "DIRECT_ADMISSION"  # DIRECT_ADMISSION | ASSESSMENT_REQUIRED
    requirePreviousSchoolTc: bool = False
    minAgeYears: float = 3.0
    maxAgeYears: float = 18.0
    ageCutoffDate: str = "2026-06-01"
    minPreviousGradePct: Optional[float] = None
    mandatoryDocs: List[str] = Field(default_factory=lambda: ["BIRTH_CERT", "AADHAAR", "PHOTO"])


class PublicCandidateApplyRequest(BaseModel):
    admissionBatchId: str
    targetClassId: str
    firstName: str
    lastName: str
    dob: str  # YYYY-MM-DD or DD-MM-YYYY
    gender: str
    bloodGroup: Optional[str] = "O+"
    casteCategory: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    fatherName: str
    motherName: str
    guardianPhone: str
    guardianEmail: Optional[str] = None
    state: str = "Karnataka"
    district: str = "Bengaluru Urban"
    pincode: Optional[str] = None
    address: str
    previousSchoolName: Optional[str] = None
    previousClass: Optional[str] = None
    previousPercentage: Optional[float] = None
    requiresHostel: bool = False
    preferredHostelBlockId: Optional[str] = None
    preferredMessPlanId: Optional[str] = None
    paymentReference: Optional[str] = None  # Razorpay payment_id or UPI ref
    documents: List[Dict[str, str]] = Field(default_factory=list)


class ScheduleAssessmentRequest(BaseModel):
    admissionBatchId: str
    targetClassId: str
    title: str
    assessmentType: str = "WRITTEN_TEST"
    assessmentDate: str
    startTime: str = "10:00"
    venueOrLink: str
    maxMarks: float = 100.0
    passingMarks: float = 40.0
    assignedEvaluatorStaffId: Optional[str] = None
    applicationIds: List[str] = Field(default_factory=list)


class MarkAssessmentAttendanceRequest(BaseModel):
    records: Dict[str, str]  # {application_id: "PRESENT" | "ABSENT"}


class EnterAssessmentScoresRequest(BaseModel):
    scores: List[Dict[str, Any]]  # [{"applicationId": "...", "marksObtained": 78.5, "remarks": "Strong aptitude"}]


class EnrollCandidateRequest(BaseModel):
    sectionId: str
    rollNumber: Optional[str] = None
    hostelRoomId: Optional[str] = None
    messPlanId: Optional[str] = None
    admissionFeePaid: float = 0.0
    paymentMethod: str = "UPI"
    paymentReference: Optional[str] = None


# ==========================================
# 1. COMMAND CENTER DASHBOARD KPIs
# ==========================================

@router.get("/dashboard", response_model=ApiResponse[Dict[str, Any]])
async def get_admissions_dashboard(
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "manager", "accountant"])),
    db: AsyncSession = Depends(get_db),
):
    batches = (await db.execute(select(AdmissionBatch))).scalars().all()
    apps = (await db.execute(select(AdmissionApplication))).scalars().all()
    assessments = (await db.execute(select(AdmissionAssessment))).scalars().all()
    final_list = (await db.execute(select(FinalSelectionList))).scalars().all()

    status_counts: Dict[str, int] = {}
    direct_count = 0
    assessment_count = 0
    app_fee_collected = 0.0

    for a in apps:
        status_counts[a.status] = status_counts.get(a.status, 0) + 1
        if a.admission_track == "DIRECT_ADMISSION":
            direct_count += 1
        else:
            assessment_count += 1
        if a.app_fee_status == "PAID":
            app_fee_collected += a.app_fee_amount

    return ApiResponse(
        success=True,
        data={
            "batches": {
                "total": len(batches),
                "upcoming": sum(1 for b in batches if b.status == "UPCOMING"),
                "open": sum(1 for b in batches if b.status == "OPEN"),
                "closed": sum(1 for b in batches if b.status == "CLOSED"),
            },
            "applications": {
                "total": len(apps),
                "directTrack": direct_count,
                "assessmentTrack": assessment_count,
                "byStatus": status_counts,
                "applicationFeeCollected": app_fee_collected,
            },
            "assessmentsScheduled": len(assessments),
            "finalSelectedCount": len(final_list),
            "enrolledCount": sum(1 for f in final_list if f.enrolled_student_profile_id is not None),
        },
    )


# ==========================================
# 2. BATCHES & CLASS ELIGIBILITY CONFIG
# ==========================================

@router.get("/configs", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_class_admission_configs(
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    configs = (
        await db.execute(
            select(AdmissionConfig)
            .options(
                selectinload(AdmissionConfig.target_class),
                selectinload(AdmissionConfig.eligibility),
                selectinload(AdmissionConfig.required_documents),
            )
        )
    ).scalars().all()

    data = []
    for c in configs:
        data.append({
            "id": c.id,
            "classId": c.class_id,
            "className": c.target_class.name if c.target_class else "",
            "admissionTrack": c.admission_track,
            "requirePreviousSchoolTc": c.require_previous_school_tc,
            "minAge": c.eligibility.min_age_years if c.eligibility else 3.0,
            "maxAge": c.eligibility.max_age_years if c.eligibility else 18.0,
            "requiredDocs": [d.doc_code for d in c.required_documents],
        })
    return ApiResponse(success=True, data=data)


@router.post("/configs", response_model=ApiResponse[Dict[str, Any]])
async def upsert_class_admission_config(
    payload: ClassAdmissionConfigRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    cls_obj = await db.get(Class, payload.classId)
    if not cls_obj:
        raise HTTPException(status_code=404, detail="Class not found.")

    require_tc = payload.requirePreviousSchoolTc if cls_obj.order_index > 4 else False

    existing = (await db.execute(select(AdmissionConfig).where(AdmissionConfig.class_id == payload.classId))).scalar_one_or_none()
    if not existing:
        existing = AdmissionConfig(
            id=f"admcfg-{payload.classId}",
            class_id=payload.classId,
            academic_year_id=payload.academicYearId,
            admission_track=payload.admissionTrack,
            require_previous_school_tc=require_tc,
            is_active=True,
        )
        db.add(existing)
        await db.flush()
    else:
        existing.admission_track = payload.admissionTrack
        existing.require_previous_school_tc = require_tc

    elig = (await db.execute(select(EligibilityCriteria).where(EligibilityCriteria.config_id == existing.id))).scalar_one_or_none()
    if not elig:
        elig = EligibilityCriteria(
            id=f"elig-{payload.classId}",
            config_id=existing.id,
            min_age_years=payload.minAgeYears,
            max_age_years=payload.maxAgeYears,
            age_cutoff_date=payload.ageCutoffDate,
            min_previous_grade_pct=payload.minPreviousGradePct,
        )
        db.add(elig)
    else:
        elig.min_age_years = payload.minAgeYears
        elig.max_age_years = payload.maxAgeYears
        elig.age_cutoff_date = payload.ageCutoffDate
        elig.min_previous_grade_pct = payload.minPreviousGradePct

    old_docs = (await db.execute(select(RequiredDocumentMaster).where(RequiredDocumentMaster.config_id == existing.id))).scalars().all()
    for d in old_docs:
        await db.delete(d)

    doc_labels = {
        "BIRTH_CERT": "Birth Certificate",
        "AADHAAR": "Student / Parent Aadhaar Card",
        "PHOTO": "Passport Size Photograph",
        "TC": "Previous School Transfer Certificate (TC)",
        "PREV_MARKSHEET": "Previous Class Report Card / Marksheet",
        "CASTE_CERT": "Caste / Category Certificate",
    }
    docs_to_add = set(payload.mandatoryDocs)
    if require_tc:
        docs_to_add.update(["TC", "PREV_MARKSHEET"])

    for code in docs_to_add:
        db.add(
            RequiredDocumentMaster(
                id=f"reqdoc-{payload.classId}-{code.lower()}",
                config_id=existing.id,
                doc_code=code,
                doc_label=doc_labels.get(code, code),
                is_mandatory=(code != "CASTE_CERT"),
            )
        )

    await db.commit()
    return ApiResponse(
        success=True,
        data={"configId": existing.id, "classId": payload.classId, "admissionTrack": existing.admission_track, "requireTc": require_tc},
        message="Admission configuration saved.",
    )


@router.get("/batches", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_admission_batches(
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "manager", "accountant", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    batches = (
        await db.execute(
            select(AdmissionBatch)
            .options(
                selectinload(AdmissionBatch.class_quotas).selectinload(AdmissionBatchClass.target_class)
            )
            .order_by(AdmissionBatch.created_at.desc())
        )
    ).scalars().all()

    data = []
    for b in batches:
        data.append({
            "id": b.id,
            "batchName": b.batch_name,
            "academicYearId": b.academic_year_id,
            "startDate": b.start_date,
            "endDate": b.end_date,
            "status": b.status,
            "applicationFee": b.application_fee,
            "seatCapacityPerClass": b.seat_capacity_per_class,
            "classQuotas": [
                {
                    "classId": q.class_id,
                    "className": q.target_class.name if q.target_class else "",
                    "seatCapacity": q.seat_capacity,
                    "seatsFilled": q.seats_filled,
                }
                for q in b.class_quotas
            ],
        })
    return ApiResponse(success=True, data=data)


@router.post("/batches", response_model=ApiResponse[Dict[str, Any]])
async def create_admission_batch(
    payload: BatchCreateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    batch_id = f"batch-{secrets.token_hex(4)}"
    batch = AdmissionBatch(
        id=batch_id,
        batch_name=payload.batchName,
        academic_year_id=payload.academicYearId,
        start_date=payload.startDate,
        end_date=payload.endDate,
        status="OPEN",
        application_fee=payload.applicationFee,
        seat_capacity_per_class=payload.seatCapacityPerClass,
        created_by_user_id=current_user.id,
    )
    db.add(batch)
    await db.flush()

    classes = (await db.execute(select(Class).where(Class.is_active == True))).scalars().all()
    for c in classes:
        cap = (payload.classQuotas or {}).get(c.id, payload.seatCapacityPerClass)
        db.add(
            AdmissionBatchClass(
                id=f"bcls-{batch_id}-{c.id}",
                batch_id=batch_id,
                class_id=c.id,
                seat_capacity=cap,
                seats_filled=0,
            )
        )

    await db.commit()
    return ApiResponse(success=True, data={"id": batch.id, "batchName": batch.batch_name}, message="Admission batch started.")


# ==========================================
# 3. PUBLIC ONLINE APPLICATION & AUTO-TRIAGE
# ==========================================

@router.get("/public/open-batches", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_public_open_batches(db: AsyncSession = Depends(get_db)):
    batches = (
        await db.execute(
            select(AdmissionBatch)
            .where(AdmissionBatch.status == "OPEN")
            .options(
                selectinload(AdmissionBatch.class_quotas).selectinload(AdmissionBatchClass.target_class)
            )
        )
    ).scalars().all()

    data = []
    for b in batches:
        data.append({
            "id": b.id,
            "batchName": b.batch_name,
            "applicationFee": b.application_fee,
            "startDate": b.start_date,
            "endDate": b.end_date,
            "classes": [
                {
                    "classId": q.class_id,
                    "className": q.target_class.name if q.target_class else "",
                    "orderIndex": q.target_class.order_index if q.target_class else 1,
                    "seatCapacity": q.seat_capacity,
                    "seatsFilled": q.seats_filled,
                }
                for q in b.class_quotas
            ],
        })
    return ApiResponse(success=True, data=data)


@router.post("/public/apply", response_model=ApiResponse[Dict[str, Any]])
async def submit_public_application(
    payload: PublicCandidateApplyRequest,
    db: AsyncSession = Depends(get_db),
):
    if not validate_state_and_district(payload.state, payload.district):
        raise HTTPException(status_code=422, detail=f"District '{payload.district}' does not belong to State '{payload.state}'.")

    batch = await db.get(AdmissionBatch, payload.admissionBatchId)
    if not batch or batch.status != "OPEN":
        raise HTTPException(status_code=400, detail="Selected admission batch is not currently open.")

    target_class = await db.get(Class, payload.targetClassId)
    if not target_class:
        raise HTTPException(status_code=404, detail="Target class not found.")

    if target_class.order_index >= 5 and not payload.previousSchoolName:
        raise HTTPException(status_code=422, detail=f"{target_class.name} requires Previous School details and Transfer Certificate.")

    cfg = (await db.execute(select(AdmissionConfig).where(AdmissionConfig.class_id == target_class.id))).scalar_one_or_none()
    if cfg:
        track = cfg.admission_track
    else:
        track = "DIRECT_ADMISSION" if target_class.order_index <= 8 else "ASSESSMENT_REQUIRED"

    app_no = f"APP-{datetime.now(timezone.utc).year}-{secrets.token_hex(3).upper()}"
    cand_id = f"cand-{secrets.token_hex(6)}"
    portal_password = generate_secure_random_password(12)
    portal_hash = get_password_hash(portal_password)

    candidate = CandidateProfile(
        id=cand_id,
        application_number=app_no,
        first_name=payload.firstName.strip(),
        last_name=payload.lastName.strip(),
        dob=payload.dob,
        gender=payload.gender,
        blood_group=payload.bloodGroup,
        caste_category=payload.casteCategory,
        aadhaar_encrypted=payload.aadhaarNumber,
        aadhaar_hash=generate_blind_index(payload.aadhaarNumber) if payload.aadhaarNumber else None,
        father_name=payload.fatherName,
        mother_name=payload.motherName,
        guardian_phone=payload.guardianPhone,
        guardian_phone_hash=generate_blind_index(payload.guardianPhone),
        guardian_email=payload.guardianEmail,
        state=payload.state,
        district=payload.district,
        pincode=payload.pincode,
        address=payload.address,
        previous_school_name=payload.previousSchoolName,
        previous_class=payload.previousClass,
        previous_percentage=payload.previousPercentage,
        portal_password_hash=portal_hash,
    )
    db.add(candidate)
    await db.flush()

    app_id = f"app-{secrets.token_hex(6)}"
    fee_status = "PENDING_VERIFICATION" if payload.paymentReference else "PENDING"
    now_iso = datetime.now(timezone.utc).isoformat()

    application = AdmissionApplication(
        id=app_id,
        application_number=app_no,
        candidate_id=cand_id,
        admission_batch_id=batch.id,
        target_class_id=target_class.id,
        admission_track=track,
        status="SUBMITTED",
        app_fee_amount=batch.application_fee,
        app_fee_status=fee_status,
        app_fee_reference=payload.paymentReference,
        app_fee_paid_at=None,
        requires_hostel=payload.requiresHostel,
        preferred_hostel_block_id=payload.preferredHostelBlockId,
        preferred_mess_plan_id=payload.preferredMessPlanId,
        submitted_at=now_iso,
    )
    db.add(application)
    await db.flush()

    for doc in payload.documents:
        db.add(
            ApplicationDocument(
                id=f"adoc-{secrets.token_hex(6)}",
                application_id=app_id,
                doc_code=doc.get("docCode", "OTHER"),
                file_name=doc.get("fileName", "document.pdf"),
                file_url=doc.get("fileUrl", "/uploads/mock.pdf"),
                verification_status="PENDING",
            )
        )

    await db.commit()
    return ApiResponse(
        success=True,
        data={
            "applicationId": app_id,
            "applicationNumber": app_no,
            "admissionTrack": track,
            "status": application.status,
            "trackingCredentials": {
                "applicationNumber": app_no,
                "initialPinHint": "DOB in DDMMYYYY format",
            },
        },
        message=f"Application {app_no} submitted and routed to {track}.",
    )


# ==========================================
# 4. DUAL-TRACK TRIAGE & DIRECT SELECTION
# ==========================================

@router.get("/applications", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_applications(
    admission_track: Optional[str] = None,
    status_filter: Optional[str] = None,
    class_id: Optional[str] = None,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "teacher", "manager", "accountant"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AdmissionApplication)
        .options(
            selectinload(AdmissionApplication.candidate),
            selectinload(AdmissionApplication.target_class),
            selectinload(AdmissionApplication.documents),
        )
        .order_by(AdmissionApplication.created_at.desc())
    )
    if admission_track:
        stmt = stmt.where(AdmissionApplication.admission_track == admission_track)
    if status_filter:
        stmt = stmt.where(AdmissionApplication.status == status_filter)
    if class_id:
        stmt = stmt.where(AdmissionApplication.target_class_id == class_id)

    apps = (await db.execute(stmt)).scalars().all()
    output = []
    for a in apps:
        c = a.candidate
        output.append({
            "id": a.id,
            "applicationNumber": a.application_number,
            "candidateName": f"{c.first_name} {c.last_name}" if c else "",
            "dob": c.dob if c else "",
            "gender": c.gender if c else "",
            "guardianPhone": c.guardian_phone if c else "",
            "state": c.state if c else "",
            "district": c.district if c else "",
            "targetClassId": a.target_class_id,
            "targetClassName": a.target_class.name if a.target_class else "",
            "admissionTrack": a.admission_track,
            "status": a.status,
            "appFeeStatus": a.app_fee_status,
            "requiresHostel": a.requires_hostel,
            "documentsCount": len(a.documents),
            "submittedAt": a.submitted_at,
        })
    return ApiResponse(success=True, data=output)


@router.post("/applications/{application_id}/approve-direct", response_model=ApiResponse[Dict[str, Any]])
async def approve_direct_admission(
    application_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    app_obj = await db.get(AdmissionApplication, application_id)
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app_obj.admission_track != "DIRECT_ADMISSION":
        raise HTTPException(status_code=400, detail="Application requires an Entrance Assessment before selection.")

    app_obj.status = "FINAL_SELECTED"
    existing_final = (await db.execute(select(FinalSelectionList).where(FinalSelectionList.application_id == app_obj.id))).scalar_one_or_none()
    if not existing_final:
        db.add(
            FinalSelectionList(
                id=f"fsl-{secrets.token_hex(6)}",
                application_id=app_obj.id,
                admission_batch_id=app_obj.admission_batch_id,
                target_class_id=app_obj.target_class_id,
                selection_source="DIRECT_ADMISSION",
            )
        )
    await db.commit()
    return ApiResponse(success=True, data={"applicationId": app_obj.id, "status": "FINAL_SELECTED"}, message="Candidate added to Final Selection List.")


# ==========================================
# 5. ASSESSMENTS & ATTENDANCE GUARDRAIL
# ==========================================

@router.get("/assessments", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_assessments(
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AdmissionAssessment)
        .options(
            selectinload(AdmissionAssessment.target_class),
            selectinload(AdmissionAssessment.evaluator),
            selectinload(AdmissionAssessment.candidates)
            .selectinload(AssessmentCandidate.application)
            .selectinload(AdmissionApplication.candidate),
        )
        .order_by(AdmissionAssessment.assessment_date.desc())
    )
    assessments = (await db.execute(stmt)).scalars().all()

    data = []
    for asmt in assessments:
        cand_list = []
        for ac in asmt.candidates:
            app_c = ac.application.candidate if ac.application else None
            cand_list.append({
                "candidateId": ac.id,
                "applicationId": ac.application_id,
                "applicationNumber": ac.application.application_number if ac.application else "",
                "candidateName": f"{app_c.first_name} {app_c.last_name}" if app_c else "",
                "attendanceStatus": ac.attendance_status,
                "marksObtained": ac.marks_obtained,
                "resultStatus": ac.result_status,
                "evaluationRemarks": ac.evaluation_remarks,
            })

        data.append({
            "id": asmt.id,
            "title": asmt.title,
            "targetClassName": asmt.target_class.name if asmt.target_class else "",
            "assessmentType": asmt.assessment_type,
            "assessmentDate": asmt.assessment_date,
            "startTime": asmt.start_time,
            "venueOrLink": asmt.venue_or_link,
            "maxMarks": asmt.max_marks,
            "passingMarks": asmt.passing_marks,
            "evaluatorName": asmt.evaluator.name if asmt.evaluator else "Unassigned",
            "status": asmt.status,
            "candidates": cand_list,
        })

    return ApiResponse(success=True, data=data)


@router.post("/assessments", response_model=ApiResponse[Dict[str, Any]])
async def schedule_assessment(
    payload: ScheduleAssessmentRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    assessment_id = f"asmt-{secrets.token_hex(6)}"
    asmt = AdmissionAssessment(
        id=assessment_id,
        admission_batch_id=payload.admissionBatchId,
        target_class_id=payload.targetClassId,
        title=payload.title,
        assessment_type=payload.assessmentType,
        assessment_date=payload.assessmentDate,
        start_time=payload.startTime,
        venue_or_link=payload.venueOrLink,
        max_marks=payload.maxMarks,
        passing_marks=payload.passingMarks,
        assigned_evaluator_staff_id=payload.assignedEvaluatorStaffId,
        status="SCHEDULED",
    )
    db.add(asmt)
    await db.flush()

    for app_id in payload.applicationIds:
        app_obj = await db.get(AdmissionApplication, app_id)
        if app_obj:
            app_obj.status = "SHORTLISTED_FOR_ASSESSMENT"
            db.add(
                AssessmentCandidate(
                    id=f"asmtc-{secrets.token_hex(6)}",
                    assessment_id=assessment_id,
                    application_id=app_id,
                    attendance_status="PENDING",
                )
            )

    await db.commit()
    return ApiResponse(success=True, data={"assessmentId": assessment_id, "shortlisted": len(payload.applicationIds)}, message="Assessment scheduled.")


@router.post("/assessments/{assessment_id}/attendance", response_model=ApiResponse[Dict[str, Any]])
@router.patch("/assessments/{assessment_id}/attendance", response_model=ApiResponse[Dict[str, Any]])
async def mark_assessment_attendance(
    assessment_id: str,
    payload: MarkAssessmentAttendanceRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AssessmentCandidate).where(AssessmentCandidate.assessment_id == assessment_id)
    candidates = (await db.execute(stmt)).scalars().all()
    now_iso = datetime.now(timezone.utc).isoformat()
    updated = 0

    for c in candidates:
        if c.application_id in payload.records:
            status_val = payload.records[c.application_id].upper()
            if status_val in ("PRESENT", "ABSENT", "RESCHEDULED"):
                c.attendance_status = status_val
                c.attendance_marked_by_id = current_user.id
                c.attendance_marked_at = now_iso
                updated += 1

    await db.commit()
    return ApiResponse(success=True, data={"assessmentId": assessment_id, "updatedCount": updated}, message="Assessment attendance recorded.")


@router.put("/assessments/{assessment_id}", response_model=ApiResponse[Dict[str, Any]])
async def update_assessment(
    assessment_id: str,
    payload: ScheduleAssessmentRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    asmt = await db.get(AdmissionAssessment, assessment_id)
    if not asmt:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    asmt.title = payload.title
    asmt.assessment_type = payload.assessmentType
    asmt.assessment_date = payload.assessmentDate
    asmt.start_time = payload.startTime
    asmt.venue_or_link = payload.venueOrLink
    asmt.max_marks = payload.maxMarks
    asmt.passing_marks = payload.passingMarks
    if payload.assignedEvaluatorStaffId:
        asmt.assigned_evaluator_staff_id = payload.assignedEvaluatorStaffId

    # Add any newly shortlisted candidates
    for app_id in payload.applicationIds:
        existing = (
            await db.execute(
                select(AssessmentCandidate).where(
                    AssessmentCandidate.assessment_id == assessment_id,
                    AssessmentCandidate.application_id == app_id,
                )
            )
        ).scalar_one_or_none()
        if not existing:
            app_obj = await db.get(AdmissionApplication, app_id)
            if app_obj:
                app_obj.status = "SHORTLISTED_FOR_ASSESSMENT"
                db.add(
                    AssessmentCandidate(
                        id=f"asmtc-{secrets.token_hex(6)}",
                        assessment_id=assessment_id,
                        application_id=app_id,
                        attendance_status="PENDING",
                    )
                )

    await db.commit()
    return ApiResponse(success=True, data={"assessmentId": assessment_id}, message="Assessment updated.")



@router.post("/assessments/{assessment_id}/scores", response_model=ApiResponse[Dict[str, Any]])
async def enter_assessment_scores(
    assessment_id: str,
    payload: EnterAssessmentScoresRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal", "teacher"])),
    db: AsyncSession = Depends(get_db),
):
    asmt = await db.get(AdmissionAssessment, assessment_id)
    if not asmt:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    promoted_count = 0

    for item in payload.scores:
        app_id = item["applicationId"]
        marks = float(item["marksObtained"])
        remarks = item.get("remarks", "")

        ac = (
            await db.execute(
                select(AssessmentCandidate).where(
                    AssessmentCandidate.assessment_id == assessment_id,
                    AssessmentCandidate.application_id == app_id,
                )
            )
        ).scalar_one_or_none()

        if not ac:
            raise HTTPException(status_code=404, detail=f"Candidate {app_id} not registered in this assessment.")

        # STRICT ATTENDANCE GUARDRAIL
        if ac.attendance_status != "PRESENT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance Guardrail Violation: Candidate ({app_id}) attendance is '{ac.attendance_status}'. Must be marked PRESENT before entering scores.",
            )

        if marks < 0 or marks > asmt.max_marks:
            raise HTTPException(status_code=422, detail=f"Marks ({marks}) must be between 0 and {asmt.max_marks}.")

        ac.marks_obtained = marks
        ac.evaluation_remarks = remarks
        ac.evaluated_by_id = current_user.id
        ac.evaluated_at = now_iso
        passed = marks >= asmt.passing_marks
        ac.result_status = "PASSED" if passed else "FAILED"

        app_obj = await db.get(AdmissionApplication, app_id)
        if app_obj:
            if passed:
                app_obj.status = "FINAL_SELECTED"
                promoted_count += 1
                existing_fsl = (await db.execute(select(FinalSelectionList).where(FinalSelectionList.application_id == app_id))).scalar_one_or_none()
                if not existing_fsl:
                    db.add(
                        FinalSelectionList(
                            id=f"fsl-{secrets.token_hex(6)}",
                            application_id=app_id,
                            admission_batch_id=app_obj.admission_batch_id,
                            target_class_id=app_obj.target_class_id,
                            selection_source="ASSESSMENT_CLEARED",
                        )
                    )
            else:
                app_obj.status = "REJECTED"

    asmt.status = "COMPLETED"
    await db.commit()
    return ApiResponse(
        success=True,
        data={"assessmentId": assessment_id, "promotedToFinalList": promoted_count},
        message=f"Scores recorded. {promoted_count} candidate(s) auto-promoted to Final Selection List.",
    )


# ==========================================
# 6. FINAL LIST INTIMATION & 1-CLICK ENROLLMENT CONVERSION
# ==========================================

@router.get("/final-list", response_model=ApiResponse[List[Dict[str, Any]]])
async def list_final_selection(
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "manager", "accountant", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(FinalSelectionList)
        .options(
            selectinload(FinalSelectionList.application).selectinload(AdmissionApplication.candidate),
            selectinload(FinalSelectionList.target_class),
            selectinload(FinalSelectionList.allocated_section),
            selectinload(FinalSelectionList.student_profile),
        )
        .order_by(FinalSelectionList.created_at.desc())
    )
    entries = (await db.execute(stmt)).scalars().all()

    data = []
    for f in entries:
        app_c = f.application.candidate if f.application else None
        data.append({
            "id": f.id,
            "applicationId": f.application_id,
            "applicationNumber": f.application.application_number if f.application else "",
            "candidateName": f"{app_c.first_name} {app_c.last_name}" if app_c else "",
            "targetClassName": f.target_class.name if f.target_class else "",
            "targetClassId": f.target_class_id,
            "selectionSource": f.selection_source,
            "meritRank": f.merit_rank,
            "intimationSent": f.intimation_sent,
            "admissionFeeStatus": f.admission_fee_status,
            "enrolledStudentProfileId": f.enrolled_student_profile_id,
            "allocatedSectionCode": f.allocated_section.code if f.allocated_section else None,
            "enrolledAt": f.enrolled_at,
        })
    return ApiResponse(success=True, data=data)


@router.post("/final-list/{selection_id}/send-intimation", response_model=ApiResponse[Dict[str, Any]])
@router.post("/final-list/{selection_id}/notify", response_model=ApiResponse[Dict[str, Any]])
async def send_selection_intimation(
    selection_id: str,
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "principal"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(FinalSelectionList)
        .where(
            (FinalSelectionList.id == selection_id) | (FinalSelectionList.application_id == selection_id)
        )
    )
    fsl = (await db.execute(stmt)).scalar_one_or_none()
    if not fsl:
        raise HTTPException(status_code=404, detail="Selection entry not found.")

    fsl.intimation_sent = True
    fsl.intimation_sent_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    return ApiResponse(success=True, data={"selectionId": fsl.id, "intimationSent": True}, message="Selection intimation dispatched via Email & WhatsApp.")


@router.post("/final-list/{selection_id}/convert-to-student", response_model=ApiResponse[Dict[str, Any]])
@router.post("/final-list/{selection_id}/convert", response_model=ApiResponse[Dict[str, Any]])
async def convert_candidate_to_enrolled_student(
    selection_id: str,
    payload: EnrollCandidateRequest,
    current_user: User = Depends(RoleChecker(["super_admin", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(FinalSelectionList)
        .options(
            selectinload(FinalSelectionList.application).selectinload(AdmissionApplication.candidate),
            selectinload(FinalSelectionList.application).selectinload(AdmissionApplication.batch),
        )
        .where(
            (FinalSelectionList.id == selection_id) | (FinalSelectionList.application_id == selection_id)
        )
    )
    fsl = (await db.execute(stmt)).scalar_one_or_none()
    if not fsl or not fsl.application or not fsl.application.candidate:
        raise HTTPException(status_code=404, detail="Final selection record not found.")

    if fsl.enrolled_student_profile_id:
        raise HTTPException(status_code=400, detail="Candidate has already been converted to an enrolled student.")

    app_obj = fsl.application
    cand = app_obj.candidate
    batch = app_obj.batch

    section = await db.get(Section, payload.sectionId)
    if not section or section.class_id != app_obj.target_class_id:
        raise HTTPException(status_code=400, detail="Invalid section for the selected target class.")

    digits_mobile = "".join(filter(str.isdigit, cand.guardian_phone))[-10:]
    dob_norm = normalize_dob_ddmmyyyy(cand.dob)
    hashed_pwd = get_password_hash(dob_norm if len(dob_norm) == 8 else "01012015")

    school = (await db.execute(select(School).limit(1))).scalar_one_or_none()
    school_code = school.code if school else "EDP"
    school_id = school.id if school else None
    adm_no = f"{school_code}/ADM/{datetime.now(timezone.utc).year}/{secrets.token_hex(3).upper()}"

    user_id = f"usr-{secrets.token_hex(8)}"
    new_user = User(
        id=user_id,
        name=f"{cand.first_name} {cand.last_name}",
        email=cand.guardian_email or f"student.{digits_mobile}.{secrets.token_hex(2)}@{school_code.lower()}.edu.in",
        username=f"{digits_mobile}_{secrets.token_hex(2)}" if await db.scalar(select(User.id).where(User.username == digits_mobile)) else digits_mobile,
        password_hash=hashed_pwd,
        user_type="student",
        phone=digits_mobile,
        phone_hash=generate_blind_index(digits_mobile),
        dob=cand.dob,
        gender=cand.gender,
        blood_group=cand.blood_group,
        school_id=school_id,
        state=cand.state,
        district=cand.district,
        address=cand.address,
        code=adm_no,
        must_change_password=True,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # Create/link Parent Account
    if cand.guardian_phone:
        parent_user = (
            await db.execute(
                select(User).where(
                    User.user_type == "parent",
                    User.phone == digits_mobile,
                )
            )
        ).scalar_one_or_none()
        if not parent_user:
            parent_id = f"usr-p-{secrets.token_hex(6)}"
            parent_user = User(
                id=parent_id,
                name=cand.father_name or cand.mother_name or f"Parent of {cand.first_name}",
                email=cand.guardian_email or f"parent.{digits_mobile}@{school_code.lower()}.edu.in",
                username=f"p_{digits_mobile}",
                password_hash=hashed_pwd,
                user_type="parent",
                phone=digits_mobile,
                phone_hash=generate_blind_index(digits_mobile),
                school_id=school_id,
                state=cand.state,
                district=cand.district,
                must_change_password=True,
                is_active=True,
            )
            db.add(parent_user)
            await db.flush()

    if payload.hostelRoomId:
        room = await db.get(HostelRoom, payload.hostelRoomId)
        if not room or room.occupied >= room.capacity:
            raise HTTPException(status_code=400, detail="Selected hostel room is unavailable or at full capacity.")
        room.occupied += 1

    sp_id = f"sp-{secrets.token_hex(8)}"
    sp = StudentProfile(
        id=sp_id,
        user_id=new_user.id,
        admission_number=adm_no,
        caste_category=cand.caste_category,
        current_academic_year_id=batch.academic_year_id,
        hostel_room_id=payload.hostelRoomId,
        mess_plan_id=payload.messPlanId,
    )
    db.add(sp)
    await db.flush()

    # Link parent to student
    if cand.guardian_phone and parent_user:
        existing_link = (
            await db.execute(
                select(ParentChildLink).where(
                    ParentChildLink.parent_user_id == parent_user.id,
                    ParentChildLink.student_profile_id == sp.id,
                )
            )
        ).scalar_one_or_none()
        if not existing_link:
            db.add(
                ParentChildLink(
                    id=f"pcl-{secrets.token_hex(6)}",
                    parent_user_id=parent_user.id,
                    student_profile_id=sp.id,
                    relationship_type="Father" if cand.father_name else ("Mother" if cand.mother_name else "Guardian"),
                    is_primary_contact=True,
                )
            )

    roll_no = payload.rollNumber or f"{section.code}-{secrets.token_hex(2).upper()}"
    enrollment = StudentEnrollment(
        id=f"enr-{secrets.token_hex(8)}",
        student_id=sp.id,
        academic_year_id=batch.academic_year_id,
        class_id=app_obj.target_class_id,
        section_id=section.id,
        roll_number=roll_no,
        status="ACTIVE",
    )
    db.add(enrollment)

    receipt_no = None
    if payload.admissionFeePaid > 0:
        fs = (
            await db.execute(
                select(FeeStructure).where(
                    FeeStructure.class_id == app_obj.target_class_id,
                    FeeStructure.academic_year_id == batch.academic_year_id,
                )
            )
        ).scalar_one_or_none()
        if fs:
            receipt_no = f"REC-{datetime.now(timezone.utc).year}-{secrets.token_hex(3).upper()}"
            db.add(
                FeePayment(
                    id=f"fp-{secrets.token_hex(8)}",
                    receipt_no=receipt_no,
                    student_id=sp.id,
                    academic_year_id=batch.academic_year_id,
                    fee_structure_id=fs.id,
                    amount_paid=payload.admissionFeePaid,
                    payment_method=payload.paymentMethod,
                    reference_no=payload.paymentReference,
                    status="PAID",
                    cashier_user_id=current_user.id,
                    paid_at=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                )
            )


    bcls = (
        await db.execute(
            select(AdmissionBatchClass).where(
                AdmissionBatchClass.batch_id == batch.id,
                AdmissionBatchClass.class_id == app_obj.target_class_id,
            )
        )
    ).scalar_one_or_none()
    if bcls:
        bcls.seats_filled += 1

    now_iso = datetime.now(timezone.utc).isoformat()
    app_obj.status = "ENROLLED"
    fsl.admission_fee_status = "VERIFIED"
    fsl.allocated_section_id = section.id
    fsl.allocated_hostel_room_id = payload.hostelRoomId
    fsl.allocated_mess_plan_id = payload.messPlanId
    fsl.enrolled_student_profile_id = sp.id
    fsl.enrolled_at = now_iso
    fsl.enrolled_by_user_id = current_user.id

    db.add(
        AuditLog(
            id=f"aud-{secrets.token_hex(8)}",
            actor_user_id=current_user.id,
            action="CANDIDATE_ENROLLED_AS_STUDENT",
            target_type="STUDENT_PROFILE",
            target_id=sp.id,
            details=f"Converted application {app_obj.application_number} into Student {adm_no} in section {section.code}.",
        )
    )

    await db.commit()
    return ApiResponse(
        success=True,
        data={
            "studentProfileId": sp.id,
            "userId": new_user.id,
            "admissionNumber": adm_no,
            "rollNumber": roll_no,
            "sectionCode": section.code,
            "feeReceiptNo": receipt_no,
        },
        message=f"Candidate enrolled as official student ({adm_no}).",
    )
