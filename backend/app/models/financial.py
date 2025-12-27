"""
Financial Models: Purchase, PurchaseItem, Sale, SaleItem
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .checklists import Checklist


class Purchase(Base):
    """Purchase records"""
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    vendor: Mapped[Optional[str]] = mapped_column(String(200))
    platform: Mapped[Optional[str]] = mapped_column(String(100))  # eBay, LCS, Show, etc.
    order_number: Mapped[Optional[str]] = mapped_column(String(100))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    """Individual items in a purchase"""
    __tablename__ = "purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    condition: Mapped[str] = mapped_column(String(20), default="NM")
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    purchase: Mapped["Purchase"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()


class Sale(Base):
    """Sale records"""
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)  # eBay, COMC, MySlabs, etc.
    buyer_name: Mapped[Optional[str]] = mapped_column(String(200))
    order_number: Mapped[Optional[str]] = mapped_column(String(100))
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    platform_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    payment_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_collected: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    """Individual items in a sale"""
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    cost_basis: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)  # For profit calculation
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    sale: Mapped["Sale"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()
