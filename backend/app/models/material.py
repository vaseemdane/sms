from datetime import datetime
from typing import List, Optional
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class StudyMaterial(Base, TimestampMixin):
    __tablename__ = "study_materials"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(64), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(32), ForeignKey("subjects.id", ondelete="RESTRICT"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[str] = mapped_column(String(32), nullable=False)
    file_type: Mapped[str] = mapped_column(String(64), nullable=False)

    teacher = relationship("TeacherProfile")
    subject = relationship("Subject")
    target_sections = relationship("StudyMaterialTarget", back_populates="material", cascade="all, delete-orphan")


class StudyMaterialTarget(Base):
    __tablename__ = "study_material_targets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    material_id: Mapped[str] = mapped_column(String(64), ForeignKey("study_materials.id", ondelete="CASCADE"), index=True, nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False)

    material = relationship("StudyMaterial", back_populates="target_sections")
    section = relationship("Section")


class Assignment(Base, TimestampMixin):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(64), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(32), ForeignKey("subjects.id", ondelete="RESTRICT"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[str] = mapped_column(String(32), nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    attachment_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    attachment_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    teacher = relationship("TeacherProfile")
    subject = relationship("Subject")
    target_sections = relationship("AssignmentTarget", back_populates="assignment", cascade="all, delete-orphan")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentTarget(Base):
    __tablename__ = "assignment_targets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    assignment_id: Mapped[str] = mapped_column(String(64), ForeignKey("assignments.id", ondelete="CASCADE"), index=True, nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False)

    assignment = relationship("Assignment", back_populates="target_sections")
    section = relationship("Section")


class AssignmentSubmission(Base, TimestampMixin):
    __tablename__ = "assignment_submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    assignment_id: Mapped[str] = mapped_column(String(64), ForeignKey("assignments.id", ondelete="CASCADE"), index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    
    storage_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="SUBMITTED", nullable=False)  # PENDING, SUBMITTED, LATE, GRADED
    obtained_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(String(32), nullable=True)
    graded_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student_profile = relationship("StudentProfile")
