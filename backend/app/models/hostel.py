from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class HostelBlock(Base, TimestampMixin):
    __tablename__ = "hostel_blocks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    gender: Mapped[str] = mapped_column(String(16), default="Co-Ed", nullable=False)  # Boys, Girls, Co-Ed
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rooms = relationship("HostelRoom", back_populates="hostel_block", cascade="all, delete-orphan")


class HostelRoom(Base, TimestampMixin):
    __tablename__ = "hostel_rooms"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hostel_id: Mapped[str] = mapped_column(String(64), ForeignKey("hostel_blocks.id", ondelete="CASCADE"), index=True, nullable=False)
    room_number: Mapped[str] = mapped_column(String(32), nullable=False)
    room_type: Mapped[str] = mapped_column(String(64), default="2-Sharing", nullable=False)  # Dormitory, 2-Sharing, AC Single
    capacity: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    occupied: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    annual_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("hostel_id", "room_number", name="uq_hostel_room_no"),
    )

    hostel_block = relationship("HostelBlock", back_populates="rooms")


class MessPlan(Base, TimestampMixin):
    __tablename__ = "mess_plans"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)  # Vegetarian Standard, Non-Veg Deluxe
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    annual_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    meal_schedule: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
