"""
Financial Models: Purchase, PurchaseItem, Sale, SaleItem

Features:
- Purchase/PurchaseItem: Standard purchase tracking
- Sale/SaleItem: Unified sales with eBay integration
- SaleItem.checklist_id is nullable for eBay imports without card-level linkage
- Sale has ebay_listing_sale_id and source fields for tracking eBay imports
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
    from .ebay import EbayListingSale


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
    condition: Mapped[str] = mapped_column(String(50), default="Raw")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    purchase: Mapped["Purchase"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()


class Sale(Base):
    """Sale records - unified for manual and eBay imports"""
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(100))  # eBay, COMC, MySlabs, etc.
    buyer_name: Mapped[Optional[str]] = mapped_column(String(200))
    order_number: Mapped[Optional[str]] = mapped_column(String(100))
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    platform_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    payment_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_collected: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # eBay integration fields
    ebay_listing_sale_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ebay_listing_sales.id"),
        nullable=True
    )
    source: Mapped[str] = mapped_column(String(50), default="manual")  # 'manual' or 'ebay_import'
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")
    ebay_listing_sale: Mapped[Optional["EbayListingSale"]] = relationship()


class SaleItem(Base):
    """Individual items in a sale - checklist_id nullable for eBay imports"""
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    # NULLABLE: Allows eBay imports without card-level linkage
    checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("checklists.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))  # For profit calculation
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    sale: Mapped["Sale"] = relationship(back_populates="items")
    checklist: Mapped[Optional["Checklist"]] = relationship()  # Optional for eBay imports
