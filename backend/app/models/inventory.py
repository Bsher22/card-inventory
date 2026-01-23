"""
Inventory Model - Updated with Standalone Item Support

Supports both card inventory (via checklist_id) and standalone items (via standalone_item_id).
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Boolean, DateTime, Numeric, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .checklists import Checklist
    from .card_types import CardBaseType, Parallel
    from .standalone_items import StandaloneItem


class Inventory(Base):
    """
    Unified inventory tracking - everything you own goes through here.
    
    Two modes:
    1. Card inventory: item_type='card', checklist_id set, standalone_item_id null
    2. Standalone inventory: item_type='memorabilia'|'collectible', standalone_item_id set, checklist_id null
    """
    __tablename__ = "inventory"
    __table_args__ = (
        # Unique constraint for cards (existing)
        UniqueConstraint(
            'checklist_id', 'is_signed', 'is_slabbed',
            'grade_company', 'grade_value', 'raw_condition',
            name='uq_inventory_card_status'
        ),
        CheckConstraint('quantity >= 0', name='ck_inventory_quantity_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Item type discriminator
    item_type: Mapped[str] = mapped_column(String(20), nullable=False, default='card')
    
    # Card reference (for item_type='card')
    checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("checklists.id", ondelete="CASCADE"), 
        nullable=True  # Nullable to support standalone items
    )
    
    # Standalone item reference (for item_type='memorabilia'|'collectible')
    standalone_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("standalone_items.id", ondelete="CASCADE"),
        nullable=True
    )
    
    # Card type references (only for cards)
    base_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("card_base_types.id", ondelete="SET NULL")
    )
    parallel_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("parallels.id", ondelete="SET NULL")
    )
    
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    serial_number: Mapped[Optional[int]] = mapped_column(Integer)  # e.g., 142 of /250

    # Card/Item status
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

    # Granular cost tracking
    card_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    signing_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    grading_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    # Source tracking
    consigner: Mapped[Optional[str]] = mapped_column(String(100))  # Who signed/sourced (IP, Desert Autographs, etc.)
    how_obtained: Mapped[Optional[str]] = mapped_column(String(50))  # IP, TTM, Purchase, Signing, 50/50

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    checklist: Mapped[Optional["Checklist"]] = relationship(back_populates="inventory_items")
    standalone_item: Mapped[Optional["StandaloneItem"]] = relationship(back_populates="inventory_items")
    base_type: Mapped[Optional["CardBaseType"]] = relationship(
        back_populates="inventory_items",
        foreign_keys=[base_type_id]
    )
    parallel: Mapped[Optional["Parallel"]] = relationship(
        back_populates="inventory_items",
        foreign_keys=[parallel_id]
    )

    @property
    def display_title(self) -> str:
        """Get a display title regardless of item type."""
        if self.item_type == 'card' and self.checklist:
            return f"{self.checklist.player_name_raw} - {self.checklist.card_number}"
        elif self.standalone_item:
            return self.standalone_item.title
        return "Unknown Item"

    @property
    def sport(self) -> str:
        """Get sport from either card or standalone item."""
        if self.item_type == 'card' and self.checklist and self.checklist.product_line:
            return self.checklist.product_line.sport
        elif self.standalone_item:
            return self.standalone_item.sport
        return "Unknown"