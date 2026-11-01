from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin
from app.core.security import EncryptedString


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    admission_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    # Sensitive PII Field-Level Encryption & Blind Indexing
    sats_id: Mapped[Optional[str]] = mapped_column(EncryptedString(255), nullable=True)  # Karnataka SATS identifier encrypted
    sats_id_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)  # Deterministic blind index
    caste_category: Mapped[Optional[str]] = mapped_column(EncryptedString(128), nullable=True)  # Encrypted minor demographic PII

    current_academic_year_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("academic_years.id"), nullable=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    dorm_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    dorm_room_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    hostel_room_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("hostel_rooms.id", ondelete="SET NULL"), nullable=True)
    mess_plan_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("mess_plans.id", ondelete="SET NULL"), nullable=True)
    is_graduated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    graduated_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="student_profile")
    parent = relationship("User", foreign_keys=[parent_id])
    enrollments = relationship("StudentEnrollment", back_populates="student_profile", cascade="all, delete-orphan")
    hostel_room = relationship("HostelRoom", foreign_keys=[hostel_room_id])
    mess_plan = relationship("MessPlan", foreign_keys=[mess_plan_id])


class StudentEnrollment(Base, TimestampMixin):
    __tablename__ = "student_enrollments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="RESTRICT"), index=True, nullable=False)
    stream_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("streams.id", ondelete="SET NULL"), index=True, nullable=True)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False)
    roll_number: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, PROMOTED, RETAINED, GRADUATED

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_enrollment_per_year"),
        Index("idx_enrollment_section_year", "section_id", "academic_year_id"),
        # High-concurrency partial composite index for active student lookups
        Index(
            "idx_enrollment_active_lookup",
            "academic_year_id",
            "class_id",
            "section_id",
            postgresql_where=(status == "ACTIVE"),
        ),
    )

    student_profile = relationship("StudentProfile", back_populates="enrollments")
    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    stream = relationship("app.models.academic.Stream")
    section = relationship("Section", back_populates="enrollments")


class ParentChildLink(Base, TimestampMixin):
    __tablename__ = "parent_child_links"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parent_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    student_profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(32), default="Parent", nullable=False)  # Father, Mother, Guardian
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("parent_user_id", "student_profile_id", name="uq_parent_student_link"),
    )

    parent_user = relationship("User")
    student_profile = relationship("StudentProfile")
