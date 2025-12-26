"""
Card Inventory Database Models
==============================

Complete SQLAlchemy models for the card inventory system.
Includes is_first_bowman for tracking 1st Bowman cards.

Place in: backend/app/models.py
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    String, Integer, Text, Boolean, Date, DateTime, 
    Numeric, ForeignKey, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ============================================
# CORE REFERENCE MODELS
# ============================================

class Brand(Base):
    """Card brands (Topps, Bowman, Panini, etc.)"""
    __tablename__ = "brands"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product_lines: Mapped[list["ProductLine"]] = relationship(back_populates="brand", cascade="all, delete-orphan")


class ProductLine(Base):
    """Product lines (2024 Bowman Chrome, 2024 Topps Series 1, etc.)"""
    __tablename__ = "product_lines"
    __table_args__ = (
        UniqueConstraint('brand_id', 'name', 'year', name='uq_product_line_brand_name_year'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    release_date: Mapped[Optional[date]] = mapped_column(Date)
    sport: Mapped[str] = mapped_column(String(50), default="Baseball")
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    brand: Mapped["Brand"] = relationship(back_populates="product_lines")
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="product_line", cascade="all, delete-orphan")


class Player(Base):
    """Players - normalized for analytics and matching"""
    __tablename__ = "players"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_normalized: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    team: Mapped[Optional[str]] = mapped_column(String(100))
    position: Mapped[Optional[str]] = mapped_column(String(50))
    debut_year: Mapped[Optional[int]] = mapped_column(Integer)
    is_rookie: Mapped[bool] = mapped_column(Boolean, default=False)
    is_prospect: Mapped[bool] = mapped_column(Boolean, default=False)
    mlb_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="player")


class CardType(Base):
    """Card types (Base, Refractor, Auto, Relic, etc.)"""
    __tablename__ = "card_types"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50))  # 'base', 'parallel', 'insert', 'auto', 'relic'
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="card_type")


# ============================================
# CHECKLIST MODEL
# ============================================

class Checklist(Base):
    """Master checklist of all cards in a product line"""
    __tablename__ = "checklists"
    __table_args__ = (
        UniqueConstraint('product_line_id', 'card_number', 'set_name', name='uq_checklist_product_card_set'),
        Index('idx_checklist_player', 'player_id'),
        Index('idx_checklist_product_line', 'product_line_id'),
        Index('idx_checklist_first_bowman', 'is_first_bowman', postgresql_where='is_first_bowman = TRUE'),
        Index('idx_checklist_rookie', 'is_rookie_card', postgresql_where='is_rookie_card = TRUE'),
        Index('idx_checklist_auto', 'is_autograph', postgresql_where='is_autograph = TRUE'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_line_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_lines.id", ondelete="CASCADE"), nullable=False)
    
    # Card identification
    card_number: Mapped[str] = mapped_column(String(50), nullable=False)
    card_prefix: Mapped[Optional[str]] = mapped_column(String(20))  # e.g., "BP", "BCP", "CPA"
    card_suffix: Mapped[Optional[str]] = mapped_column(String(10))  # e.g., "A", "B"
    
    # Player info
    player_name_raw: Mapped[str] = mapped_column(String(200), nullable=False)
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("players.id"))
    team: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Card classification
    card_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("card_types.id"))
    set_name: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "Base", "Bowman Prospects", "Chrome Prospect Autographs"
    parallel_name: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "Refractor", "Gold /50"
    
    # Card attributes
    is_autograph: Mapped[bool] = mapped_column(Boolean, default=False)
    is_relic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rookie_card: Mapped[bool] = mapped_column(Boolean, default=False)
    is_first_bowman: Mapped[bool] = mapped_column(Boolean, default=False)  # 1st Bowman card for this player
    
    # Numbering
    serial_numbered: Mapped[Optional[int]] = mapped_column(Integer)  # e.g., 199 for /199
    
    # Raw data for reference
    raw_checklist_line: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product_line: Mapped["ProductLine"] = relationship(back_populates="checklists")
    player: Mapped[Optional["Player"]] = relationship(back_populates="checklists")
    card_type: Mapped[Optional["CardType"]] = relationship(back_populates="checklists")
    inventory_items: Mapped[list["Inventory"]] = relationship(back_populates="checklist", cascade="all, delete-orphan")


# ============================================
# INVENTORY MODEL
# ============================================

class Inventory(Base):
    """Inventory tracking - what cards you own"""
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint(
            'checklist_id', 'is_signed', 'is_slabbed', 
            'grade_company', 'grade_value', 'raw_condition',
            name='uq_inventory_card_status'
        ),
        CheckConstraint('quantity >= 0', name='ck_inventory_quantity_positive'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Card status
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_slabbed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Grading info (for slabbed cards)
    grade_company: Mapped[Optional[str]] = mapped_column(String(20))  # PSA, BGS, SGC
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))  # 10, 9.5, 9, etc.
    auto_grade: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Raw card condition (for non-slabbed)
    raw_condition: Mapped[str] = mapped_column(String(20), default="NM")
    
    # Storage & tracking
    storage_location: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Cost tracking - accumulates purchase + fees
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    checklist: Mapped["Checklist"] = relationship(back_populates="inventory_items")


# ============================================
# CONSIGNMENT MODELS
# ============================================

class Consigner(Base):
    """Autograph consigners/graphers"""
    __tablename__ = "consigners"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    default_fee_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    consignments: Mapped[list["Consignment"]] = relationship(back_populates="consigner", cascade="all, delete-orphan")


class Consignment(Base):
    """Consignment batches sent for autographs"""
    __tablename__ = "consignments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consigner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consigners.id", ondelete="CASCADE"), nullable=False)
    date_sent: Mapped[date] = mapped_column(Date, nullable=False)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, returned, partial
    total_cards: Mapped[int] = mapped_column(Integer, default=0)
    total_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    consigner: Mapped["Consigner"] = relationship(back_populates="consignments")
    items: Mapped[list["ConsignmentItem"]] = relationship(back_populates="consignment", cascade="all, delete-orphan")


class ConsignmentItem(Base):
    """Individual cards in a consignment"""
    __tablename__ = "consignment_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consignments.id", ondelete="CASCADE"), nullable=False)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    fee_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, signed, failed
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    consignment: Mapped["Consignment"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()


# ============================================
# GRADING MODELS
# ============================================

class GradingCompany(Base):
    """Grading companies (PSA, BGS, SGC, etc.)"""
    __tablename__ = "grading_companies"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    short_name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    service_levels: Mapped[list["GradingServiceLevel"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class GradingServiceLevel(Base):
    """Service levels for grading companies"""
    __tablename__ = "grading_service_levels"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    turnaround_days: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    company: Mapped["GradingCompany"] = relationship(back_populates="service_levels")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="service_level")


class GradingSubmission(Base):
    """Grading submission batches"""
    __tablename__ = "grading_submissions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id", ondelete="CASCADE"), nullable=False)
    service_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_service_levels.id"), nullable=False)
    submission_number: Mapped[Optional[str]] = mapped_column(String(100))
    date_submitted: Mapped[date] = mapped_column(Date, nullable=False)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="submitted")  # submitted, grading, shipped, received
    total_cards: Mapped[int] = mapped_column(Integer, default=0)
    total_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company: Mapped["GradingCompany"] = relationship(back_populates="submissions")
    service_level: Mapped["GradingServiceLevel"] = relationship(back_populates="submissions")
    items: Mapped[list["GradingSubmissionItem"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class GradingSubmissionItem(Base):
    """Individual cards in a grading submission"""
    __tablename__ = "grading_submission_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_submissions.id", ondelete="CASCADE"), nullable=False)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    grade_received: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    auto_grade_received: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    submission: Mapped["GradingSubmission"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()


# ============================================
# FINANCIAL MODELS
# ============================================

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