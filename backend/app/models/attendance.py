from typing import Optional
from sqlalchemy import Boolean, Date, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False)
    date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # "YYYY-MM-DD"
    
    # PRESENT, ABSENT, LATE, EXCUSED
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    recorded_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_student_daily_attendance"),
        # High-concurrency composite index for section attendance and % aggregation
        Index("idx_attendance_section_date_status", "section_id", "date", "status"),
    )

    student_profile = relationship("StudentProfile")
    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    section = relationship("Section")
    recorder = relationship("User")


class AcademicCalendarDay(Base, TimestampMixin):
    __tablename__ = "academic_calendar_days"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    calendar_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # "YYYY-MM-DD"
    day_type: Mapped[str] = mapped_column(
        String(32), default="WORKING_DAY", nullable=False
    )  # 'WORKING_DAY', 'HOLIDAY', 'WEEKEND', 'EXAM_DAY', 'EVENT_DAY'
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_attendance_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    override_day_of_week: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    target_class_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    created_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("academic_year_id", "calendar_date", "target_class_id", name="uq_cal_date_class"),
        Index("idx_cal_days_lookup", "academic_year_id", "calendar_date", "is_attendance_required"),
    )


class AttendanceSession(Base, TimestampMixin):
    __tablename__ = "attendance_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    attendance_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # "YYYY-MM-DD"
    session_mode: Mapped[str] = mapped_column(
        String(16), default="DAILY", nullable=False
    )  # 'DAILY' (Homeroom) | 'PERIOD' (Subject Teacher slot)
    subject_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    period_slot_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("timetable_slots.id", ondelete="SET NULL"), nullable=True
    )

    # Fast metrics
    total_enrolled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    present_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    absent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    half_day_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    excused_leave_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[str] = mapped_column(
        String(24), default="SUBMITTED", nullable=False
    )  # 'DRAFT', 'SUBMITTED', 'LOCKED', 'UNLOCKED_BY_PRINCIPAL'
    entry_source: Mapped[str] = mapped_column(
        String(24), default="WEB_PORTAL", nullable=False
    )  # 'WEB_PORTAL', 'MOBILE_APP', 'CSV_BULK_IMPORT', 'BIOMETRIC_SYNC'
    marked_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    last_modified_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    lock_expires_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    unlocked_by_principal_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    unlock_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    unlocked_until: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    __table_args__ = (
        UniqueConstraint("section_id", "attendance_date", "period_slot_id", name="uq_att_session_slot"),
        Index("idx_att_session_date_section", "attendance_date", "section_id", "status"),
        Index("idx_att_session_teacher", "marked_by_user_id", "attendance_date"),
    )

    section = relationship("Section")
    subject = relationship("Subject")
    marked_by_user = relationship("User", foreign_keys=[marked_by_user_id])
    records = relationship("StudentAttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class StudentAttendanceRecord(Base, TimestampMixin):
    __tablename__ = "student_attendance_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    subject_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    period_slot_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("timetable_slots.id", ondelete="SET NULL"), nullable=True
    )
    attendance_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)

    status: Mapped[str] = mapped_column(
        String(24), default="PRESENT", nullable=False
    )  # 'PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_APPROVED_LEAVE'
    attendance_credit: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    check_in_time: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    leave_request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recorded_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    updated_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "attendance_date", "period_slot_id", name="uq_student_date_period"),
        Index("idx_sar_section_month", "section_id", "attendance_date", "status"),
        Index("idx_sar_student_year", "student_id", "academic_year_id", "attendance_date", "status"),
    )

    session = relationship("AttendanceSession", back_populates="records")
    student_profile = relationship("StudentProfile")


class AttendanceAuditLog(Base, TimestampMixin):
    __tablename__ = "attendance_audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attendance_record_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_attendance_records.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    attendance_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    period_slot_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    previous_status: Mapped[str] = mapped_column(String(24), nullable=False)
    new_status: Mapped[str] = mapped_column(String(24), nullable=False)
    modification_reason: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    changed_by_role: Mapped[str] = mapped_column(String(32), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    __table_args__ = (
        Index("idx_att_audit_section_date", "section_id", "attendance_date"),
        Index("idx_att_audit_student", "student_id"),
    )


class AttendanceNotificationLog(Base, TimestampMixin):
    __tablename__ = "attendance_notification_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    attendance_record_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_attendance_records.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    recipient_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    recipient_role: Mapped[str] = mapped_column(String(16), nullable=False)  # 'PARENT' | 'STUDENT'
    notification_type: Mapped[str] = mapped_column(
        String(40), nullable=False
    )  # 'PARENT_ABSENCE_ALERT', 'PARENT_LATE_ALERT', 'STUDENT_MISSED_CLASSWORK_DIGEST'
    channel: Mapped[str] = mapped_column(String(24), default="IN_APP", nullable=False)  # 'WHATSAPP', 'SMS', 'EMAIL', 'IN_APP'
    delivery_status: Mapped[str] = mapped_column(
        String(24), default="QUEUED", nullable=False
    )  # 'QUEUED', 'GRACE_PERIOD_WAITING', 'CANCELLED_BY_CORRECTION', 'SENT', 'DELIVERED', 'FAILED'
    scheduled_send_at: Mapped[str] = mapped_column(String(32), nullable=False)
    sent_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    payload_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("attendance_record_id", "notification_type", "channel", name="uq_att_notif_idempotent"),
    )

