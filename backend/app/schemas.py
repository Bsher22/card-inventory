"""
Card Inventory Pydantic Schemas
===============================

Complete Pydantic schemas for API request/response validation.
Includes Beckett import schemas with is_first_bowman support.

Place in: backend/app/schemas.py
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ============================================
# BASE SCHEMA
# ============================================

class BaseSchema(BaseModel):
    """Base schema with common config"""
    model_config = ConfigDict(from_attributes=True)


# ============================================
# BRAND SCHEMAS (Basic - no forward refs)
# ============================================

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)


class BrandResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime


# ============================================
# PRODUCT LINE SCHEMAS
# ============================================

class ProductLineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    year: int = Field(..., ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: str = Field(default="Baseball", max_length=50)
    description: Optional[str] = None


class ProductLineCreate(ProductLineBase):
    brand_id: UUID


class ProductLineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None


class ProductLineResponse(BaseSchema):
    id: UUID
    brand_id: UUID
    name: str
    year: int
    release_date: Optional[date] = None
    sport: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    brand: Optional[BrandResponse] = None
    checklist_count: Optional[int] = None


class ProductLineWithBrand(ProductLineResponse):
    """Product line with nested brand"""
    brand: BrandResponse


class ProductLineSummary(BaseSchema):
    """Summary statistics for product lines"""
    id: UUID
    brand_name: str
    name: str
    year: int
    checklist_count: int = 0
    inventory_count: int = 0
    completion_pct: float = 0.0


# ============================================
# BRAND WITH PRODUCTS (after ProductLineResponse)
# ============================================

class BrandWithProducts(BrandResponse):
    """Brand with nested product lines"""
    product_lines: list[ProductLineResponse] = []


# ============================================
# PLAYER SCHEMAS
# ============================================

class PlayerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    team: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=50)
    debut_year: Optional[int] = Field(None, ge=1900, le=2100)
    is_rookie: bool = False
    is_prospect: bool = False
    mlb_id: Optional[int] = None


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    team: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=50)
    debut_year: Optional[int] = Field(None, ge=1900, le=2100)
    is_rookie: Optional[bool] = None
    is_prospect: Optional[bool] = None
    mlb_id: Optional[int] = None


class PlayerResponse(BaseSchema):
    id: UUID
    name: str
    name_normalized: str
    team: Optional[str] = None
    position: Optional[str] = None
    debut_year: Optional[int] = None
    is_rookie: bool
    is_prospect: bool
    mlb_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PlayerInventorySummary(BaseSchema):
    """Player-level inventory summary"""
    player_id: UUID
    player_name: str
    team: Optional[str] = None
    position: Optional[str] = None
    unique_cards: int = 0
    total_cards: int = 0
    auto_count: int = 0
    rookie_count: int = 0
    first_bowman_count: int = 0
    numbered_count: int = 0
    total_cost: Decimal = Decimal("0")
    total_revenue: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")


# ============================================
# CHECKLIST SCHEMAS
# ============================================

class ChecklistBase(BaseModel):
    card_number: str = Field(..., min_length=1, max_length=50)
    card_prefix: Optional[str] = Field(None, max_length=20)
    card_suffix: Optional[str] = Field(None, max_length=10)
    player_name_raw: str = Field(..., min_length=1, max_length=200)
    team: Optional[str] = Field(None, max_length=100)
    set_name: Optional[str] = Field(None, max_length=100)
    parallel_name: Optional[str] = Field(None, max_length=100)
    is_autograph: bool = False
    is_relic: bool = False
    is_rookie_card: bool = False
    is_first_bowman: bool = False
    serial_numbered: Optional[int] = Field(None, ge=1)


class ChecklistCreate(ChecklistBase):
    product_line_id: UUID
    player_id: Optional[UUID] = None
    card_type_id: Optional[UUID] = None


class ChecklistUpdate(BaseModel):
    card_number: Optional[str] = Field(None, min_length=1, max_length=50)
    card_prefix: Optional[str] = Field(None, max_length=20)
    card_suffix: Optional[str] = Field(None, max_length=10)
    player_name_raw: Optional[str] = Field(None, min_length=1, max_length=200)
    player_id: Optional[UUID] = None
    team: Optional[str] = Field(None, max_length=100)
    set_name: Optional[str] = Field(None, max_length=100)
    parallel_name: Optional[str] = Field(None, max_length=100)
    is_autograph: Optional[bool] = None
    is_relic: Optional[bool] = None
    is_rookie_card: Optional[bool] = None
    is_first_bowman: Optional[bool] = None
    serial_numbered: Optional[int] = Field(None, ge=1)


class ChecklistResponse(BaseSchema):
    id: UUID
    product_line_id: UUID
    card_number: str
    card_prefix: Optional[str] = None
    card_suffix: Optional[str] = None
    player_name_raw: str
    player_id: Optional[UUID] = None
    team: Optional[str] = None
    card_type_id: Optional[UUID] = None
    set_name: Optional[str] = None
    parallel_name: Optional[str] = None
    is_autograph: bool
    is_relic: bool
    is_rookie_card: bool
    is_first_bowman: bool
    serial_numbered: Optional[int] = None
    raw_checklist_line: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    player: Optional[PlayerResponse] = None
    product_line: Optional[ProductLineResponse] = None
    inventory_count: Optional[int] = None


class ChecklistFilters(BaseModel):
    """Filters for checklist queries"""
    product_line_id: Optional[UUID] = None
    brand_id: Optional[UUID] = None
    player_id: Optional[UUID] = None
    search: Optional[str] = None
    set_name: Optional[str] = None
    is_autograph: Optional[bool] = None
    is_relic: Optional[bool] = None
    is_rookie_card: Optional[bool] = None
    is_first_bowman: Optional[bool] = None
    has_inventory: Optional[bool] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class ChecklistImportPreview(BaseModel):
    """Preview of checklist file before import"""
    filename: str
    detected_product: Optional[str] = None
    detected_year: Optional[int] = None
    total_rows: int
    sample_rows: List[Dict]
    column_mapping: Dict[str, str]


# ============================================
# INVENTORY SCHEMAS
# ============================================

class InventoryBase(BaseModel):
    quantity: int = Field(..., ge=0)
    is_signed: bool = False
    is_slabbed: bool = False
    grade_company: Optional[str] = Field(None, max_length=20)
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = Field(None, max_length=50)
    raw_condition: str = Field(default="NM", max_length=20)
    storage_location: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    total_cost: Decimal = Field(default=0, ge=0)


class InventoryCreate(InventoryBase):
    checklist_id: UUID


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)
    is_signed: Optional[bool] = None
    is_slabbed: Optional[bool] = None
    grade_company: Optional[str] = Field(None, max_length=20)
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = Field(None, max_length=50)
    raw_condition: Optional[str] = Field(None, max_length=20)
    storage_location: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    total_cost: Optional[Decimal] = Field(None, ge=0)


class InventoryResponse(BaseSchema):
    id: UUID
    checklist_id: UUID
    quantity: int
    is_signed: bool
    is_slabbed: bool
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None
    auto_grade: Optional[Decimal] = None
    cert_number: Optional[str] = None
    raw_condition: str
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    total_cost: Decimal
    created_at: datetime
    updated_at: datetime
    checklist: Optional[ChecklistResponse] = None


class InventoryWithDetails(InventoryResponse):
    """Inventory with full card details"""
    checklist: ChecklistResponse


# ============================================
# BECKETT IMPORT SCHEMAS
# ============================================

class BeckettParsedCard(BaseModel):
    """A single card parsed from a Beckett XLSX file"""
    set_name: str
    card_number: str
    card_prefix: Optional[str] = None
    card_suffix: Optional[str] = None
    player_name: str
    team: Optional[str] = None
    is_rookie_card: bool = False
    is_autograph: bool = False
    is_relic: bool = False
    is_first_bowman: bool = False
    serial_numbered: Optional[int] = None
    notes: Optional[str] = None
    raw_line: str


class BeckettImportPreview(BaseModel):
    """Preview of a Beckett file before import"""
    product_name: str
    year: int
    brand: str
    total_cards: int
    first_bowman_count: int
    auto_count: int
    rookie_count: int
    sets_found: Dict[str, int]
    sample_cards: List[BeckettParsedCard]
    product_line_exists: bool
    product_line_id: Optional[str] = None


class BeckettImportRequest(BaseModel):
    """Request to import a Beckett file"""
    create_product_line: bool = True


class BeckettImportResponse(BaseModel):
    """Response from Beckett import"""
    success: bool
    product_line_id: Optional[str] = None
    product_line_name: str
    year: int
    brand: str
    total_cards: int
    cards_created: int
    cards_updated: int
    cards_skipped: int
    players_created: int
    players_matched: int
    first_bowman_count: int
    sets_imported: Dict[str, int]
    errors: List[str]
    warnings: List[str]


# ============================================
# CONSIGNMENT SCHEMAS
# ============================================

class ConsignerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    default_fee_per_card: Decimal = Field(default=0, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    is_active: bool = True


class ConsignerCreate(ConsignerBase):
    pass


class ConsignerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    default_fee_per_card: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ConsignerResponse(BaseSchema):
    id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    default_fee_per_card: Decimal
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ConsignmentItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    fee_per_card: Decimal = Field(default=0, ge=0)
    status: str = Field(default="pending", max_length=50)
    notes: Optional[str] = None


class ConsignmentItemResponse(BaseSchema):
    id: UUID
    consignment_id: UUID
    checklist_id: UUID
    quantity: int
    fee_per_card: Decimal
    status: str
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


class ConsignmentBase(BaseModel):
    consigner_id: UUID
    date_sent: date
    notes: Optional[str] = None


class ConsignmentCreate(ConsignmentBase):
    items: List[ConsignmentItemBase]


class ConsignmentResponse(BaseSchema):
    id: UUID
    consigner_id: UUID
    date_sent: date
    date_returned: Optional[date] = None
    status: str
    total_cards: int
    total_fee: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    consigner: Optional[ConsignerResponse] = None


# ============================================
# GRADING SCHEMAS
# ============================================

class GradingCompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str = Field(..., min_length=1, max_length=20)
    website: Optional[str] = Field(None, max_length=200)
    is_active: bool = True


class GradingCompanyCreate(GradingCompanyBase):
    pass


class GradingCompanyResponse(BaseSchema):
    id: UUID
    name: str
    short_name: str
    website: Optional[str] = None
    is_active: bool


class GradingServiceLevelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_per_card: Decimal = Field(..., ge=0)
    turnaround_days: Optional[int] = Field(None, ge=1)
    is_active: bool = True


class GradingServiceLevelCreate(GradingServiceLevelBase):
    company_id: UUID


class GradingServiceLevelResponse(BaseSchema):
    id: UUID
    company_id: UUID
    name: str
    price_per_card: Decimal
    turnaround_days: Optional[int] = None
    is_active: bool


class GradingSubmissionItemBase(BaseModel):
    checklist_id: UUID
    declared_value: Decimal = Field(default=0, ge=0)


class GradingSubmissionItemResponse(BaseSchema):
    id: UUID
    submission_id: UUID
    checklist_id: UUID
    declared_value: Decimal
    grade_received: Optional[Decimal] = None
    auto_grade_received: Optional[Decimal] = None
    cert_number: Optional[str] = None
    notes: Optional[str] = None


class GradingSubmissionBase(BaseModel):
    company_id: UUID
    service_level_id: UUID
    submission_number: Optional[str] = Field(None, max_length=100)
    date_submitted: date
    notes: Optional[str] = None


class GradingSubmissionCreate(GradingSubmissionBase):
    items: List[GradingSubmissionItemBase]


class GradingSubmissionResponse(BaseSchema):
    id: UUID
    company_id: UUID
    service_level_id: UUID
    submission_number: Optional[str] = None
    date_submitted: date
    date_returned: Optional[date] = None
    status: str
    total_cards: int
    total_fee: Decimal
    shipping_cost: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    company: Optional[GradingCompanyResponse] = None
    service_level: Optional[GradingServiceLevelResponse] = None


# ============================================
# FINANCIAL SCHEMAS
# ============================================

class PurchaseItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(default=0, ge=0)
    condition: str = Field(default="NM", max_length=20)
    notes: Optional[str] = None


class PurchaseItemResponse(BaseSchema):
    id: UUID
    purchase_id: UUID
    checklist_id: UUID
    quantity: int
    unit_price: Decimal
    condition: str
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


class PurchaseBase(BaseModel):
    purchase_date: date
    vendor: Optional[str] = Field(None, max_length=200)
    platform: Optional[str] = Field(None, max_length=100)
    order_number: Optional[str] = Field(None, max_length=100)
    shipping: Decimal = Field(default=0, ge=0)
    tax: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemBase]


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


class SaleItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    sale_price: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class SaleItemResponse(BaseSchema):
    id: UUID
    sale_id: UUID
    checklist_id: UUID
    quantity: int
    sale_price: Decimal
    cost_basis: Decimal
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


class SaleBase(BaseModel):
    sale_date: date
    platform: str = Field(..., min_length=1, max_length=100)
    buyer_name: Optional[str] = Field(None, max_length=200)
    order_number: Optional[str] = Field(None, max_length=100)
    platform_fees: Decimal = Field(default=0, ge=0)
    payment_fees: Decimal = Field(default=0, ge=0)
    shipping_collected: Decimal = Field(default=0, ge=0)
    shipping_cost: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    items: List[SaleItemBase]


class SaleResponse(BaseSchema):
    id: UUID
    sale_date: date
    platform: str
    buyer_name: Optional[str] = None
    order_number: Optional[str] = None
    gross_amount: Decimal
    platform_fees: Decimal
    payment_fees: Decimal
    shipping_collected: Decimal
    shipping_cost: Decimal
    net_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


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