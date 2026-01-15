# app/models/consignment.py
# Updated with address fields for consigners

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, 
    Numeric, String, Text, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .consigner_player_price import ConsignerPlayerPrice
    from .checklists import Checklist
    from .inventory import Inventory


# ============================================
# CONSIGNMENT MODELS
# ============================================

class Consigner(Base):
    """Represents a person/entity who signs cards on consignment."""
    __tablename__ = "consigners"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    
    # Contact info
    email: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Address fields (for shipping cards)
    street_address: Mapped[Optional[str]] = mapped_column(String(500))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(50))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    country: Mapped[Optional[str]] = mapped_column(String(100), default="USA")
    
    # Legacy location field (can be used as label like "Home", "Office")
    location: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Payment and fee info
    default_fee: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    payment_details: Mapped[Optional[str]] = mapped_column(Text)
    
    # Status and notes
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    consignments: Mapped[list["Consignment"]] = relationship(back_populates="consigner")
    player_prices: Mapped[list["ConsignerPlayerPrice"]] = relationship(back_populates="consigner")
    
    @property
    def formatted_address(self) -> Optional[str]:
        """Returns a formatted mailing address string."""
        parts = []
        if self.street_address:
            parts.append(self.street_address)
        city_state_zip = []
        if self.city:
            city_state_zip.append(self.city)
        if self.state:
            city_state_zip.append(self.state)
        if city_state_zip:
            line2 = ", ".join(city_state_zip)
            if self.postal_code:
                line2 += f" {self.postal_code}"
            parts.append(line2)
        elif self.postal_code:
            parts.append(self.postal_code)
        if self.country and self.country != "USA":
            parts.append(self.country)
        return "\n".join(parts) if parts else None


class Consignment(Base):
    """Represents a batch of cards sent to a consigner for signing."""
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
    """Represents an individual card within a consignment batch."""
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
    checklist: Mapped["Checklist"] = relationship()
    source_inventory: Mapped[Optional["Inventory"]] = relationship(foreign_keys=[source_inventory_id])
    target_inventory: Mapped[Optional["Inventory"]] = relationship(foreign_keys=[target_inventory_id])