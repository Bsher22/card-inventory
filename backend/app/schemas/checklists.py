"""
Checklist Schemas
"""

from datetime import datetime
from typing import Optional, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema
from .players import PlayerResponse
from .products import ProductLineResponse


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


class ChecklistWithDetails(ChecklistResponse):
    """Checklist with full nested details"""
    player: Optional[PlayerResponse] = None
    product_line: Optional[ProductLineResponse] = None


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


class ChecklistUploadPreview(BaseModel):
    """Preview of checklist file before import"""
    filename: str
    detected_product: Optional[str] = None
    detected_year: Optional[int] = None
    total_rows: int
    sample_rows: List[Dict]
    column_mapping: Dict[str, str] = {}
    detected_columns: Dict[str, str] = {}
    columns_found: List[str] = []
    unmapped_columns: List[str] = []


class ChecklistUploadResult(BaseModel):
    """Result of checklist upload"""
    product_line_id: Optional[UUID] = None
    total_rows: int = 0
    cards_created: int = 0
    cards_updated: int = 0
    players_created: int = 0
    players_matched: int = 0
    errors: List[str] = []
    success: bool = True
    imported: int = 0
    skipped: int = 0


class ChecklistImportPreview(BaseModel):
    """Preview of checklist file before import"""
    filename: str
    detected_product: Optional[str] = None
    detected_year: Optional[int] = None
    total_rows: int
    sample_rows: List[Dict]
    column_mapping: Dict[str, str]
