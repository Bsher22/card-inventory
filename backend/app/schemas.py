from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ============================================
# BASE SCHEMAS
# ============================================

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ============================================
# BRAND SCHEMAS
# ============================================

class BrandCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)


class BrandResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    created_at: datetime


class BrandWithProducts(BrandResponse):
    product_lines: list["ProductLineResponse"] = []


# ============================================
# PRODUCT LINE SCHEMAS
# ============================================

class ProductLineCreate(BaseModel):
    brand_id: UUID
    name: str = Field(..., min_length=1, max_length=200)
    year: int = Field(..., ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: str = "Baseball"
    description: Optional[str] = None


class ProductLineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    release_date: Optional[date] = None
    description: Optional[str] = None


class ProductLineResponse(BaseSchema):
    id: UUID
    brand_id: UUID
    name: str
    year: int
    release_date: Optional[date]
    sport: str
    description: Optional[str]
    created_at: datetime


class ProductLineWithBrand(ProductLineResponse):
    brand: BrandResponse


class ProductLineSummary(BaseSchema):
    id: UUID
    brand_name: str
    name: str
    year: int
    checklist_count: int = 0
    inventory_count: int = 0
    completion_pct: float = 0.0


# ============================================
# PLAYER SCHEMAS
# ============================================

class PlayerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    team: Optional[str] = None
    position: Optional[str] = None
    debut_year: Optional[int] = None
    is_rookie: bool = False
    is_prospect: bool = False
    mlb_id: Optional[int] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    team: Optional[str] = None
    position: Optional[str] = None
    debut_year: Optional[int] = None
    is_rookie: Optional[bool] = None
    is_prospect: Optional[bool] = None
    mlb_id: Optional[int] = None


class PlayerResponse(BaseSchema):
    id: UUID
    name: str
    team: Optional[str]
    position: Optional[str]
    debut_year: Optional[int]
    is_rookie: bool
    is_prospect: bool
    mlb_id: Optional[int]
    created_at: datetime


class PlayerInventorySummary(BaseSchema):
    player_id: UUID
    player_name: str
    team: Optional[str]
    position: Optional[str]
    unique_cards: int
    total_cards: int
    auto_count: int
    rookie_count: int
    numbered_count: int
    total_cost: Decimal = Decimal("0")
    total_revenue: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")


# ============================================
# CARD TYPE SCHEMAS
# ============================================

class CardTypeResponse(BaseSchema):
    id: UUID
    name: str
    category: Optional[str]
    description: Optional[str]


# ============================================
# CHECKLIST SCHEMAS
# ============================================

class ChecklistCreate(BaseModel):
    product_line_id: UUID
    card_number: str = Field(..., min_length=1, max_length=50)
    player_name_raw: Optional[str] = None
    player_id: Optional[UUID] = None
    card_type_id: Optional[UUID] = None
    parallel_name: Optional[str] = "Base"
    serial_numbered: Optional[int] = None
    is_autograph: bool = False
    is_relic: bool = False
    is_rookie_card: bool = False
    is_short_print: bool = False
    team: Optional[str] = None
    notes: Optional[str] = None


class ChecklistUpdate(BaseModel):
    card_number: Optional[str] = Field(None, min_length=1, max_length=50)
    player_id: Optional[UUID] = None
    card_type_id: Optional[UUID] = None
    parallel_name: Optional[str] = None
    serial_numbered: Optional[int] = None
    is_autograph: Optional[bool] = None
    is_relic: Optional[bool] = None
    is_rookie_card: Optional[bool] = None
    is_short_print: Optional[bool] = None
    team: Optional[str] = None
    notes: Optional[str] = None


class ChecklistResponse(BaseSchema):
    id: UUID
    product_line_id: UUID
    card_number: str
    player_id: Optional[UUID]
    player_name_raw: Optional[str]
    card_type_id: Optional[UUID]
    parallel_name: Optional[str]
    serial_numbered: Optional[int]
    is_autograph: bool
    is_relic: bool
    is_rookie_card: bool
    is_short_print: bool
    team: Optional[str]
    notes: Optional[str]
    created_at: datetime


class ChecklistWithDetails(ChecklistResponse):
    player: Optional[PlayerResponse] = None
    card_type: Optional[CardTypeResponse] = None
    product_line: Optional[ProductLineResponse] = None
    inventory_quantity: int = 0


# ============================================
# INVENTORY SCHEMAS
# ============================================

class InventoryCreate(BaseModel):
    checklist_id: UUID
    quantity: int = Field(..., ge=0)
    condition: str = "NM"
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)
    condition: Optional[str] = None
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None


