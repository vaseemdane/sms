import uuid
from datetime import date, datetime, time
from typing import List, Optional
from sqlalchemy import (
    String, Boolean, ForeignKey, Date, Time, DateTime, Integer,
    Numeric, Text, UniqueConstraint, Index, JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


def gen_uuid_str() -> str:
    return str(uuid.uuid4())


# ============================================================================
# SUB-SYSTEM 1: ACADEMIC CALENDAR & DAY ORDERS (PRINCIPAL CONTROLLED)
# ============================================================================
class AcademicCalendarEvent(Base, TimestampMixin):
    __tablename__ = "academic_calendar_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # HOLIDAY, EXAM_WINDOW, PTA_MEETING, SPORTS_DAY, CULTURAL_DAY, WORKING_DAY_OVERRIDE
    start_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    end_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    override_day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_class_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


# ============================================================================
# SUB-SYSTEM 2: TEACHER CLASSROOM, LESSON NOTES & EXAM SCHEDULES
# ============================================================================
class LessonNote(Base, TimestampMixin):
    __tablename__ = "lesson_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    unit_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    topic_title: Mapped[str] = mapped_column(String(255), nullable=False)
    lesson_summary: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    reference_link: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    syllabus_completion_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )


class ExamSchedule(Base, TimestampMixin):
    __tablename__ = "exam_schedules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    exam_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exam_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    room: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    max_marks: Mapped[float] = mapped_column(Numeric(5, 2), default=100.00, nullable=False)
    passing_marks: Mapped[float] = mapped_column(Numeric(5, 2), default=35.00, nullable=False)

    __table_args__ = (
        UniqueConstraint("exam_id", "class_id", "subject_id", name="uq_exam_schedule_class_subject"),
    )


# ============================================================================
# SUB-SYSTEM 3: STAFF ATTENDANCE & STUDENT/STAFF LEAVE PORTAL
# ============================================================================
class StaffAttendance(Base, TimestampMixin):
    __tablename__ = "staff_attendance"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    staff_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # PRESENT, ABSENT, LATE, ON_LEAVE
    check_in_time: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    check_out_time: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    recorded_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("staff_user_id", "date", name="uq_staff_attendance_per_date"),
    )


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    applicant_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=True
    )
    leave_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # SICK, CASUAL, MEDICAL, FAMILY_EVENT, OFFICIAL_DUTY
    start_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    end_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", index=True, nullable=False
    )  # PENDING, APPROVED, REJECTED
    reviewed_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_remarks: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ============================================================================
# SUB-SYSTEM 4: FIELD TRIPS, DIGITAL PARENT CONSENTS, EVENTS & PTA
# ============================================================================
class FieldTrip(Base, TimestampMixin):
    __tablename__ = "field_trips"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    itinerary: Mapped[str] = mapped_column(Text, nullable=False)
    trip_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    return_date: Mapped[str] = mapped_column(String(16), nullable=False)
    consent_deadline: Mapped[str] = mapped_column(String(16), nullable=False)
    cost_per_student: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    coordinator_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), default="PENDING_APPROVAL", nullable=False
    )  # PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED
    approved_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class FieldTripConsent(Base, TimestampMixin):
    __tablename__ = "field_trip_consents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    field_trip_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("field_trips.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    consent_status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING, APPROVED, DECLINED
    digital_signature_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    medical_notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("field_trip_id", "student_id", name="uq_trip_student_consent"),
    )


class SchoolEvent(Base, TimestampMixin):
    __tablename__ = "school_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # CULTURAL, SPORTS, SCIENCE_FAIR, ANNUAL_DAY, WORKSHOP
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    venue: Mapped[str] = mapped_column(String(200), nullable=False)
    coordinator_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    target_class_ids: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="PUBLISHED", nullable=False)
    approved_by_principal_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    programs = relationship("EventProgramItinerary", back_populates="event", cascade="all, delete-orphan")


class StudentExtracurricular(Base, TimestampMixin):
    __tablename__ = "student_extracurriculars"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("school_events.id", ondelete="SET NULL"), index=True, nullable=True
    )
    activity_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # SPORTS, ARTS, DEBATE, MUSIC, OLYMPIAD, COMMUNITY_SERVICE
    participation_date: Mapped[str] = mapped_column(String(16), nullable=False)
    achievement_position: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # 1ST_PLACE, 2ND_PLACE, 3RD_PLACE, FINALIST, PARTICIPANT
    remarks: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    certificate_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    recorded_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class PTAMeeting(Base, TimestampMixin):
    __tablename__ = "pta_meetings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    class_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=True
    )
    section_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    agenda: Mapped[str] = mapped_column(Text, nullable=False)
    meeting_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    venue_or_link: Mapped[str] = mapped_column(String(500), nullable=False)
    organized_by_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class PTARsvp(Base, TimestampMixin):
    __tablename__ = "pta_rsvps"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    pta_meeting_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("pta_meetings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False
    )
    rsvp_status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # ATTENDING, NOT_ATTENDING, MAYBE
    notes: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    responded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("pta_meeting_id", "parent_user_id", "student_id", name="uq_pta_parent_rsvp"),
    )


class VolunteerOpportunity(Base, TimestampMixin):
    __tablename__ = "volunteer_opportunities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    event_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("school_events.id", ondelete="CASCADE"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    opportunity_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    slots_needed: Mapped[int] = mapped_column(Integer, default=10, nullable=False)


class ParentVolunteer(Base, TimestampMixin):
    __tablename__ = "parent_volunteers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    opportunity_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("volunteer_opportunities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False
    )
    role_preference: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("opportunity_id", "parent_user_id", name="uq_volunteer_parent_slot"),
    )


# ============================================================================
# SUB-SYSTEM 5: 360° TEACHER EVALUATIONS (PRINCIPAL & SUPER_ADMIN EYES ONLY)
# ============================================================================
class TeacherEvaluation(Base, TimestampMixin):
    __tablename__ = "teacher_evaluations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=gen_uuid_str)
    academic_year_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("academic_years.id", ondelete="CASCADE"), index=True, nullable=False
    )
    term: Mapped[str] = mapped_column(String(50), default="TERM_1", nullable=False)
    teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False
    )
    evaluator_user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    evaluator_role: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # STUDENT, PARENT
    rating_clarity: Mapped[int] = mapped_column(Integer, nullable=False)       # 1 to 5
    rating_punctuality: Mapped[int] = mapped_column(Integer, nullable=False)   # 1 to 5
    rating_engagement: Mapped[int] = mapped_column(Integer, nullable=False)    # 1 to 5
    rating_support: Mapped[int] = mapped_column(Integer, nullable=False)       # 1 to 5
    overall_rating: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    constructive_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "academic_year_id", "term", "teacher_id", "subject_id", "evaluator_user_id",
            name="uq_teacher_eval_per_term_user"
        ),
    )
