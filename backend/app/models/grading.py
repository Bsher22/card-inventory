"""
Grading & Authentication Models

Separates:
- Card Grading (PSA, BGS, SGC) - numeric grades
- Authentication (PSA/DNA, JSA) - signature verification
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from sqlalchemy import (
    String, Text, Integer, Boolean, Date, DateTime,
    Numeric, ForeignKey, CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


# ============================================
# GRADING COMPANIES (shared by both systems)
# ============================================

class GradingCompany(Base):
    """Companies that provide grading or authentication services."""
    __tablename__ = "grading_companies"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(200))
    service_type: Mapped[str] = mapped_column(
        String(20), 
        default="grading",
        comment="grading, authentication, or both"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    service_levels: Mapped[List["GradingServiceLevel"]] = relationship(back_populates="company", lazy="selectin")


class GradingServiceLevel(Base):
    """Service levels offered by grading/auth companies."""
    __tablename__ = "grading_service_levels"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    company_id: Mapped[UUID] = mapped_column(ForeignKey("grading_companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(20))
    max_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    base_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    estimated_days: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    company: Mapped["GradingCompany"] = relationship(back_populates="service_levels")


# ============================================
# CARD GRADING (Numeric grades - PSA 10, BGS 9.5)
# ============================================

class CardGradingSubmission(Base):
    """Submission of cards for numeric grading."""
    __tablename__ = "card_grading_submissions"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    
    # Company & Service
    company_id: Mapped[UUID] = mapped_column(ForeignKey("grading_companies.id"), nullable=False)
    service_level_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("grading_service_levels.id"))
    
    # Identifiers
    submission_number: Mapped[Optional[str]] = mapped_column(String(50))
    reference_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Dates
    date_submitted: Mapped[date] = mapped_column(Date, nullable=False)
    date_shipped: Mapped[Optional[date]] = mapped_column(Date)
    date_received: Mapped[Optional[date]] = mapped_column(Date)
    date_graded: Mapped[Optional[date]] = mapped_column(Date)
    date_shipped_back: Mapped[Optional[date]] = mapped_column(Date)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    
    # Status
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        comment="pending, shipped, received, grading, shipped_back, returned, cancelled"
    )
    
    # Costs
    grading_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    shipping_return_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_return_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    insurance_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Counts & Totals
    total_cards: Mapped[int] = mapped_column(Integer, default=0)
    cards_graded: Mapped[int] = mapped_column(Integer, default=0)
    total_declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company: Mapped["GradingCompany"] = relationship(lazy="selectin")
    service_level: Mapped[Optional["GradingServiceLevel"]] = relationship(lazy="selectin")
    items: Mapped[List["CardGradingItem"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class CardGradingItem(Base):
    """Individual card in a grading submission."""
    __tablename__ = "card_grading_items"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("card_grading_submissions.id", ondelete="CASCADE"), nullable=False)
    
    # Link to inventory
    inventory_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("inventory.id"))
    checklist_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("checklists.id"))
    
    # Item details
    line_number: Mapped[Optional[int]] = mapped_column(Integer)
    declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    fee_per_card: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    
    # Pre-submission state
    was_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Results
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        comment="pending, graded, authentic, altered, counterfeit, ungradeable, lost"
    )
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))  # 10, 9.5, 9
    auto_grade: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))   # Auto grade for signed
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    label_type: Mapped[Optional[str]] = mapped_column(String(30))  # standard, tuxedo, green
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    submission: Mapped["CardGradingSubmission"] = relationship(back_populates="items")
    inventory: Mapped[Optional["Inventory"]] = relationship(lazy="selectin")
    checklist: Mapped[Optional["Checklist"]] = relationship(lazy="selectin")


# ============================================
# AUTHENTICATION (Signature verification)
# ============================================

class AuthSubmission(Base):
    """Submission for signature authentication."""
    __tablename__ = "auth_submissions"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    
    # Company & Service
    company_id: Mapped[UUID] = mapped_column(ForeignKey("grading_companies.id"), nullable=False)
    service_level_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("grading_service_levels.id"))
    
    # Identifiers
    submission_number: Mapped[Optional[str]] = mapped_column(String(50))
    reference_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Dates
    date_submitted: Mapped[date] = mapped_column(Date, nullable=False)
    date_shipped: Mapped[Optional[date]] = mapped_column(Date)
    date_received: Mapped[Optional[date]] = mapped_column(Date)
    date_completed: Mapped[Optional[date]] = mapped_column(Date)
    date_shipped_back: Mapped[Optional[date]] = mapped_column(Date)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    
    # Status
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        comment="pending, shipped, received, processing, shipped_back, returned, cancelled"
    )
    
    # Costs
    authentication_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_to_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    shipping_return_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_return_tracking: Mapped[Optional[str]] = mapped_column(String(100))
    insurance_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Counts & Totals
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    items_authenticated: Mapped[int] = mapped_column(Integer, default=0)
    total_declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company: Mapped["GradingCompany"] = relationship(lazy="selectin")
    service_level: Mapped[Optional["GradingServiceLevel"]] = relationship(lazy="selectin")
    items: Mapped[List["AuthSubmissionItem"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class AuthSubmissionItem(Base):
    """Individual item in an authentication submission."""
    __tablename__ = "auth_submission_items"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("auth_submissions.id", ondelete="CASCADE"), nullable=False)
    
    # Item type
    item_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="card, memorabilia, collectible"
    )
    
    # Foreign keys (one populated based on item_type)
    inventory_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("inventory.id"))  # For cards
    standalone_item_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("standalone_items.id"))  # For memorabilia/collectibles
    
    # Item details
    line_number: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(Text)
    signer_name: Mapped[Optional[str]] = mapped_column(String(200))
    declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    fee_per_item: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    
    # Results
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        comment="pending, authentic, not_authentic, inconclusive, lost"
    )
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))    # PSA/DNA cert
    sticker_number: Mapped[Optional[str]] = mapped_column(String(50))  # JSA sticker
    letter_number: Mapped[Optional[str]] = mapped_column(String(50))   # LOA number
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    submission: Mapped["AuthSubmission"] = relationship(back_populates="items")
    inventory: Mapped[Optional["Inventory"]] = relationship(lazy="selectin")
    standalone_item: Mapped[Optional["StandaloneItem"]] = relationship(lazy="selectin")

    __table_args__ = (
        CheckConstraint(
            "(item_type = 'card' AND inventory_id IS NOT NULL) OR "
            "(item_type IN ('memorabilia', 'collectible') AND standalone_item_id IS NOT NULL)",
            name="auth_item_reference_check"
        ),
    )


# Forward references for relationships
from app.models.inventory import Inventory
from app.models.checklists import Checklist
from app.models.standalone_items import StandaloneItem
