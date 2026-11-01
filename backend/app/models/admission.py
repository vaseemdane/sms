import uuid
from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin
from app.core.security import EncryptedString


def gen_uuid_str() -> str:
    return str(uuid.uuid4())


class AdmissionConfig(Base, TimestampMixin):
    __tablename__ = "admission_configs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    admission_track: Mapped[str] = mapped_column(
        String(32), default="DIRECT_ADMISSION", nullable=False
    )  # DIRECT_ADMISSION | ASSESSMENT_REQUIRED
    require_previous_school_tc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    target_class = relationship("Class")
    academic_year = relationship("AcademicYear")
    eligibility = relationship("EligibilityCriteria", back_populates="config", uselist=False, cascade="all, delete-orphan")
    required_documents = relationship("RequiredDocumentMaster", back_populates="config", cascade="all, delete-orphan")


class EligibilityCriteria(Base, TimestampMixin):
    __tablename__ = "eligibility_criteria"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    config_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_configs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    min_age_years: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)
    max_age_years: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)
    age_cutoff_date: Mapped[str] = mapped_column(String(16), default="2026-06-01", nullable=False)
    min_previous_grade_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    required_previous_class: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    config = relationship("AdmissionConfig", back_populates="eligibility")


class RequiredDocumentMaster(Base, TimestampMixin):
    __tablename__ = "required_documents_master"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    config_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_configs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doc_code: Mapped[str] = mapped_column(String(32), nullable=False)  # BIRTH_CERT, TC, AADHAAR, CASTE_CERT, PHOTO, PREV_MARKSHEET
    doc_label: Mapped[str] = mapped_column(String(128), nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allowed_mime_types: Mapped[str] = mapped_column(String(128), default="application/pdf,image/jpeg,image/png", nullable=False)

    config = relationship("AdmissionConfig", back_populates="required_documents")


class AdmissionBatch(Base, TimestampMixin):
    __tablename__ = "admission_batches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    batch_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    school_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[str] = mapped_column(String(16), nullable=False)
    end_date: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", index=True, nullable=False)  # UPCOMING, OPEN, CLOSED
    application_fee: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    seat_capacity_per_class: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    created_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    class_quotas = relationship("AdmissionBatchClass", back_populates="batch", cascade="all, delete-orphan")


class AdmissionBatchClass(Base, TimestampMixin):
    __tablename__ = "admission_batch_classes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    batch_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_batches.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    seat_capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    seats_filled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waitlist_limit: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    __table_args__ = (
        UniqueConstraint("batch_id", "class_id", name="uq_batch_class_quota"),
    )

    batch = relationship("AdmissionBatch", back_populates="class_quotas")
    target_class = relationship("Class")


class CandidateProfile(Base, TimestampMixin):
    __tablename__ = "candidate_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    application_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(64), nullable=False)
    last_name: Mapped[str] = mapped_column(String(64), nullable=False)
    dob: Mapped[str] = mapped_column(String(16), nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    blood_group: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    caste_category: Mapped[Optional[str]] = mapped_column(EncryptedString(128), nullable=True)
    aadhaar_encrypted: Mapped[Optional[str]] = mapped_column(EncryptedString(255), nullable=True)
    aadhaar_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)

    father_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    mother_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    guardian_phone: Mapped[str] = mapped_column(EncryptedString(255), nullable=False)
    guardian_phone_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    guardian_email: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)

    state: Mapped[str] = mapped_column(String(64), default="Karnataka", nullable=False)
    district: Mapped[str] = mapped_column(String(64), nullable=False)
    pincode: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(EncryptedString(512), nullable=True)

    previous_school_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    previous_class: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    previous_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    portal_password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    applications = relationship("AdmissionApplication", back_populates="candidate", cascade="all, delete-orphan")


