"""
eBay Sales Import Schemas

Pydantic models for API request/response handling.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# Preview/Upload Schemas
# ============================================

class EbayListingPreview(BaseModel):
    """Single parsed row from eBay CSV, ready for user review."""
    row_index: int
    selected: bool = True  # Default to selected
    
    # Core listing data
    listing_title: str
    ebay_item_id: str
    quantity_sold: int
    
    # Financial summary (key fields for quick review)
    item_sales: Decimal
    total_selling_costs: Decimal
    net_sales: Decimal
    average_selling_price: Decimal
    
    # Full financial data
    total_sales: Decimal
    shipping_collected: Decimal
    taxes_to_seller: Decimal
    taxes_to_ebay: Decimal
    
    # Fees breakdown
    insertion_fees: Decimal = Decimal("0")
    listing_upgrade_fees: Decimal = Decimal("0")
    final_value_fees: Decimal = Decimal("0")
    promoted_general_fees: Decimal = Decimal("0")
    promoted_priority_fees: Decimal = Decimal("0")
    ads_express_fees: Decimal = Decimal("0")
    promoted_offsite_fees: Decimal = Decimal("0")
    international_fees: Decimal = Decimal("0")
    other_ebay_fees: Decimal = Decimal("0")
    deposit_processing_fees: Decimal = Decimal("0")
    fee_credits: Decimal = Decimal("0")
    shipping_label_cost: Decimal = Decimal("0")
    
    # Sales type breakdown
    quantity_via_promoted: int = 0
    quantity_via_best_offer: int = 0
    quantity_via_seller_offer: int = 0


class EbayUploadPreviewResponse(BaseModel):
    """Response from CSV upload/preview endpoint."""
    success: bool
    message: str
    
    # Report metadata
    report_start_date: Optional[date] = None
    report_end_date: Optional[date] = None
    
    # Parsed listings
    listings: list[EbayListingPreview] = []
    
    # Summary stats
    total_rows: int = 0
    total_quantity: int = 0
    total_item_sales: Decimal = Decimal("0")
    total_net_sales: Decimal = Decimal("0")
    
    # Any parsing warnings
    warnings: list[str] = []


# ============================================
# Import/Create Schemas
# ============================================

class EbayListingCreate(BaseModel):
    """Data for creating a single EbayListingSale record."""
    listing_title: str
    ebay_item_id: str
    quantity_sold: int
    
    total_sales: Decimal
    item_sales: Decimal
    shipping_collected: Decimal = Decimal("0")
    taxes_to_seller: Decimal = Decimal("0")
    taxes_to_ebay: Decimal = Decimal("0")
    
    total_selling_costs: Decimal = Decimal("0")
    insertion_fees: Decimal = Decimal("0")
    listing_upgrade_fees: Decimal = Decimal("0")
    final_value_fees: Decimal = Decimal("0")
    promoted_general_fees: Decimal = Decimal("0")
    promoted_priority_fees: Decimal = Decimal("0")
    ads_express_fees: Decimal = Decimal("0")
    promoted_offsite_fees: Decimal = Decimal("0")
    international_fees: Decimal = Decimal("0")
    other_ebay_fees: Decimal = Decimal("0")
    deposit_processing_fees: Decimal = Decimal("0")
    fee_credits: Decimal = Decimal("0")
    shipping_label_cost: Decimal = Decimal("0")
    
    net_sales: Decimal
    average_selling_price: Decimal = Decimal("0")
    
    quantity_via_promoted: int = 0
    quantity_via_best_offer: int = 0
    quantity_via_seller_offer: int = 0


class EbayImportRequest(BaseModel):
    """Request to import selected listings."""
    report_start_date: date
    report_end_date: date
    listings: list[EbayListingCreate]
    notes: Optional[str] = None


class EbayImportResponse(BaseModel):
    """Response from import endpoint."""
    success: bool
    message: str
    batch_id: Optional[UUID] = None
    imported_count: int = 0
    total_item_sales: Decimal = Decimal("0")
    total_net_sales: Decimal = Decimal("0")


# ============================================
# Read/List Schemas
# ============================================

class EbayListingSaleRead(BaseModel):
    """Single listing sale record for API responses."""
    id: UUID
    import_batch_id: UUID
    
    listing_title: str
    ebay_item_id: str
    quantity_sold: int
    
    total_sales: Decimal
    item_sales: Decimal
    shipping_collected: Decimal
    taxes_to_seller: Decimal
    taxes_to_ebay: Decimal
    
    total_selling_costs: Decimal
    final_value_fees: Decimal
    shipping_label_cost: Decimal
    fee_credits: Decimal
    
    net_sales: Decimal
    average_selling_price: Decimal
    
    quantity_via_promoted: int
    quantity_via_best_offer: int
    quantity_via_seller_offer: int
    
    checklist_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class EbayImportBatchRead(BaseModel):
    """Import batch record for API responses."""
    id: UUID
    report_start_date: date
    report_end_date: date
    import_date: datetime
    
    total_listings: int
    total_quantity_sold: int
    total_item_sales: Decimal
    total_net_sales: Decimal
    
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class EbayImportBatchDetail(EbayImportBatchRead):
    """Import batch with listing details."""
    listing_sales: list[EbayListingSaleRead] = []


# ============================================
# Analytics Schemas
# ============================================

class EbaySalesAnalytics(BaseModel):
    """Summary analytics across all eBay imports."""
    total_batches: int = 0
    total_listings: int = 0
    total_quantity_sold: int = 0
    total_item_sales: Decimal = Decimal("0")
    total_net_sales: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")
    average_fee_percentage: Decimal = Decimal("0")
