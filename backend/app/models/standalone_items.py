"""
Standalone Items Models

For non-card inventory items: memorabilia, collectibles, apparel, etc.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .inventory import Inventory


class ItemCategory(Base):
    """Categories for inventory items: Cards, Memorabilia, Collectibles"""
    __tablename__ = "item_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    standalone_items: Mapped[list["StandaloneItem"]] = relationship(back_populates="category")


class StandaloneItem(Base):
    """
    Standalone inventory items that don't belong to a card checklist.
    
    Examples:
    - Memorabilia: Signed baseballs, game-used jerseys, autographed photos
    - Collectibles: Diecasts, bobbleheads, SGA items, Savannah Bananas gear
    """
    __tablename__ = "standalone_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("item_categories.id", ondelete="RESTRICT"), nullable=False)
    
    # Core identification
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    sport: Mapped[str] = mapped_column(String(50), default="Baseball", nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(200))
    year: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Person/Team association
    player_name: Mapped[Optional[str]] = mapped_column(String(200))
    team: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Authentication (for signed items)
    is_authenticated: Mapped[bool] = mapped_column(Boolean, default=False)
    authenticator: Mapped[Optional[str]] = mapped_column(String(50))  # PSA/DNA, JSA, Beckett Auth
    cert_number: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Physical attributes
    item_type: Mapped[Optional[str]] = mapped_column(String(100))  # Baseball, Jersey, Photo, Diecast
    size: Mapped[Optional[str]] = mapped_column(String(50))         # XL, 8x10, 1/64 scale
    color: Mapped[Optional[str]] = mapped_column(String(100))
    material: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Condition
    condition: Mapped[str] = mapped_column(String(50), default="Excellent")
    condition_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Flexible additional specs (JSONB for queries)
    item_specs: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    category: Mapped["ItemCategory"] = relationship(back_populates="standalone_items")
    inventory_items: Mapped[list["Inventory"]] = relationship(back_populates="standalone_item")


class Sport(Base):
    """Reference table for sports - used for filtering and validation"""
    __tablename__ = "sports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
