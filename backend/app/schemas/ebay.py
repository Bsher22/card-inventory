"""
eBay Schemas

Includes:
- Listing generation (for creating eBay listings)
- Sales import (for importing eBay sales reports)
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# LISTING GENERATION SCHEMAS
# ============================================

class EbayItemSpecifics(BaseModel):
    """eBay item specifics structure"""
    type: str = "Sports Trading Card"
    sport: str = "Baseball"
    league: str = "Major League (MLB)"
    manufacturer: str = "Bowman"
    set: str  # e.g., "2023 Bowman Chrome"
    season: str  # e.g., "2023"
    player_athlete: str  # Player name
    team: Optional[str] = None
    card_number: Optional[str] = None
    card_condition: str = "Excellent"
    
    # Conditional fields based on card type
    autographed: Optional[str] = None  # "Yes" or None
    autograph_authentication: Optional[str] = None  # "Professional Sports Authenticator (PSA)", "JSA", etc.
    autograph_format: Optional[str] = None  # "Hard Signed"
    signed_by: Optional[str] = None  # Player name (lowercase for eBay)
    
    parallel_variety: Optional[str] = None  # e.g., "Sapphire", "Lunar Glow"
    features: Optional[str] = None  # "Rookie", "Parallel/Variety", etc.
    serial_numbered: Optional[str] = None  # e.g., "/250"


class EbayListingData(BaseModel):
    """Complete eBay listing data for a single card"""
    inventory_id: UUID
    
    # Generated title (80 char max)
    title: str = Field(..., max_length=80)
    
    # Pricing
    min_price: Decimal
    cost_basis: Decimal
    quantity: int
    per_unit_cost: Decimal
    
    # Item specifics
    item_specifics: EbayItemSpecifics
    
    # Card details for reference
    player_name: str
    card_number: str
    year: int
    product_name: str
    parallel_name: Optional[str] = None
    serial_numbered: Optional[int] = None
    serial_number: Optional[int] = None  # Specific number if known (e.g., 142/250)
    
    # Status flags
    is_signed: bool = False
    is_slabbed: bool = False
    is_first_bowman: bool = False
    is_rookie: bool = False
    
    # Grading info (if slabbed)
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None
    
    # Auth company for signed cards
    auth_company: Optional[str] = None  # PSA/DNA, JSA, Beckett


class EbayListingRequest(BaseModel):
    """Request to generate eBay listings"""
    inventory_ids: list[UUID] = Field(..., min_length=1, max_length=100)


class EbayListingResponse(BaseModel):
    """Response containing generated listings"""
    listings: list[EbayListingData]
    total_count: int
    total_min_price: Decimal


# ============================================
# SALES IMPORT SCHEMAS
# ============================================

class EbayListingPreview(BaseModel):
    """Single parsed row from eBay CSV, ready for user review."""
    row_index: int
    selected: bool = True
    
    # Core listing data
    listing_title: str
    ebay_item_id: str
    quantity_sold: int
    
    # Financial summary
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


class EbaySalesAnalytics(BaseModel):
    """Summary analytics across all eBay imports."""
    total_batches: int = 0
    total_listings: int = 0
    total_quantity_sold: int = 0
    total_item_sales: Decimal = Decimal("0")
    total_net_sales: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")
    average_fee_percentage: Decimal = Decimal("0")
