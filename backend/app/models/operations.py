from typing import Optional
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # Stationery, IT, Maintenance, Uniform
    gst_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    outstanding_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class VendorPayment(Base, TimestampMixin):
    __tablename__ = "vendor_payments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    vendor_id: Mapped[str] = mapped_column(String(64), ForeignKey("vendors.id", ondelete="CASCADE"), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_date: Mapped[str] = mapped_column(String(16), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(32), default="NEFT_RTGS", nullable=False)
    invoice_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reference_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    recorded_by_user_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    vendor = relationship("Vendor")


class SchoolAsset(Base, TimestampMixin):
    __tablename__ = "school_assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    asset_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # Computer, Furniture, Lab Equipment, Sports
    location: Mapped[str] = mapped_column(String(64), nullable=False)  # Science Lab 1, Library, Block A-101
    purchase_date: Mapped[str] = mapped_column(String(16), nullable=False)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    condition: Mapped[str] = mapped_column(String(32), default="Good", nullable=False)  # Good, Needs Repair, Damaged


class InventoryItem(Base, TimestampMixin):
    __tablename__ = "inventory_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    item_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # Stationery, Uniform, Books, Cleaning
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="Pieces", nullable=False)  # Boxes, Pieces, Reams
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
