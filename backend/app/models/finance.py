from typing import Optional
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class ExpenseCategory(Base, TimestampMixin):
    __tablename__ = "expense_categories"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    school_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[str] = mapped_column(String(32), ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    expense_date: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(32), default="BANK_TRANSFER", nullable=False)
    vendor_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    vendor_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reference_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    supporting_doc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recorded_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category = relationship("ExpenseCategory")
    recorded_by = relationship("User")


class StaffProfile(Base, TimestampMixin):
    """Personnel record for non-academic operational staff distinct from system user accounts"""
    __tablename__ = "staff_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role_category: Mapped[str] = mapped_column(String(64), nullable=False)  # Security, Office, Transport, Maintenance
    designation: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    department: Mapped[str] = mapped_column(String(64), default="Operations", nullable=False)
    monthly_salary: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    joining_date: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE", nullable=False)


class PayrollRecord(Base, TimestampMixin):
    __tablename__ = "payroll_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    staff_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    payroll_month: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # "2026-10"
    basic_salary: Mapped[float] = mapped_column(Float, nullable=False)
    allowances: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    deductions: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_salary: Mapped[float] = mapped_column(Float, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(16), default="PAID", nullable=False)  # PENDING, PAID
    paid_date: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(32), default="DIRECT_DEPOSIT", nullable=False)
    transaction_ref: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    processed_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    staff = relationship("StaffProfile")
    processor = relationship("User")
