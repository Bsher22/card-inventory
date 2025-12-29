# app/schemas/card_types.py
"""
Card Types and Parallels Schemas
Pydantic schemas for card base types, parallels, and related types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


# ============================================
# CARD BASE TYPE SCHEMAS
# ============================================

class CardBaseTypeBase(BaseModel):
    """Base schema for card base types."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: int = 0


class CardBaseTypeCreate(CardBaseTypeBase):
    """Schema for creating a card base type."""
    pass


class CardBaseTypeUpdate(BaseModel):
    """Schema for updating a card base type."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    sort_order: Optional[int] = None


class CardBaseTypeResponse(CardBaseTypeBase):
    """Schema for card base type response."""
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CardBaseTypeWithCounts(CardBaseTypeResponse):
    """Card base type with checklist and inventory counts."""
    checklist_count: int = 0
    inventory_count: int = 0


# ============================================
# PARALLEL CATEGORY SCHEMAS
# ============================================

class ParallelCategoryBase(BaseModel):
    """Base schema for parallel categories."""
    name: str = Field(..., min_length=1, max_length=50)
    sort_order: int = 0


class ParallelCategoryCreate(ParallelCategoryBase):
    """Schema for creating a parallel category."""
    pass


class ParallelCategoryUpdate(BaseModel):
    """Schema for updating a parallel category."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    sort_order: Optional[int] = None


class ParallelCategoryResponse(ParallelCategoryBase):
    """Schema for parallel category response."""
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# PARALLEL SCHEMAS
# ============================================

class ParallelBase(BaseModel):
    """Base schema for parallels."""
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str = Field(..., min_length=1, max_length=50)
    numbered_to: Optional[int] = Field(None, ge=1, description="Serial number limit (e.g., 25 for /25). NULL = unnumbered")
    is_numbered: bool = True
    is_one_of_one: bool = False
    pattern_description: Optional[str] = None
    year_introduced: Optional[int] = Field(None, ge=1900, le=2100)
    typical_source: Optional[str] = Field(None, max_length=100)
    sort_order: int = 0


class ParallelCreate(ParallelBase):
    """Schema for creating a parallel."""
    pass


class ParallelUpdate(BaseModel):
    """Schema for updating a parallel."""
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    short_name: Optional[str] = Field(None, min_length=1, max_length=50)
    numbered_to: Optional[int] = Field(None, ge=1)
    is_numbered: Optional[bool] = None
    is_one_of_one: Optional[bool] = None
    pattern_description: Optional[str] = None
    year_introduced: Optional[int] = Field(None, ge=1900, le=2100)
    typical_source: Optional[str] = Field(None, max_length=100)
    sort_order: Optional[int] = None


class ParallelResponse(ParallelBase):
    """Schema for parallel response."""
    id: UUID
    created_at: datetime

    @computed_field
    @property
    def display_name(self) -> str:
        """Returns display-friendly name with numbering."""
        if self.numbered_to == 1:
            return f"{self.short_name} 1/1"
        elif self.numbered_to:
            return f"{self.short_name} /{self.numbered_to}"
        return self.short_name

    class Config:
        from_attributes = True


class ParallelWithCategory(ParallelResponse):
    """Parallel with its category information."""
    category: Optional[ParallelCategoryResponse] = None


class ParallelWithInventoryCount(ParallelResponse):
    """Parallel with inventory count."""
    inventory_count: int = 0


class ParallelCategoryWithParallels(ParallelCategoryResponse):
    """Category with its parallels."""
    parallels: List[ParallelResponse] = []


# ============================================
# PARALLEL FILTER SCHEMA
# ============================================

class ParallelFilter(BaseModel):
    """Schema for filtering parallels."""
    category_id: Optional[UUID] = None
    is_numbered: Optional[bool] = None
    max_numbered_to: Optional[int] = Field(None, ge=1)
    min_numbered_to: Optional[int] = Field(None, ge=1)
    year_introduced: Optional[int] = None
    search: Optional[str] = None


# ============================================
# CARD PREFIX MAPPING SCHEMAS
# ============================================

class CardPrefixMappingBase(BaseModel):
    """Base schema for card prefix mappings."""
    prefix: str = Field(..., min_length=1, max_length=20)
    product_type: str = Field(..., min_length=1, max_length=50)
    card_type: str = Field(..., min_length=1, max_length=50)
    is_autograph: bool = False
    is_prospect: bool = False
    base_type_name: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class CardPrefixMappingCreate(CardPrefixMappingBase):
    """Schema for creating a card prefix mapping."""
    pass


class CardPrefixMappingResponse(CardPrefixMappingBase):
    """Schema for card prefix mapping response."""
    id: UUID

    class Config:
        from_attributes = True


# ============================================
# CHECKLIST PARSING SCHEMAS
# ============================================

class ChecklistCreateWithTypes(BaseModel):
    """Schema for creating a checklist entry with type information."""
    card_number: str
    card_prefix: Optional[str] = None
    card_suffix: Optional[str] = None
    player_name_raw: str
    team: Optional[str] = None
    set_name: Optional[str] = None
    is_autograph: bool = False
    is_relic: bool = False
    is_rookie_card: bool = False
    is_first_bowman: bool = False
    serial_numbered: Optional[int] = None
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None


class ChecklistParseResult(BaseModel):
    """Result from parsing a checklist PDF/Excel."""
    success: bool
    product_name: Optional[str] = None
    year: Optional[int] = None
    total_cards: int = 0
    prospect_cards: int = 0
    auto_cards: int = 0
    first_bowman_cards: int = 0
    parsed_cards: List[ChecklistCreateWithTypes] = []
    errors: List[str] = []
    warnings: List[str] = []


class BulkChecklistImportResult(BaseModel):
    """Result from bulk importing checklists."""
    success: bool
    product_line_id: Optional[UUID] = None
    cards_created: int = 0
    cards_updated: int = 0
    cards_skipped: int = 0
    players_created: int = 0
    players_matched: int = 0
    errors: List[str] = []