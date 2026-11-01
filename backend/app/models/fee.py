from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class FeeCategory(Base, TimestampMixin):
    __tablename__ = "fee_categories"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class FeeStructure(Base, TimestampMixin):
    __tablename__ = "fee_structures"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    academic_year_id: Mapped[str] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=False)
    class_id: Mapped[str] = mapped_column(String(32), ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False)
    stream_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("streams.id", ondelete="SET NULL"), index=True, nullable=True)
    fee_category_id: Mapped[str] = mapped_column(String(32), ForeignKey("fee_categories.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    term: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    due_date: Mapped[str] = mapped_column(String(16), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    fee_breakdown: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)  # JSON-encoded head breakdown
    total_yearly_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    academic_year = relationship("AcademicYear")
    parent_class = relationship("Class")
    stream = relationship("app.models.academic.Stream")
    fee_category = relationship("FeeCategory")


class FeePayment(Base, TimestampMixin):
    __tablename__ = "fee_payments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    receipt_no: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    academic_year_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("academic_years.id", ondelete="RESTRICT"), index=True, nullable=True)
    fee_structure_id: Mapped[str] = mapped_column(String(32), ForeignKey("fee_structures.id", ondelete="RESTRICT"), index=True, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False)  # CASH, UPI, CARD, NET_BANKING, CHEQUE
    reference_no: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="PAID", nullable=False)
    cashier_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    paid_at: Mapped[str] = mapped_column(String(32), nullable=False)

    __table_args__ = (
        Index("idx_fee_payment_student_year_created", "student_id", "academic_year_id", "created_at"),
    )

    student_profile = relationship("StudentProfile")
    academic_year = relationship("AcademicYear")
    fee_structure = relationship("FeeStructure")
    cashier = relationship("User")


class ReceiptSequence(Base, TimestampMixin):
    """Atomic counter table for REC-{YEAR}-{SEQ} guaranteed concurrency protection."""
    __tablename__ = "receipt_sequences"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. "rec-seq-2026"
    year: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)  # "2026"
    last_sequence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
