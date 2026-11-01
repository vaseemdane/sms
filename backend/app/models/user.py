from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin
from app.core.security import EncryptedString, generate_family_id


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    user_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # super_admin, principal, manager, admin, teacher, student, parent, accountant
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    role_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True, index=True)
    school_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True, index=True)

    # Field-Level Encrypted PII
    phone: Mapped[Optional[str]] = mapped_column(EncryptedString(255), nullable=True)
    phone_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)  # Deterministic HMAC-SHA256 blind index
    address: Mapped[Optional[str]] = mapped_column(EncryptedString(512), nullable=True)

    gender: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(64), default="Karnataka", nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, foreign_keys="StudentProfile.user_id", cascade="all, delete-orphan")
    school = relationship("School", foreign_keys=[school_id])
    role_rel = relationship("Role", back_populates="users", foreign_keys=[role_id])


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    family_id: Mapped[str] = mapped_column(String(64), index=True, default=generate_family_id, nullable=False)  # Token family reuse detection
    replaced_by_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")
