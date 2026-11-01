from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class AcademicYear(Base, TimestampMixin):
    __tablename__ = "academic_years"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. "ay-2026-2027"
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # "2026-2027"
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)  # "2026-27"
    start_date: Mapped[str] = mapped_column(String(16), nullable=False)  # "2026-06-01"
    end_date: Mapped[str] = mapped_column(String(16), nullable=False)  # "2027-04-30"
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        # Enforces exactly zero or one active academic year across the system
        Index(
            "uq_single_active_academic_year",
            "is_current",
            unique=True,
            sqlite_where=(is_current == True),
            postgresql_where=(is_current == True),
        ),
    )


class Stream(Base, TimestampMixin):
    __tablename__ = "streams"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. "str-science", "str-commerce", "str-arts"
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # "Science", "Commerce", "Arts"
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)  # "SCI", "COMM", "ARTS"
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ClassType(Base, TimestampMixin):
    __tablename__ = "class_types"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "ct-1"
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # "Secondary (Class 9-10)"
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)  # "SEC"
    category: Mapped[str] = mapped_column(String(32), nullable=False)  # NURSERY, PRIMARY, SECONDARY, HIGHER_SECONDARY

    classes = relationship("Class", back_populates="class_type")


class Class(Base, TimestampMixin):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "cls-10"
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # "Class 10"
    class_type_id: Mapped[str] = mapped_column(String(32), ForeignKey("class_types.id", ondelete="RESTRICT"), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    has_streams: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # True for Class 11 & 12
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    academic_year_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)

    class_type = relationship("ClassType", back_populates="classes")
    sections = relationship("Section", back_populates="parent_class", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="parent_class", cascade="all, delete-orphan")


class Section(Base, TimestampMixin):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "sec-10a"
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False)
    stream_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("streams.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # "Section A"
    code: Mapped[str] = mapped_column(String(16), nullable=False)  # "10A" or "11-SCI-A"
    capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    room_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    academic_year_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("class_id", "stream_id", "name", name="uq_class_stream_section_name"),
    )

    parent_class = relationship("Class", back_populates="sections")
    stream = relationship("Stream")
    enrollments = relationship("StudentEnrollment", back_populates="section")


class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "sub-1"
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # "Mathematics"
    slug: Mapped[str] = mapped_column(String(64), nullable=False)  # "mathematics"
    code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # "MATH101"
    is_core: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("class_id", "slug", name="uq_class_subject_slug"),
    )

    parent_class = relationship("Class", back_populates="subjects")
