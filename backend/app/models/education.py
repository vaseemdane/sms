from datetime import date, datetime, time
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


# =========================================================================
# 1. ACADEMIC TERMS & DAY ORDERS
# =========================================================================

class AcademicTerm(Base, TimestampMixin):
    __tablename__ = "academic_terms"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # e.g. 'Term 1 (Monsoon Semester)'
    code: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. 'TERM-1'
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    working_days: Mapped[List[str]] = mapped_column(
        JSON,
        default=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        nullable=False,
    )
    periods_per_day: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("academic_year_id", "code", name="uq_term_code_per_year"),
    )

    academic_year = relationship("AcademicYear")
    day_orders = relationship("DayOrder", back_populates="term", cascade="all, delete-orphan")
    master_slots = relationship("TimetableMasterSlot", back_populates="term", cascade="all, delete-orphan")


class DayOrder(Base):
    __tablename__ = "day_orders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    term_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("academic_terms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    day_order_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1=Monday .. 6=Saturday
    day_name: Mapped[str] = mapped_column(String(32), nullable=False)  # 'Monday'
    slot_definitions: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("term_id", "day_order_number", name="uq_day_order_per_term"),
    )

    term = relationship("AcademicTerm", back_populates="day_orders")


# =========================================================================
# 2. MASTER TIMETABLE SLOTS & TEACHER CHANGE REQUESTS
# =========================================================================

class TimetableMasterSlot(Base, TimestampMixin):
    __tablename__ = "timetable_master_slots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    term_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("academic_terms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    timetable_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("timetables.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False
    )
    day_of_week: Mapped[str] = mapped_column(String(16), nullable=False)  # 'Monday'
    period_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 .. 8
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # '09:00'
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)  # '09:45'
    slot_type: Mapped[str] = mapped_column(String(16), default="PERIOD", nullable=False)  # PERIOD, LAB, BREAK, REMEDIAL
    subject_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    teacher_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teacher_profiles.id", ondelete="SET NULL"), nullable=True
    )
    room_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_locked_by_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("term_id", "section_id", "day_of_week", "start_time", name="uq_master_slot_section"),
        Index("idx_tms_common_matrix", "term_id", "day_of_week", "period_index", "class_id", "section_id"),
        Index("idx_tms_teacher_view", "teacher_id", "term_id", "day_of_week", "start_time"),
    )

    term = relationship("AcademicTerm", back_populates="master_slots")
    timetable = relationship("Timetable")
    parent_class = relationship("Class")
    section = relationship("Section")
    subject = relationship("Subject")
    teacher = relationship("TeacherProfile")


class TimetableChangeRequest(Base):
    __tablename__ = "timetable_change_requests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    term_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("academic_terms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    request_type: Mapped[str] = mapped_column(String(32), nullable=False)  # EXTRA_REMEDIAL_CLASS, SLOT_SWAP, ROOM_CHANGE, SUBSTITUTE_REQUEST
    requesting_teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_slot_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("timetable_master_slots.id", ondelete="SET NULL"), nullable=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    proposed_day_of_week: Mapped[str] = mapped_column(String(16), nullable=False)
    proposed_start_time: Mapped[str] = mapped_column(String(8), nullable=False)
    proposed_end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    proposed_room: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    swap_with_teacher_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teacher_profiles.id", ondelete="SET NULL"), nullable=True
    )
    academic_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="PENDING_PRINCIPAL", nullable=False)  # PENDING_PRINCIPAL, APPROVED, REJECTED, CANCELLED
    reviewed_by_principal_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    principal_remarks: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_tcr_status", "status", "created_at"),
    )

    term = relationship("AcademicTerm")
    requesting_teacher = relationship("TeacherProfile", foreign_keys=[requesting_teacher_id])
    swap_with_teacher = relationship("TeacherProfile", foreign_keys=[swap_with_teacher_id])
    section = relationship("Section")
    subject = relationship("Subject")
    source_slot = relationship("TimetableMasterSlot")


# =========================================================================
# 3. ID GENERATION SEQUENCES & STUDENT SLOT PREFERENCES
# =========================================================================

