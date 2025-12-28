"""
eBay Sales Import Models

Stores aggregated sales data from eBay Listings & Sales Reports.
Each row represents total sales for a single listing over a reporting period.
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UUID
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .database import Base


class EbayImportBatch(Base):
    """
    Represents a single eBay report upload/import session.
    Groups multiple listing sales together for tracking purposes.
    """
    __tablename__ = "ebay_import_batches"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Report metadata
    report_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    report_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    import_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Summary stats (calculated on import)
    total_listings: Mapped[int] = mapped_column(Integer, default=0)
    total_quantity_sold: Mapped[int] = mapped_column(Integer, default=0)
    total_item_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total_net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    listing_sales: Mapped[list["EbayListingSale"]] = relationship(
        back_populates="import_batch", 
        cascade="all, delete-orphan"
    )


class EbayListingSale(Base):
    """
    Represents aggregated sales data for a single eBay listing.
    Maps directly to rows in the eBay Listings & Sales Report.
    """
    __tablename__ = "ebay_listing_sales"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_batch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ebay_import_batches.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # eBay listing info
    listing_title: Mapped[str] = mapped_column(String(500), nullable=False)
    ebay_item_id: Mapped[str] = mapped_column(String(50), nullable=False)  # Store as string to preserve full number
    
    # Sales quantities
    quantity_sold: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_via_promoted: Mapped[int] = mapped_column(Integer, default=0)
    quantity_via_best_offer: Mapped[int] = mapped_column(Integer, default=0)
    quantity_via_seller_offer: Mapped[int] = mapped_column(Integer, default=0)
    
    # Revenue (all in USD)
    total_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)  # Includes taxes
    item_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    shipping_collected: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    taxes_to_seller: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    taxes_to_ebay: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Fees & costs
    total_selling_costs: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    insertion_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    listing_upgrade_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    final_value_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    promoted_general_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    promoted_priority_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    ads_express_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    promoted_offsite_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    international_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    other_ebay_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    deposit_processing_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    fee_credits: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_label_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Calculated fields
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    average_selling_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    
    # Optional: Link to checklist if we can match the card
    checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("checklists.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    import_batch: Mapped["EbayImportBatch"] = relationship(back_populates="listing_sales")
