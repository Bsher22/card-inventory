"""
Consignment Models: Consigner, Consignment, ConsignmentItem
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Boolean, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .checklists import Checklist


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
