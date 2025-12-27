"""
Player Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema


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