class InventoryAdjust(BaseModel):
    adjustment: int  # Can be positive or negative


class InventoryResponse(BaseSchema):
    id: UUID
    checklist_id: UUID
    quantity: int
    condition: str
    grade_company: Optional[str]
    grade_value: Optional[Decimal]
    storage_location: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class InventoryWithCard(InventoryResponse):
    checklist: ChecklistWithDetails


# ============================================
# PURCHASE SCHEMAS
# ============================================

class PurchaseItemCreate(BaseModel):
    checklist_id: UUID
    quantity: int = Field(1, ge=1)
    unit_cost: Decimal = Field(..., ge=0)
    condition: str = "NM"
    notes: Optional[str] = None


class PurchaseCreate(BaseModel):
    purchase_date: date
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    shipping_cost: Decimal = Decimal("0")
    notes: Optional[str] = None
    items: list[PurchaseItemCreate] = []


class PurchaseItemResponse(BaseSchema):
    id: UUID
    checklist_id: UUID
    quantity: int
    unit_cost: Decimal
    condition: str
    notes: Optional[str]


class PurchaseResponse(BaseSchema):
    id: UUID
    purchase_date: date
    vendor: Optional[str]
    invoice_number: Optional[str]
    total_cost: Optional[Decimal]
    shipping_cost: Decimal
    notes: Optional[str]
    created_at: datetime
    items: list[PurchaseItemResponse] = []


# ============================================
# SALE SCHEMAS
# ============================================

class SaleItemCreate(BaseModel):
    checklist_id: UUID
    quantity: int = Field(1, ge=1)
    sale_price: Decimal = Field(..., ge=0)
    condition: Optional[str] = None


class SaleCreate(BaseModel):
    sale_date: date
    platform: Optional[str] = None
    buyer_name: Optional[str] = None
    order_number: Optional[str] = None
    shipping_charged: Decimal = Decimal("0")
    shipping_cost: Decimal = Decimal("0")
    platform_fees: Decimal = Decimal("0")
    payment_fees: Decimal = Decimal("0")
    notes: Optional[str] = None
    items: list[SaleItemCreate] = []


class SaleItemResponse(BaseSchema):
    id: UUID
    checklist_id: UUID
    quantity: int
    sale_price: Decimal
    condition: Optional[str]
    cost_basis: Optional[Decimal]


class SaleResponse(BaseSchema):
    id: UUID
    sale_date: date
    platform: Optional[str]
    buyer_name: Optional[str]
    order_number: Optional[str]
    subtotal: Optional[Decimal]
    shipping_charged: Decimal
    shipping_cost: Decimal
    platform_fees: Decimal
    payment_fees: Decimal
    notes: Optional[str]
    created_at: datetime
    items: list[SaleItemResponse] = []


# ============================================
# ANALYTICS SCHEMAS
# ============================================

class InventoryAnalytics(BaseModel):
    total_unique_cards: int
    total_quantity: int
    total_cost_basis: Decimal
    total_revenue: Decimal
    total_profit: Decimal
    cards_by_brand: dict[str, int]
    cards_by_year: dict[int, int]
    top_players: list[PlayerInventorySummary]


class SalesAnalytics(BaseModel):
    total_sales: int
    total_revenue: Decimal
    total_profit: Decimal
    avg_sale_price: Decimal
    sales_by_platform: dict[str, Decimal]
    sales_by_month: dict[str, Decimal]


# ============================================
# CHECKLIST UPLOAD SCHEMAS
# ============================================

class ChecklistUploadResult(BaseModel):
    product_line_id: UUID
    total_rows: int
    cards_created: int
    cards_updated: int
    players_created: int
    players_matched: int
    errors: list[str] = []


class ChecklistUploadPreview(BaseModel):
    total_rows: int
    sample_rows: list[dict]
    detected_columns: dict[str, str]  # mapped columns
    unmapped_columns: list[str]


# Forward references
BrandWithProducts.model_rebuild()
