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
    __tablename__ = "brands"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    product_lines: Mapped[list["ProductLine"]] = relationship(back_populates="brand", cascade="all, delete-orphan")


class ProductLine(Base):
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
    
    brand: Mapped["Brand"] = relationship(back_populates="product_lines")
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="product_line", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_normalized: Mapped[str] = mapped_column(String(200), nullable=False)
    team: Mapped[Optional[str]] = mapped_column(String(100))
    position: Mapped[Optional[str]] = mapped_column(String(50))
    debut_year: Mapped[Optional[int]] = mapped_column(Integer)
    is_rookie: Mapped[bool] = mapped_column(Boolean, default=False)
    is_prospect: Mapped[bool] = mapped_column(Boolean, default=False)
    mlb_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="player")


class CardType(Base):
    __tablename__ = "card_types"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="card_type")


# ============================================
# CHECKLIST MODEL
# ============================================

class Checklist(Base):
    __tablename__ = "checklists"
    __table_args__ = (
        UniqueConstraint('product_line_id', 'card_number', 'parallel_name', name='uq_checklist_card'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_line_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_lines.id", ondelete="CASCADE"), nullable=False)
    card_number: Mapped[str] = mapped_column(String(50), nullable=False)
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("players.id"))
    player_name_raw: Mapped[Optional[str]] = mapped_column(String(200))
    card_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("card_types.id"))
    parallel_name: Mapped[Optional[str]] = mapped_column(String(100))
    serial_numbered: Mapped[Optional[int]] = mapped_column(Integer)
    is_autograph: Mapped[bool] = mapped_column(Boolean, default=False)  # Manufactured auto
    is_relic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rookie_card: Mapped[bool] = mapped_column(Boolean, default=False)
    is_short_print: Mapped[bool] = mapped_column(Boolean, default=False)
    team: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    product_line: Mapped["ProductLine"] = relationship(back_populates="checklists")
    player: Mapped[Optional["Player"]] = relationship(back_populates="checklists")
    card_type: Mapped[Optional["CardType"]] = relationship(back_populates="checklists")
    inventory_items: Mapped[list["Inventory"]] = relationship(back_populates="checklist", cascade="all, delete-orphan")
    purchase_items: Mapped[list["PurchaseItem"]] = relationship(back_populates="checklist")
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="checklist")
    consignment_items: Mapped[list["ConsignmentItem"]] = relationship(back_populates="checklist")
    grading_items: Mapped[list["GradingSubmissionItem"]] = relationship(back_populates="checklist")


# ============================================
# INVENTORY MODEL (Updated)
# ============================================

class Inventory(Base):
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
    grade_company: Mapped[Optional[str]] = mapped_column(String(20))
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    auto_grade: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Raw card condition (for non-slabbed)
    raw_condition: Mapped[str] = mapped_column(String(20), default="NM")
    
    # Storage & tracking
    storage_location: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Cost tracking
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    checklist: Mapped["Checklist"] = relationship(back_populates="inventory_items")
    
    # Items that resulted in this inventory
    source_consignment_items: Mapped[list["ConsignmentItem"]] = relationship(
        back_populates="source_inventory", 
        foreign_keys="ConsignmentItem.source_inventory_id"
    )
    target_consignment_items: Mapped[list["ConsignmentItem"]] = relationship(
        back_populates="target_inventory",
        foreign_keys="ConsignmentItem.target_inventory_id"
    )
    source_grading_items: Mapped[list["GradingSubmissionItem"]] = relationship(
        back_populates="source_inventory",
        foreign_keys="GradingSubmissionItem.source_inventory_id"
    )
    target_grading_items: Mapped[list["GradingSubmissionItem"]] = relationship(
        back_populates="target_inventory",
        foreign_keys="GradingSubmissionItem.target_inventory_id"
    )


# ============================================
# CONSIGNMENT MODELS
# ============================================

class Consigner(Base):
    __tablename__ = "consigners"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(200))
    default_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    payment_details: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    consignments: Mapped[list["Consignment"]] = relationship(back_populates="consigner")


class Consignment(Base):
    __tablename__ = "consignments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consigner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consigners.id", ondelete="RESTRICT"), nullable=False)
    
    reference_number: Mapped[Optional[str]] = mapped_column(String(100))
    date_sent: Mapped[date] = mapped_column(Date, nullable=False)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    expected_return_date: Mapped[Optional[date]] = mapped_column(Date)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='pending')
    
    total_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    fee_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    fee_paid_date: Mapped[Optional[date]] = mapped_column(Date)
    
    shipping_out_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_out_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    shipping_return_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_return_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    consigner: Mapped["Consigner"] = relationship(back_populates="consignments")
    items: Mapped[list["ConsignmentItem"]] = relationship(back_populates="consignment", cascade="all, delete-orphan")


