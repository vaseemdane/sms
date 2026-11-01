from typing import Optional
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin


class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    affiliation_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    board: Mapped[str] = mapped_column(String(32), default="CBSE", nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(64), default="Karnataka", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
