from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class TeacherProfile(Base, TimestampMixin):
    __tablename__ = "teacher_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(64), default="Teacher", nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    qualification: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    joining_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    user = relationship("User", back_populates="teacher_profile")
    assignments = relationship("TeacherAssignment", back_populates="teacher_profile", cascade="all, delete-orphan")


class TeacherAssignment(Base, TimestampMixin):
    __tablename__ = "teacher_assignments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(String(64), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=True)
    
    # CLASS_TEACHER or SUBJECT_TEACHER
    assignment_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        # Prevent assigning multiple teachers as Class Teacher for the same section in the same academic year
        Index(
            "uq_section_class_teacher_per_year",
            "academic_year_id",
            "section_id",
            unique=True,
            postgresql_where=(assignment_type == "CLASS_TEACHER"),
        ),
        # Prevent duplicate subject teacher assignment for the exact same subject + section + year + teacher
        UniqueConstraint(
            "teacher_id",
            "academic_year_id",
            "section_id",
            "subject_id",
            "assignment_type",
            name="uq_teacher_subject_assignment",
        ),
    )

    teacher_profile = relationship("TeacherProfile", back_populates="assignments")
    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    section = relationship("Section")
    subject = relationship("Subject")
