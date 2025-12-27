"""
Inventory Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema
from .checklists import ChecklistResponse
from .players import PlayerInventorySummary


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
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    serial_number: Optional[int] = Field(None, ge=1)


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    serial_number: Optional[int] = Field(None, ge=1)
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
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    quantity: int
    serial_number: Optional[int] = None
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


# Alias for backward compatibility
InventoryWithCard = InventoryWithDetails


class InventoryAdjust(BaseModel):
    """Adjustment to inventory quantity"""
    quantity_change: int  # Can be positive or negative
    reason: Optional[str] = None
    notes: Optional[str] = None


class InventoryFilter(BaseModel):
    """Filters for inventory queries"""
    checklist_id: Optional[UUID] = None
    product_line_id: Optional[UUID] = None
    player_id: Optional[UUID] = None
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    is_signed: Optional[bool] = None
    is_slabbed: Optional[bool] = None
    player_name: Optional[str] = None
    team: Optional[str] = None
    min_quantity: Optional[int] = None
    search: Optional[str] = None


class InventoryBulkCreate(BaseModel):
    """Bulk create inventory items"""
    items: List[InventoryCreate]


class BulkInventoryResult(BaseModel):
    """Result of bulk inventory operation"""
    created: int = 0
    updated: int = 0
    errors: List[str] = []


class InventorySummary(BaseModel):
    """Summary statistics for inventory"""
    total_unique_cards: int
    total_quantity: int
    total_cost_basis: Decimal
    signed_count: int
    slabbed_count: int
    raw_count: int


class InventoryAnalytics(BaseModel):
    """Comprehensive inventory analytics"""
    total_unique_cards: int
    total_quantity: int
    total_cost_basis: Decimal
    total_revenue: Decimal
    total_profit: Decimal
    cards_by_brand: Dict[str, int]
    cards_by_year: Dict[int, int]
    top_players: List[PlayerInventorySummary]
