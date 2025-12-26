"""
Card Types and Parallels Schemas
Pydantic schemas for API request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ============================================
# BASE SCHEMA
# ============================================

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ============================================
# CARD BASE TYPE SCHEMAS
# ============================================

class CardBaseTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: int = 0


class CardBaseTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: Optional[int] = None


class CardBaseTypeResponse(BaseSchema):
    id: UUID
    name: str
    description: Optional[str]
    sort_order: int
    created_at: datetime


class CardBaseTypeWithCounts(CardBaseTypeResponse):
    """Includes counts of related items"""
    checklist_count: int = 0
    inventory_count: int = 0


# ============================================
# PARALLEL CATEGORY SCHEMAS
# ============================================

class ParallelCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    sort_order: int = 0


class ParallelCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    sort_order: Optional[int] = None


class ParallelCategoryResponse(BaseSchema):
    id: UUID
    name: str
    sort_order: int
    created_at: datetime


class ParallelCategoryWithParallels(ParallelCategoryResponse):
    """Includes list of parallels in this category"""
    parallels: List["ParallelResponse"] = []


# ============================================
# PARALLEL SCHEMAS
# ============================================

class ParallelCreate(BaseModel):
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str = Field(..., min_length=1, max_length=50)
    print_run: Optional[int] = Field(None, ge=1)
    is_numbered: bool = True
    is_one_of_one: bool = False
    pattern_description: Optional[str] = None
    year_introduced: Optional[int] = Field(None, ge=2000, le=2030)
    typical_source: Optional[str] = None
    sort_order: int = 0


class ParallelUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    short_name: Optional[str] = Field(None, min_length=1, max_length=50)
    print_run: Optional[int] = Field(None, ge=1)
    is_numbered: Optional[bool] = None
    is_one_of_one: Optional[bool] = None
    pattern_description: Optional[str] = None
    year_introduced: Optional[int] = Field(None, ge=2000, le=2030)
    typical_source: Optional[str] = None
    sort_order: Optional[int] = None


class ParallelResponse(BaseSchema):
    id: UUID
    category_id: Optional[UUID]
    name: str
    short_name: str
    print_run: Optional[int]
    is_numbered: bool
    is_one_of_one: bool
    pattern_description: Optional[str]
    year_introduced: Optional[int]
    typical_source: Optional[str]
    sort_order: int
    created_at: datetime
    
    # Computed field for display
    display_name: Optional[str] = None


class ParallelWithCategory(ParallelResponse):
    """Includes category details"""
    category: Optional[ParallelCategoryResponse] = None


class ParallelWithInventoryCount(ParallelResponse):
    """Includes count of inventory items using this parallel"""
    inventory_count: int = 0


# ============================================
# CARD PREFIX MAPPING SCHEMAS
# ============================================

class CardPrefixMappingCreate(BaseModel):
    prefix: str = Field(..., min_length=1, max_length=20)
    product_type: str = Field(..., min_length=1, max_length=50)
    card_type: str = Field(..., min_length=1, max_length=50)
    is_autograph: bool = False
    is_prospect: bool = True
    base_type_name: Optional[str] = None
    notes: Optional[str] = None


class CardPrefixMappingResponse(BaseSchema):
    id: UUID
    prefix: str
    product_type: str
    card_type: str
    is_autograph: bool
    is_prospect: bool
    base_type_name: Optional[str]
    notes: Optional[str]


# ============================================
# UPDATED CHECKLIST SCHEMAS
# ============================================

class ChecklistCreateWithTypes(BaseModel):
    """Extended checklist create with base type support"""
    product_line_id: UUID
    card_number: str = Field(..., min_length=1, max_length=50)
    card_prefix: Optional[str] = Field(None, max_length=20)
    card_suffix: Optional[str] = Field(None, max_length=20)
    player_name_raw: Optional[str] = None
    player_id: Optional[UUID] = None
    base_type_id: Optional[UUID] = None
    set_name: Optional[str] = None
    is_autograph: bool = False
    is_rookie_card: bool = False
    team: Optional[str] = None
    raw_checklist_line: Optional[str] = None
    notes: Optional[str] = None


class ChecklistResponseWithTypes(BaseSchema):
    """Extended checklist response with base type"""
    id: UUID
    product_line_id: UUID
    card_number: str
    card_prefix: Optional[str]
    card_suffix: Optional[str]
    player_id: Optional[UUID]
    player_name_raw: Optional[str]
    base_type_id: Optional[UUID]
    set_name: Optional[str]
    is_autograph: bool
    is_rookie_card: bool
    team: Optional[str]
    raw_checklist_line: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    # Nested objects
    base_type: Optional[CardBaseTypeResponse] = None


# ============================================
# UPDATED INVENTORY SCHEMAS
# ============================================

class InventoryCreateWithParallel(BaseModel):
    """Extended inventory create with base type and parallel"""
    checklist_id: UUID
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    quantity: int = Field(..., ge=0)
    serial_number: Optional[int] = Field(None, ge=1)  # e.g., 142 of /250
    is_signed: bool = False
    is_slabbed: bool = False
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = None
    raw_condition: str = "NM"
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    total_cost: Decimal = Field(default=Decimal("0.00"))


class InventoryUpdateWithParallel(BaseModel):
    """Extended inventory update with base type and parallel"""
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    quantity: Optional[int] = Field(None, ge=0)
    serial_number: Optional[int] = Field(None, ge=1)
    is_signed: Optional[bool] = None
    is_slabbed: Optional[bool] = None
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = None
    raw_condition: Optional[str] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    total_cost: Optional[Decimal] = None


class InventoryResponseWithParallel(BaseSchema):
    """Extended inventory response with base type and parallel details"""
    id: UUID
    checklist_id: UUID
    base_type_id: Optional[UUID]
    parallel_id: Optional[UUID]
    quantity: int
    serial_number: Optional[int]
    is_signed: bool
    is_slabbed: bool
    grade_company: Optional[str]
    grade_value: Optional[Decimal]
    auto_grade: Optional[Decimal]
    cert_number: Optional[str]
    raw_condition: str
    storage_location: Optional[str]
    notes: Optional[str]
    total_cost: Decimal
    created_at: datetime
    updated_at: datetime
    
    # Nested objects
    base_type: Optional[CardBaseTypeResponse] = None
    parallel: Optional[ParallelResponse] = None


class InventoryWithFullDetails(InventoryResponseWithParallel):
    """Full inventory details including checklist and product info"""
    checklist: Optional[ChecklistResponseWithTypes] = None
    product_line_name: Optional[str] = None
    product_line_year: Optional[int] = None
    player_name: Optional[str] = None
    card_display: Optional[str] = None  # e.g., "BCP-167 Roman Anthony Purple /250"


# ============================================
# BULK OPERATIONS
# ============================================

class BulkChecklistImport(BaseModel):
    """For importing parsed checklist data"""
    product_line_id: UUID
    cards: List[ChecklistCreateWithTypes]


class BulkChecklistImportResult(BaseModel):
    """Result of bulk checklist import"""
    total_processed: int
    successful: int
    failed: int
    errors: List[dict] = []


# ============================================
# QUERY/FILTER SCHEMAS
# ============================================

class ParallelFilter(BaseModel):
    """Filter options for querying parallels"""
    category_id: Optional[UUID] = None
    is_numbered: Optional[bool] = None
    max_print_run: Optional[int] = None
    min_print_run: Optional[int] = None
    year_introduced: Optional[int] = None
    search: Optional[str] = None


class InventoryFilter(BaseModel):
    """Filter options for querying inventory"""
    checklist_id: Optional[UUID] = None
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    is_signed: Optional[bool] = None
    is_slabbed: Optional[bool] = None
    player_name: Optional[str] = None
    team: Optional[str] = None
    min_quantity: Optional[int] = None


# Forward reference resolution
ParallelCategoryWithParallels.model_rebuild()