"""
Card Types and Parallels Schemas
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema


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
# FILTER SCHEMAS
# ============================================

class ParallelFilter(BaseModel):
    """Filter options for querying parallels"""
    category_id: Optional[UUID] = None
    is_numbered: Optional[bool] = None
    max_print_run: Optional[int] = None
    min_print_run: Optional[int] = None
    year_introduced: Optional[int] = None
    search: Optional[str] = None


# Forward reference resolution
ParallelCategoryWithParallels.model_rebuild()
