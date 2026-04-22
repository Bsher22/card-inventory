"""
eBay Consignments Models

Clients (consigners) who give IDGAS items to sell on their behalf via eBay.
Separate from the autograph-card consignment workflow in models/consignments.py.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer,
    Numeric, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class EbayConsigner(Base):
    """Client whose items IDGAS sells on eBay on consignment."""
    __tablename__ = "ebay_consigners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    email: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))

    # Mailing address - used on the agreement PDF
    street_address: Mapped[Optional[str]] = mapped_column(String(500))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(50))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    country: Mapped[Optional[str]] = mapped_column(String(100), default="USA")

    # Default fee% to pre-fill new agreements (e.g., 20.00 == 20%)
    default_fee_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))

    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    payment_details: Mapped[Optional[str]] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    agreements: Mapped[list["EbayConsignmentAgreement"]] = relationship(
        back_populates="consigner", cascade="all, delete-orphan"
    )
    payouts: Mapped[list["EbayConsignmentPayout"]] = relationship(
        back_populates="consigner", cascade="all, delete-orphan"
    )

    @property
    def formatted_address(self) -> Optional[str]:
        parts: list[str] = []
        if self.street_address:
            parts.append(self.street_address)
        csz: list[str] = []
        if self.city:
            csz.append(self.city)
        if self.state:
            csz.append(self.state)
        if csz:
            line = ", ".join(csz)
            if self.postal_code:
                line += f" {self.postal_code}"
            parts.append(line)
        elif self.postal_code:
            parts.append(self.postal_code)
        if self.country and self.country != "USA":
            parts.append(self.country)
        return "\n".join(parts) if parts else None


class EbayConsignmentAgreement(Base):
    """A signed (or in-progress) consignment agreement between IDGAS and a client."""
    __tablename__ = "ebay_consignment_agreements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consigner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ebay_consigners.id", ondelete="RESTRICT"), nullable=False
    )

    agreement_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    agreement_date: Mapped[date] = mapped_column(Date, nullable=False)

    # draft | sent | signed | active | completed | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    fee_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    client_signature_name: Mapped[Optional[str]] = mapped_column(String(200))
    client_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    idgas_signature_name: Mapped[Optional[str]] = mapped_column(String(200))
    idgas_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    pdf_path: Mapped[Optional[str]] = mapped_column(String(500))
    docusign_envelope_id: Mapped[Optional[str]] = mapped_column(String(200))
    docusign_status: Mapped[Optional[str]] = mapped_column(String(50))

    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    consigner: Mapped["EbayConsigner"] = relationship(back_populates="agreements")
    items: Mapped[list["EbayConsignmentItem"]] = relationship(
        back_populates="agreement", cascade="all, delete-orphan", order_by="EbayConsignmentItem.created_at",
    )


class EbayConsignmentPayout(Base):
    """Monthly payout statement for a consigner."""
    __tablename__ = "ebay_consignment_payouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consigner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ebay_consigners.id", ondelete="RESTRICT"), nullable=False
    )

    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)

    total_gross: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_idgas_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_ebay_fees: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_other_fees: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    net_payout: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    paid_method: Mapped[Optional[str]] = mapped_column(String(100))
    paid_reference: Mapped[Optional[str]] = mapped_column(String(200))

    statement_pdf_path: Mapped[Optional[str]] = mapped_column(String(500))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    consigner: Mapped["EbayConsigner"] = relationship(back_populates="payouts")
    items: Mapped[list["EbayConsignmentItem"]] = relationship(back_populates="payout")


class EbayConsignmentItem(Base):
    """Individual item attached to an agreement and sold on eBay."""
    __tablename__ = "ebay_consignment_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agreement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ebay_consignment_agreements.id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    condition: Mapped[Optional[str]] = mapped_column(String(100))

    minimum_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # pending | listed | sold | unsold | returned | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    ebay_listing_id: Mapped[Optional[str]] = mapped_column(String(100))
    listed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    sold_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sold_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    ebay_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    payment_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    buyer_info: Mapped[Optional[str]] = mapped_column(String(200))

    payout_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ebay_consignment_payouts.id", ondelete="SET NULL")
    )

    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    agreement: Mapped["EbayConsignmentAgreement"] = relationship(back_populates="items")
    payout: Mapped[Optional["EbayConsignmentPayout"]] = relationship(back_populates="items")