class ConsignmentItem(Base):
    __tablename__ = "consignment_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("consignments.id", ondelete="CASCADE"), nullable=False)
    
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    source_inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    target_inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    fee_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='pending')
    date_signed: Mapped[Optional[date]] = mapped_column(Date)
    
    inscription: Mapped[Optional[str]] = mapped_column(Text)
    condition_notes: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    consignment: Mapped["Consignment"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship(back_populates="consignment_items")
    source_inventory: Mapped[Optional["Inventory"]] = relationship(
        back_populates="source_consignment_items",
        foreign_keys=[source_inventory_id]
    )
    target_inventory: Mapped[Optional["Inventory"]] = relationship(
        back_populates="target_consignment_items",
        foreign_keys=[target_inventory_id]
    )


# ============================================
# GRADING SUBMISSION MODELS
# ============================================

class GradingCompany(Base):
    __tablename__ = "grading_companies"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    service_levels: Mapped[list["GradingServiceLevel"]] = relationship(back_populates="grading_company")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="grading_company")


class GradingServiceLevel(Base):
    __tablename__ = "grading_service_levels"
    __table_args__ = (
        UniqueConstraint('grading_company_id', 'name', name='uq_service_level_company_name'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grading_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50))
    max_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    base_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    estimated_days: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    grading_company: Mapped["GradingCompany"] = relationship(back_populates="service_levels")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="service_level")


class GradingSubmission(Base):
    __tablename__ = "grading_submissions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grading_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id"), nullable=False)
    service_level_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("grading_service_levels.id"))
    
    submission_number: Mapped[Optional[str]] = mapped_column(String(100))
    reference_number: Mapped[Optional[str]] = mapped_column(String(100))
    
    date_submitted: Mapped[date] = mapped_column(Date, nullable=False)
    date_received: Mapped[Optional[date]] = mapped_column(Date)
    date_graded: Mapped[Optional[date]] = mapped_column(Date)
    date_shipped_back: Mapped[Optional[date]] = mapped_column(Date)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='preparing')
    
    total_declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    grading_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    shipping_return_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_return_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    insurance_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    total_cards: Mapped[int] = mapped_column(Integer, default=0)
    cards_graded: Mapped[int] = mapped_column(Integer, default=0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    grading_company: Mapped["GradingCompany"] = relationship(back_populates="submissions")
    service_level: Mapped[Optional["GradingServiceLevel"]] = relationship(back_populates="submissions")
    items: Mapped[list["GradingSubmissionItem"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class GradingSubmissionItem(Base):
    __tablename__ = "grading_submission_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_submissions.id", ondelete="CASCADE"), nullable=False)
    
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    source_inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    target_inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    
    line_number: Mapped[Optional[int]] = mapped_column(Integer)
    declared_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    fee_per_card: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    
    was_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='pending')
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    auto_grade: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    label_type: Mapped[Optional[str]] = mapped_column(String(50))
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    submission: Mapped["GradingSubmission"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship(back_populates="grading_items")
    source_inventory: Mapped[Optional["Inventory"]] = relationship(
        back_populates="source_grading_items",
        foreign_keys=[source_inventory_id]
    )
    target_inventory: Mapped[Optional["Inventory"]] = relationship(
        back_populates="target_grading_items",
        foreign_keys=[target_inventory_id]
    )


# ============================================
# FINANCIAL MODELS
# ============================================

class Purchase(Base):
    __tablename__ = "purchases"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    vendor: Mapped[Optional[str]] = mapped_column(String(200))
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100))
    total_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    # Card status at purchase
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_slabbed: Mapped[bool] = mapped_column(Boolean, default=False)
    grade_company: Mapped[Optional[str]] = mapped_column(String(20))
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    raw_condition: Mapped[str] = mapped_column(String(20), default="NM")
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    purchase: Mapped["Purchase"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship(back_populates="purchase_items")


class Sale(Base):
    __tablename__ = "sales"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(100))
    buyer_name: Mapped[Optional[str]] = mapped_column(String(200))
    order_number: Mapped[Optional[str]] = mapped_column(String(100))
    subtotal: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    shipping_charged: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    platform_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    payment_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    inventory_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inventory.id"))
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    # Card status at sale
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_slabbed: Mapped[bool] = mapped_column(Boolean, default=False)
    grade_company: Mapped[Optional[str]] = mapped_column(String(20))
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    
    cost_basis: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    sale: Mapped["Sale"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship(back_populates="sale_items")
