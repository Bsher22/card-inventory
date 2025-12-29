"""
Financial Schemas: Purchase, Sale, Analytics

Features:
1. PurchaseItemCreate supports INLINE CARD ENTRY:
   - checklist_id is optional
   - If not provided, inline fields (year, card_type, player) are used to find/create checklist
   
2. EBAY INTEGRATION:
   - SaleItemBase/Create/Response: checklist_id is Optional for eBay imports
   - SaleCreate/Response: Added source and ebay_listing_sale_id fields
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from .base import BaseSchema
from .checklists import ChecklistResponse


# ============================================
# PURCHASE ITEM SCHEMAS
# ============================================

class PurchaseItemBase(BaseModel):
    """Base purchase item schema for backward compatibility"""
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    condition: str = Field(default="Raw", max_length=50)
    notes: Optional[str] = None


class PurchaseItemCreate(BaseModel):
    """
    Create a purchase item - supports two modes:
    1. Reference mode: Provide checklist_id to link to existing checklist
    2. Inline mode: Provide card details (year, card_type, player) to create/find checklist
    """
    # Reference to existing checklist (optional - use this OR inline fields)
    checklist_id: Optional[UUID] = None
    
    # Inline card entry fields (used when checklist_id is None)
    year: Optional[int] = Field(None, ge=1990, le=2030, description="Card year")
    card_type: Optional[str] = Field(None, max_length=100, description="Product type (Bowman Chrome, etc.)")
    player: Optional[str] = Field(None, max_length=200, description="Player name")
    parallel: Optional[str] = Field(None, max_length=100, description="Parallel name (Gold, Orange, etc.)")
    card_number: Optional[str] = Field(None, max_length=50, description="Card number (BCP-61, etc.)")
    is_auto: bool = Field(False, description="Is autograph card product (pack-pulled)")
    is_signed: bool = Field(False, description="Card has signature (bought signed)")
    
    # Common fields
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    condition: str = Field(default="Raw", max_length=50)
    notes: Optional[str] = None
    
    # Inventory options for inline cards
    is_slabbed: bool = Field(False, description="Is card graded/slabbed")
    grade_company: Optional[str] = Field(None, max_length=50)
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    
    @model_validator(mode='after')
    def validate_card_source(self):
        """Ensure either checklist_id OR inline card details are provided"""
        has_checklist = self.checklist_id is not None
        has_inline = all([self.year, self.card_type, self.player])
        
        if not has_checklist and not has_inline:
            raise ValueError(
                "Either checklist_id OR inline card details (year, card_type, player) must be provided"
            )
        
        return self


class PurchaseItemResponse(BaseSchema):
    id: UUID
    purchase_id: UUID
    checklist_id: UUID
    quantity: int
    unit_price: Decimal
    condition: str
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


# ============================================
# PURCHASE SCHEMAS
# ============================================

class PurchaseBase(BaseModel):
    """Base purchase schema for backward compatibility"""
    purchase_date: date
    vendor: Optional[str] = Field(None, max_length=200)
    platform: Optional[str] = Field(None, max_length=100)
    order_number: Optional[str] = Field(None, max_length=100)
    shipping: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None


class PurchaseCreate(BaseModel):
    purchase_date: date
    vendor: Optional[str] = Field(None, max_length=200)
    platform: Optional[str] = Field(None, max_length=100)
    order_number: Optional[str] = Field(None, max_length=100)
    shipping: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = []
    add_to_inventory: bool = Field(True, description="Auto-add purchased cards to inventory")


class PurchaseResponse(BaseSchema):
    id: UUID
    purchase_date: date
    vendor: Optional[str] = None
    platform: Optional[str] = None
    order_number: Optional[str] = None
    subtotal: Decimal
    shipping: Decimal
    tax: Decimal
    total: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: Optional[List[PurchaseItemResponse]] = None


# ============================================
# SALE ITEM SCHEMAS
# ============================================

class SaleItemBase(BaseModel):
    """Base sale item schema for backward compatibility"""
    checklist_id: Optional[UUID] = None
    quantity: int = Field(default=1, ge=1)
    sale_price: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None


class SaleItemCreate(BaseModel):
    # OPTIONAL: Allows eBay imports without card-level linkage
    checklist_id: Optional[UUID] = None
    quantity: int = Field(default=1, ge=1)
    sale_price: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None


class SaleItemResponse(BaseSchema):
    id: UUID
    sale_id: UUID
    checklist_id: Optional[UUID] = None  # Nullable for eBay imports
    quantity: int
    sale_price: Decimal
    cost_basis: Optional[Decimal] = None
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


# ============================================
# SALE SCHEMAS
# ============================================

class SaleBase(BaseModel):
    """Base sale schema for backward compatibility"""
    sale_date: date
    platform: Optional[str] = Field(None, max_length=100)
    buyer_name: Optional[str] = Field(None, max_length=200)
    order_number: Optional[str] = Field(None, max_length=100)
    platform_fees: Decimal = Field(default=Decimal("0"), ge=0)
    payment_fees: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_collected: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_cost: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None


class SaleCreate(BaseModel):
    sale_date: date
    platform: Optional[str] = Field(None, max_length=100)
    buyer_name: Optional[str] = Field(None, max_length=200)
    order_number: Optional[str] = Field(None, max_length=100)
    platform_fees: Decimal = Field(default=Decimal("0"), ge=0)
    payment_fees: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_collected: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_cost: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None
    items: List[SaleItemCreate] = []
    # eBay integration fields
    source: str = Field(default="manual")  # 'manual' or 'ebay_import'
    ebay_listing_sale_id: Optional[UUID] = None


class SaleResponse(BaseSchema):
    id: UUID
    sale_date: date
    platform: Optional[str] = None
    buyer_name: Optional[str] = None
    order_number: Optional[str] = None
    gross_amount: Decimal
    platform_fees: Decimal
    payment_fees: Decimal
    shipping_collected: Decimal
    shipping_cost: Decimal
    net_amount: Decimal
    notes: Optional[str] = None
    # eBay integration fields
    source: str = "manual"
    ebay_listing_sale_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    items: Optional[List[SaleItemResponse]] = None


# ============================================
# ANALYTICS SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    """Dashboard overview statistics"""
    total_cards: int
    total_cost_basis: Decimal
    total_revenue: Decimal
    total_profit: Decimal
    unique_players: int
    unique_products: int
    autograph_count: int
    first_bowman_count: int
    rookie_count: int
    graded_count: int


class SalesAnalytics(BaseModel):
    """Sales analytics summary"""
    total_sales: int
    total_revenue: Decimal
    total_profit: Decimal
    avg_sale_price: Decimal
    sales_by_platform: Dict[str, Decimal]
    sales_by_month: Dict[str, Decimal]


class PurchaseAnalytics(BaseModel):
    """Purchase analytics summary"""
    total_purchases: int
    total_spent: Decimal
    avg_purchase_price: Decimal
    purchases_by_vendor: Dict[str, Decimal]
    purchases_by_month: Dict[str, Decimal]


class PlayerSummary(BaseModel):
    """Player-level analytics"""
    player_id: UUID
    player_name: str
    team: Optional[str] = None
    total_cards: int
    unique_cards: int
    autograph_count: int
    rookie_count: int
    first_bowman_count: int
    graded_count: int
    total_value: Decimal


# ============================================
# DROPDOWN OPTIONS (for frontend)
# ============================================

CARD_TYPE_OPTIONS = [
    "Bowman",
    "Bowman Chrome",
    "Bowman Draft",
    "Bowman Sapphire",
    "Bowman Sterling",
    "Bowman's Best",
    "Topps Chrome",
    "Topps",
    "Other"
]

PARALLEL_OPTIONS = [
    "Base",
    "Refractor",
    "Gold",
    "Gold Refractor",
    "Orange",
    "Orange Refractor",
    "Blue",
    "Blue Refractor",
    "Purple",
    "Purple Refractor",
    "Green",
    "Green Refractor",
    "Red",
    "Red Refractor",
    "Black",
    "Black Refractor",
    "Atomic",
    "X-Fractor",
    "Prism",
    "Shimmer",
    "Speckle",
    "Mojo",
    "Aqua",
    "Pink",
    "Yellow",
    "Superfractor",
    "Printing Plate",
    "Other"
]

PLATFORM_OPTIONS = [
    "eBay",
    "COMC",
    "MySlabs",
    "Mercari",
    "Facebook",
    "Twitter/X",
    "Instagram",
    "Card Show",
    "LCS",
    "Direct",
    "Other"
]

GRADE_COMPANY_OPTIONS = [
    "PSA",
    "BGS",
    "SGC",
    "CGC",
    "CSG",
    "HGA"
]