class AdmissionApplication(Base, TimestampMixin):
    __tablename__ = "admission_applications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    application_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    candidate_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    admission_batch_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_batches.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    target_class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False
    )

    admission_track: Mapped[str] = mapped_column(
        String(32), default="DIRECT_ADMISSION", index=True, nullable=False
    )  # DIRECT_ADMISSION | ASSESSMENT_REQUIRED
    status: Mapped[str] = mapped_column(
        String(32), default="DRAFT", index=True, nullable=False
    )  # DRAFT, SUBMITTED, UNDER_REVIEW, DIRECT_SELECTED, SHORTLISTED_FOR_ASSESSMENT, ASSESSMENT_COMPLETED, FINAL_SELECTED, WAITLISTED, REJECTED, ENROLLED

    app_fee_amount: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    app_fee_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)  # PENDING, PAID, WAIVED
    app_fee_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    app_fee_paid_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    requires_hostel: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    preferred_hostel_block_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("hostel_blocks.id", ondelete="SET NULL"), nullable=True
    )
    preferred_mess_plan_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("mess_plans.id", ondelete="SET NULL"), nullable=True
    )

    reviewer_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    candidate = relationship("CandidateProfile", back_populates="applications")
    batch = relationship("AdmissionBatch")
    target_class = relationship("Class")
    documents = relationship("ApplicationDocument", back_populates="application", cascade="all, delete-orphan")


class ApplicationDocument(Base, TimestampMixin):
    __tablename__ = "application_documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    application_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_applications.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doc_code: Mapped[str] = mapped_column(String(32), nullable=False)  # BIRTH_CERT, TC, AADHAAR, CASTE_CERT, PHOTO, PREV_MARKSHEET
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED
    verified_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    application = relationship("AdmissionApplication", back_populates="documents")


class AdmissionAssessment(Base, TimestampMixin):
    __tablename__ = "admission_assessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    admission_batch_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_batches.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    assessment_type: Mapped[str] = mapped_column(
        String(32), default="WRITTEN_TEST", nullable=False
    )  # WRITTEN_TEST, INTERVIEW, COMBINED
    assessment_date: Mapped[str] = mapped_column(String(16), nullable=False)
    start_time: Mapped[str] = mapped_column(String(16), default="10:00", nullable=False)
    venue_or_link: Mapped[str] = mapped_column(String(255), nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    passing_marks: Mapped[float] = mapped_column(Float, default=40.0, nullable=False)
    assigned_evaluator_staff_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="SCHEDULED", nullable=False)  # SCHEDULED, IN_PROGRESS, COMPLETED

    candidates = relationship("AssessmentCandidate", back_populates="assessment", cascade="all, delete-orphan")
    evaluator = relationship("User")
    target_class = relationship("Class")


class AssessmentCandidate(Base, TimestampMixin):
    __tablename__ = "assessment_candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    assessment_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_assessments.id", ondelete="CASCADE"), index=True, nullable=False
    )
    application_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_applications.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attendance_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)  # PENDING, PRESENT, ABSENT
    attendance_marked_by_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    attendance_marked_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    marks_obtained: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evaluation_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)  # PENDING, PASSED, FAILED
    evaluated_by_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    evaluated_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "application_id", name="uq_assessment_application"),
    )

    assessment = relationship("AdmissionAssessment", back_populates="candidates")
    application = relationship("AdmissionApplication")


class FinalSelectionList(Base, TimestampMixin):
    __tablename__ = "final_selection_list"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    application_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_applications.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    admission_batch_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("admission_batches.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    selection_source: Mapped[str] = mapped_column(String(32), nullable=False)  # DIRECT_ADMISSION | ASSESSMENT_CLEARED
    merit_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    intimation_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    intimation_sent_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    intimation_channel: Mapped[Optional[str]] = mapped_column(String(32), default="EMAIL_WHATSAPP", nullable=True)

    admission_fee_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)  # PENDING, VERIFIED
    admission_fee_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    admission_fee_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    allocated_section_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True
    )
    allocated_hostel_room_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("hostel_rooms.id", ondelete="SET NULL"), nullable=True
    )
    allocated_mess_plan_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("mess_plans.id", ondelete="SET NULL"), nullable=True
    )

    enrolled_student_profile_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="SET NULL"), nullable=True
    )
    enrolled_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    enrolled_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    application = relationship("AdmissionApplication")
    target_class = relationship("Class")
    allocated_section = relationship("Section")
    student_profile = relationship("StudentProfile")
