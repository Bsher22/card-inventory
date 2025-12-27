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
from pydantic import BaseModel, Field, ConfigDict


# ============================================
# BRAND SCHEMAS
# ============================================

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)


class BrandResponse(BrandBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BrandWithProducts(BrandResponse):
    """Brand with nested product lines"""
    product_lines: list["ProductLineResponse"] = []

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
    brand_id: str


class ProductLineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None


class ProductLineResponse(ProductLineBase):
    id: str
    brand_id: str
    created_at: datetime
    updated_at: datetime
    brand: Optional[BrandResponse] = None
    checklist_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class ProductLineWithBrand(ProductLineResponse):
    """Product line with nested brand"""
    brand: BrandResponse


class ProductLineSummary(BaseModel):
    """Summary statistics for product lines"""
    id: str
    brand_name: str
    name: str
    year: int
    checklist_count: int = 0
    inventory_count: int = 0
    completion_pct: float = 0.0
    
    model_config = ConfigDict(from_attributes=True)


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


class PlayerResponse(PlayerBase):
    id: str
    name_normalized: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


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
    product_line_id: str
    player_id: Optional[str] = None
    card_type_id: Optional[str] = None


class ChecklistUpdate(BaseModel):
    card_number: Optional[str] = Field(None, min_length=1, max_length=50)
    card_prefix: Optional[str] = Field(None, max_length=20)
    card_suffix: Optional[str] = Field(None, max_length=10)
    player_name_raw: Optional[str] = Field(None, min_length=1, max_length=200)
    player_id: Optional[str] = None
    team: Optional[str] = Field(None, max_length=100)
    set_name: Optional[str] = Field(None, max_length=100)
    parallel_name: Optional[str] = Field(None, max_length=100)
    is_autograph: Optional[bool] = None
    is_relic: Optional[bool] = None
    is_rookie_card: Optional[bool] = None
    is_first_bowman: Optional[bool] = None
    serial_numbered: Optional[int] = Field(None, ge=1)


class ChecklistResponse(ChecklistBase):
    id: str
    product_line_id: str
    player_id: Optional[str] = None
    card_type_id: Optional[str] = None
    raw_checklist_line: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    player: Optional[PlayerResponse] = None
    product_line: Optional[ProductLineResponse] = None
    inventory_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ChecklistFilters(BaseModel):
    """Filters for checklist queries"""
    product_line_id: Optional[str] = None
    brand_id: Optional[str] = None
    player_id: Optional[str] = None
    search: Optional[str] = None
    set_name: Optional[str] = None
    is_autograph: Optional[bool] = None
    is_relic: Optional[bool] = None
    is_rookie_card: Optional[bool] = None
    is_first_bowman: Optional[bool] = None
    has_inventory: Optional[bool] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


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
    checklist_id: str


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


class InventoryResponse(InventoryBase):
    id: str
    checklist_id: str
    created_at: datetime
    updated_at: datetime
    checklist: Optional[ChecklistResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


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


class ConsignerResponse(ConsignerBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConsignmentItemBase(BaseModel):
    checklist_id: str
    quantity: int = Field(default=1, ge=1)
    fee_per_card: Decimal = Field(default=0, ge=0)
    status: str = Field(default="pending", max_length=50)
    notes: Optional[str] = None


class ConsignmentBase(BaseModel):
    consigner_id: str
    date_sent: date
    notes: Optional[str] = None


class ConsignmentCreate(ConsignmentBase):
    items: List[ConsignmentItemBase]


class ConsignmentResponse(BaseModel):
    id: str
    consigner_id: str
    date_sent: date
    date_returned: Optional[date] = None
    status: str
    total_cards: int
    total_fee: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    consigner: Optional[ConsignerResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


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


class GradingCompanyResponse(GradingCompanyBase):
    id: str
    
    model_config = ConfigDict(from_attributes=True)


class GradingServiceLevelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_per_card: Decimal = Field(..., ge=0)
    turnaround_days: Optional[int] = Field(None, ge=1)
    is_active: bool = True


class GradingServiceLevelCreate(GradingServiceLevelBase):
    company_id: str


class GradingServiceLevelResponse(GradingServiceLevelBase):
    id: str
    company_id: str
    
    model_config = ConfigDict(from_attributes=True)


class GradingSubmissionItemBase(BaseModel):
    checklist_id: str
    declared_value: Decimal = Field(default=0, ge=0)


class GradingSubmissionItemResponse(GradingSubmissionItemBase):
    id: str
    submission_id: str
    grade_received: Optional[Decimal] = None
    auto_grade_received: Optional[Decimal] = None
    cert_number: Optional[str] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class GradingSubmissionBase(BaseModel):
    company_id: str
    service_level_id: str
    submission_number: Optional[str] = Field(None, max_length=100)
    date_submitted: date
    notes: Optional[str] = None


class GradingSubmissionCreate(GradingSubmissionBase):
    items: List[GradingSubmissionItemBase]


class GradingSubmissionResponse(BaseModel):
    id: str
    company_id: str
    service_level_id: str
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
    
    model_config = ConfigDict(from_attributes=True)


# ============================================
# FINANCIAL SCHEMAS
# ============================================

class PurchaseItemBase(BaseModel):
    checklist_id: str
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(default=0, ge=0)
    condition: str = Field(default="NM", max_length=20)
    notes: Optional[str] = None


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


class PurchaseResponse(PurchaseBase):
    id: str
    subtotal: Decimal
    total: Decimal
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SaleItemBase(BaseModel):
    checklist_id: str
    quantity: int = Field(default=1, ge=1)
    sale_price: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


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


class SaleResponse(SaleBase):
    id: str
    gross_amount: Decimal
    net_amount: Decimal
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


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
    player_id: str
    player_name: str
    team: Optional[str] = None
    total_cards: int
    unique_cards: int
    autograph_count: int
    rookie_count: int
    first_bowman_count: int
    graded_count: int
    total_value: Decimal


class ProductLineSummary(BaseModel):
    """Product line analytics"""
    product_line_id: str
    product_line_name: str
    year: int
    brand_name: str
    checklist_count: int
    inventory_count: int
    completion_percentage: float
    total_value: Decimal