class IdGenerationSequence(Base):
    __tablename__ = "id_generation_sequences"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    school_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("schools.id", ondelete="CASCADE"), index=True, nullable=False
    )
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)  # STUDENT_ADMISSION, STUDENT_ROLL, STAFF_EMP_CODE, PROJECT_CODE
    scope_code: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. '10A', 'NUR', 'FACULTY'
    prefix_template: Mapped[str] = mapped_column(String(64), nullable=False)  # '{SCHOOL}-{AY}-{SCOPE}-{SEQ:04d}'
    current_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("school_id", "academic_year_id", "entity_type", "scope_code", name="uq_id_seq_scope"),
    )

    school = relationship("School")
    academic_year = relationship("AcademicYear")


class StudentSlotPreference(Base, TimestampMixin):
    __tablename__ = "student_slot_preferences"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stream_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # SCIENCE_PCMB, COMMERCE, ARTS
    preferred_shift: Mapped[str] = mapped_column(String(24), default="MORNING_REGULAR", nullable=False)  # MORNING_REGULAR, AFTERNOON_SHIFT, DAY_BOARDING
    elective_subject_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    lab_batch_preference: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)  # BATCH_A, BATCH_B
    language_ii_subject_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    language_iii_subject_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    special_accommodation_notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_pref_per_year"),
        Index("idx_ssp_search", "academic_year_id", "class_id", "stream_code", "preferred_shift"),
    )

    student = relationship("StudentProfile")
    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    language_ii = relationship("Subject", foreign_keys=[language_ii_subject_id])
    language_iii = relationship("Subject", foreign_keys=[language_iii_subject_id])


# =========================================================================
# 4. ACADEMIC & RESEARCH PROJECTS
# =========================================================================

class AcademicProject(Base, TimestampMixin):
    __tablename__ = "academic_projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)  # PRJ-2026-10A-0012
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    project_title: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[str] = mapped_column(
        String(32), default="STUDENT_INDIVIDUAL", nullable=False
    )  # STUDENT_INDIVIDUAL, STUDENT_GROUP, FACULTY_RESEARCH, SCIENCE_EXHIBITION
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=True
    )
    subject_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    mentor_teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("teacher_profiles.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    student_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    abstract_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    followup_interval_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    next_followup_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="NOT_STARTED", nullable=False)  # NOT_STARTED, IN_PROGRESS, UNDER_REVIEW, COMPLETED, OVERDUE
    completion_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    repository_or_doc_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    mentor_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    grade_awarded: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    last_status_updated_by: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    last_status_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_proj_section_status", "section_id", "status", "deadline_date"),
        Index("idx_proj_mentor", "mentor_teacher_id", "status"),
    )

    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    section = relationship("Section")
    subject = relationship("Subject")
    mentor_teacher = relationship("TeacherProfile")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    followup_logs = relationship("ProjectFollowupLog", back_populates="project", cascade="all, delete-orphan")


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("academic_projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_teacher_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("teacher_profiles.id", ondelete="SET NULL"), nullable=True
    )

    project = relationship("AcademicProject", back_populates="milestones")
    verified_by_teacher = relationship("TeacherProfile")


class ProjectFollowupLog(Base):
    __tablename__ = "project_followup_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("academic_projects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    trigger_type: Mapped[str] = mapped_column(String(32), nullable=False)  # SCHEDULED_CRON, DEADLINE_APPROACHING_3D, MANUAL_MENTOR_NUDGE
    recipients_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    channel: Mapped[str] = mapped_column(String(24), nullable=False)  # EMAIL, WHATSAPP, IN_APP
    message_sent: Mapped[str] = mapped_column(Text, nullable=False)
    project_status_at_send: Mapped[str] = mapped_column(String(24), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("AcademicProject", back_populates="followup_logs")


# =========================================================================
# 5. SCHOOL EVENTS & PROGRAM ITINERARIES
# =========================================================================

from app.models.erp_operations import SchoolEvent


class EventProgramItinerary(Base):
    __tablename__ = "event_program_itineraries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("school_events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    itinerary_sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    program_title: Mapped[str] = mapped_column(String(255), nullable=False)
    program_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    stage_or_venue: Mapped[str] = mapped_column(String(150), nullable=False)
    participants_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    judge_or_incharge_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    equipment_requirements: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="SCHEDULED", nullable=False)  # SCHEDULED, LIVE, COMPLETED, DELAYED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_epi_venue_timeline", "event_id", "program_date", "stage_or_venue", "start_time", "end_time"),
    )

    event = relationship("SchoolEvent", back_populates="programs")
    judge_or_incharge = relationship("User", foreign_keys=[judge_or_incharge_id])
