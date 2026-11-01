from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "ex-1"
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # "Mid-Term Examination 2026"
    term: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1, 2, 3
    start_date: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    academic_year = relationship("AcademicYear")


class GradeScale(Base, TimestampMixin):
    __tablename__ = "grade_scales"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "grd-1"
    class_type_id: Mapped[str] = mapped_column(String(32), ForeignKey("class_types.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(16), nullable=False)  # "A1", "A2", "B1"
    mark_from: Mapped[float] = mapped_column(Float, nullable=False)  # 91.0
    mark_to: Mapped[float] = mapped_column(Float, nullable=False)    # 100.0
    grade_point: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    remark: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    class_type = relationship("ClassType")


class ExamMark(Base, TimestampMixin):
    __tablename__ = "exam_marks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    exam_id: Mapped[str] = mapped_column(String(32), ForeignKey("exams.id", ondelete="CASCADE"), index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(32), ForeignKey("subjects.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="RESTRICT"), nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False)

    test_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)   # CA score (e.g. max 30)
    exam_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)   # Term score (e.g. max 70)
    total_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0 to 100
    grade_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("grade_scales.id", ondelete="SET NULL"), nullable=True)
    
    teacher_remark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    submitted_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT", nullable=False)  # DRAFT, SUBMITTED, PUBLISHED

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "subject_id", name="uq_student_exam_subject_mark"),
        # Covering index on (exam_id, student_id) for rapid student report card compilation
        Index("idx_exam_student_covering", "exam_id", "student_id"),
        # Composite index on (exam_id, subject_id, status) for teacher marks verification
        Index("idx_exam_subject_status", "exam_id", "subject_id", "status"),
        Index("idx_exam_section_subject", "exam_id", "section_id", "subject_id"),
    )

    exam = relationship("Exam")
    student_profile = relationship("StudentProfile")
    subject = relationship("Subject")
    grade = relationship("GradeScale")
    submitter = relationship("User")


class ScratchCard(Base, TimestampMixin):
    """Result scratch-card PIN verification for parent/student report card portal."""
    __tablename__ = "scratch_cards"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    times_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Max allowed 5
    user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="SET NULL"), nullable=True)
    user_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    user = relationship("User")
    student = relationship("StudentProfile")
