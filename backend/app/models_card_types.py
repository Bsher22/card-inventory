"""
Card Types and Parallels Models
Additional SQLAlchemy models for card base types, parallel categories, and parallels
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    String, Integer, Boolean, Text, DateTime, Numeric,
    ForeignKey, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .database import Base

if TYPE_CHECKING:
    from .models import Checklist, Inventory


# ============================================
# CARD BASE TYPES
# ============================================

class CardBaseType(Base):
    """
    Base card types: Paper, Chrome, Mega, Sapphire
    These represent the fundamental card stock/format
    """
    __tablename__ = "card_base_types"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    
    # Relationships
    checklists: Mapped[List["Checklist"]] = relationship(
        back_populates="base_type",
        foreign_keys="Checklist.base_type_id"
    )
    inventory_items: Mapped[List["Inventory"]] = relationship(
        back_populates="base_type",
        foreign_keys="Inventory.base_type_id"
    )
    
    def __repr__(self) -> str:
        return f"<CardBaseType(name='{self.name}')>"


# ============================================
# PARALLEL CATEGORIES
# ============================================

class ParallelCategory(Base):
    """
    Categories to group parallels: Core, Patterned, Shimmer/Wave, etc.
    """
    __tablename__ = "parallel_categories"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    
    # Relationships
    parallels: Mapped[List["Parallel"]] = relationship(back_populates="category")
    
    def __repr__(self) -> str:
        return f"<ParallelCategory(name='{self.name}')>"


# ============================================
# PARALLELS
# ============================================

class Parallel(Base):
    """
    All parallel types: Refractor, Purple /250, Gold /50, SuperFractor 1/1, etc.
    """
    __tablename__ = "parallels"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("parallel_categories.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=False)
    print_run: Mapped[Optional[int]] = mapped_column(Integer)  # NULL = unnumbered
    is_numbered: Mapped[bool] = mapped_column(Boolean, default=True)
    is_one_of_one: Mapped[bool] = mapped_column(Boolean, default=False)
    pattern_description: Mapped[Optional[str]] = mapped_column(Text)
    year_introduced: Mapped[Optional[int]] = mapped_column(Integer)
    typical_source: Mapped[Optional[str]] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    
    # Relationships
    category: Mapped[Optional["ParallelCategory"]] = relationship(back_populates="parallels")
    inventory_items: Mapped[List["Inventory"]] = relationship(
        back_populates="parallel",
        foreign_keys="Inventory.parallel_id"
    )
    
    @property
    def display_name(self) -> str:
        """Returns display-friendly name with print run"""
        if self.print_run == 1:
            return f"{self.short_name} 1/1"
        elif self.print_run:
            return f"{self.short_name} /{self.print_run}"
        return self.short_name
    
    def __repr__(self) -> str:
        return f"<Parallel(name='{self.name}', print_run={self.print_run})>"


# ============================================
# CARD PREFIX MAPPINGS (for parsing)
# ============================================

class CardPrefixMapping(Base):
    """
    Maps card number prefixes to their meaning across products
    E.g., BCP- = Chrome Prospects in both Bowman and Bowman Chrome
    """
    __tablename__ = "card_prefix_mappings"
    __table_args__ = (
        UniqueConstraint('prefix', 'product_type', name='uq_prefix_product'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    card_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_autograph: Mapped[bool] = mapped_column(Boolean, default=False)
    is_prospect: Mapped[bool] = mapped_column(Boolean, default=True)
    base_type_name: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    def __repr__(self) -> str:
        return f"<CardPrefixMapping(prefix='{self.prefix}', product='{self.product_type}')>"


# ============================================
# INDEX DEFINITIONS
# ============================================

Index('idx_parallels_category', Parallel.category_id)
Index('idx_parallels_print_run', Parallel.print_run)
Index('idx_parallels_sort', Parallel.sort_order)