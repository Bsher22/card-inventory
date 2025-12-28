"""
eBay Listing Generation Schemas
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


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
