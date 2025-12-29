"""
Standalone Items Schemas

Pydantic schemas for item categories, standalone items, and sports.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# ITEM CATEGORY SCHEMAS
# ============================================

class ItemCategoryBase(BaseModel):
    """Base schema for item categories."""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class ItemCategoryCreate(ItemCategoryBase):
    """Schema for creating an item category."""
    pass


class ItemCategoryUpdate(BaseModel):
    """Schema for updating an item category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ItemCategoryResponse(ItemCategoryBase):
    """Schema for item category response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# SPORT SCHEMAS
# ============================================

class SportResponse(BaseModel):
    """Schema for sport response."""
    id: UUID
    name: str
    slug: str
    sort_order: int

    class Config:
        from_attributes = True


# ============================================
# STANDALONE ITEM SCHEMAS
# ============================================

class StandaloneItemBase(BaseModel):
    """Base schema for standalone items."""
    category_id: UUID
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    sport: str = Field(default="Baseball", max_length=50)
    brand: Optional[str] = Field(None, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    
    # Person/Team
    player_name: Optional[str] = Field(None, max_length=200)
    team: Optional[str] = Field(None, max_length=100)
    
    # Authentication
    is_authenticated: bool = False
    authenticator: Optional[str] = Field(None, max_length=50)
    cert_number: Optional[str] = Field(None, max_length=100)
    
    # Physical attributes
    item_type: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=100)
    material: Optional[str] = Field(None, max_length=100)
    
    # Condition
    condition: str = Field(default="Excellent", max_length=50)
    condition_notes: Optional[str] = None
    
    # Flexible specs
    item_specs: dict[str, Any] = Field(default_factory=dict)
    
    notes: Optional[str] = None


class StandaloneItemCreate(StandaloneItemBase):
    """Schema for creating a standalone item."""
    pass


class StandaloneItemUpdate(BaseModel):
    """Schema for updating a standalone item."""
    category_id: Optional[UUID] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    sport: Optional[str] = Field(None, max_length=50)
    brand: Optional[str] = Field(None, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    
    player_name: Optional[str] = Field(None, max_length=200)
    team: Optional[str] = Field(None, max_length=100)
    
    is_authenticated: Optional[bool] = None
    authenticator: Optional[str] = Field(None, max_length=50)
    cert_number: Optional[str] = Field(None, max_length=100)
    
    item_type: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=100)
    material: Optional[str] = Field(None, max_length=100)
    
    condition: Optional[str] = Field(None, max_length=50)
    condition_notes: Optional[str] = None
    
    item_specs: Optional[dict[str, Any]] = None
    
    notes: Optional[str] = None


class StandaloneItemResponse(StandaloneItemBase):
    """Schema for standalone item response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    category: Optional[ItemCategoryResponse] = None

    class Config:
        from_attributes = True


class StandaloneItemSummary(BaseModel):
    """Minimal standalone item info for dropdowns."""
    id: UUID
    title: str
    sport: str
    category_id: UUID
    player_name: Optional[str] = None
    team: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# INVENTORY WITH STANDALONE SUPPORT
# ============================================

class UnifiedInventoryResponse(BaseModel):
    """
    Unified inventory response that works for both cards and standalone items.
    """
    id: UUID
    item_type: str  # 'card', 'memorabilia', 'collectible'
    quantity: int
    total_cost: float
    
    # Common fields
    is_signed: bool
    is_slabbed: bool
    grade_company: Optional[str] = None
    grade_value: Optional[float] = None
    raw_condition: str
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    # Card-specific (null for standalone items)
    checklist_id: Optional[UUID] = None
    checklist: Optional[Any] = None  # ChecklistResponse when present
    
    # Standalone-specific (null for cards)
    standalone_item_id: Optional[UUID] = None
    standalone_item: Optional[StandaloneItemResponse] = None
    
    # Computed/display fields
    display_title: Optional[str] = None
    sport: Optional[str] = None
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# STANDALONE ITEM FILTERS
# ============================================

class StandaloneItemFilters(BaseModel):
    """Filters for querying standalone items."""
    category_id: Optional[UUID] = None
    sport: Optional[str] = None
    player_name: Optional[str] = None
    team: Optional[str] = None
    year: Optional[int] = None
    is_authenticated: Optional[bool] = None
    search: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


# ============================================
# CONSTANTS
# ============================================

ITEM_TYPES = ['card', 'memorabilia', 'collectible']

SPORTS = [
    'Baseball', 'Basketball', 'Football', 'Hockey', 
    'Soccer', 'Golf', 'NASCAR', 'Wrestling', 'MMA', 'Other'
]

AUTHENTICATORS = [
    'PSA/DNA', 'JSA', 'Beckett Authentication', 'SGC', 
    'Fanatics', 'MLB Authentication', 'Steiner', 'Other'
]

MEMORABILIA_TYPES = [
    'Baseball', 'Basketball', 'Football', 'Hockey Puck', 'Golf Ball',
    'Jersey', 'Helmet', 'Bat', 'Glove', 'Cleats',
    'Photo', 'Poster', 'Lithograph',
    'Game-Used', 'Event-Used',
    'Book', 'Magazine',
    'Other'
]

COLLECTIBLE_TYPES = [
    'Diecast', 'Bobblehead', 'Figurine', 'Funko Pop',
    'SGA Item', 'Stadium Giveaway',
    'Program', 'Ticket', 'Media Pass',
    'Plaque', 'Award', 'Trophy',
    'Novelty', 'Promotional',
    'Other'
]

CONDITIONS = [
    'Mint', 'Near Mint', 'Excellent', 'Very Good', 
    'Good', 'Fair', 'Poor'
]
