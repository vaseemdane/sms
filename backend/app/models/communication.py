from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    recipient_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)  # Null = broadcast
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="academic", nullable=False)  # academic, attendance, examination, announcement
    priority: Mapped[str] = mapped_column(String(16), default="normal", nullable=False)   # normal, high, urgent
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    recipient = relationship("User")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="normal", nullable=False)
    published_by_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_audience: Mapped[str] = mapped_column(String(64), default="All School", nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="General", nullable=False)
    attachment_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    attachment_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    publish_date: Mapped[str] = mapped_column(String(32), nullable=False)

    publisher = relationship("User")


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    actor_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # ATTENDANCE_MARKED, STUDY_MATERIAL_UPLOADED, etc.
    target_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # SECTION, MATERIAL, MARKS, PROFILE
    target_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    details: Mapped[str] = mapped_column(Text, nullable=False)

    actor = relationship("User")


class Dormitory(Base, TimestampMixin):
    __tablename__ = "dormitories"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
