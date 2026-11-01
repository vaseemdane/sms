from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Timetable(Base, TimestampMixin):
    __tablename__ = "timetables"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False)
    section_id: Mapped[str] = mapped_column(String(32), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT", nullable=False)  # DRAFT, VALIDATED, PUBLISHED
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "section_id", name="uq_timetable_per_section_year"),
    )

    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    section = relationship("Section")
    slots = relationship("TimetableSlot", back_populates="timetable", cascade="all, delete-orphan")


class TimetableSlot(Base, TimestampMixin):
    __tablename__ = "timetable_slots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    timetable_id: Mapped[str] = mapped_column(String(64), ForeignKey("timetables.id", ondelete="CASCADE"), index=True, nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # Monday, Tuesday, ...
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)  # "08:30"
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)    # "09:15"
    slot_type: Mapped[str] = mapped_column(String(16), default="PERIOD", nullable=False)  # PERIOD, BREAK

    title: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)  # e.g. "Assembly"
    subject_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    teacher_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("teacher_profiles.id", ondelete="SET NULL"), index=True, nullable=True)
    room: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)

    __table_args__ = (
        # Anti-collision indexes for teacher schedule and room allocation
        Index("idx_slot_teacher_collision", "teacher_id", "day_of_week", "start_time", "end_time"),
        Index("idx_slot_room_collision", "room", "day_of_week", "start_time", "end_time"),
        UniqueConstraint("timetable_id", "day_of_week", "start_time", name="uq_timetable_slot_time"),
    )

    timetable = relationship("Timetable", back_populates="slots")
    subject = relationship("Subject")
    teacher = relationship("TeacherProfile")
