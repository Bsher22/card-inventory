"""Schemas for consigner player pricing"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# BASE SCHEMAS
# ============================================

class ConsignerPlayerPriceBase(BaseModel):
    """Base schema for consigner player price"""
    consigner_id: UUID
    player_id: UUID
    price_per_card: Decimal = Field(..., ge=0, description="Price per card for this player")
    notes: Optional[str] = None
    effective_date: Optional[date] = None
    is_active: bool = True


class ConsignerPlayerPriceCreate(ConsignerPlayerPriceBase):
    """Schema for creating a new price entry"""
    pass


class ConsignerPlayerPriceUpdate(BaseModel):
    """Schema for updating a price entry"""
    price_per_card: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    effective_date: Optional[date] = None
    is_active: Optional[bool] = None


class ConsignerPlayerPriceResponse(ConsignerPlayerPriceBase):
    """Schema for price entry response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Nested info for convenience
    consigner_name: Optional[str] = None
    player_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# MATRIX VIEW SCHEMAS
# ============================================

class PlayerPriceInfo(BaseModel):
    """Price info for a single player from a single consigner"""
    price_id: Optional[UUID] = None
    price_per_card: Optional[Decimal] = None
    notes: Optional[str] = None
    effective_date: Optional[date] = None


class ConsignerColumn(BaseModel):
    """Consigner info for matrix columns"""
    id: UUID
    name: str
    default_fee: Optional[Decimal] = None
    is_active: bool = True


class PlayerRow(BaseModel):
    """Player row in the matrix with prices from all consigners"""
    id: UUID
    name: str
    team: Optional[str] = None
    prices: dict[str, PlayerPriceInfo] = {}  # consigner_id -> price info


class PricingMatrixResponse(BaseModel):
    """Full pricing matrix response"""
    consigners: list[ConsignerColumn]
    players: list[PlayerRow]
    total_players: int
    total_consigners: int


# ============================================
# BULK OPERATIONS
# ============================================

class BulkPriceEntry(BaseModel):
    """Single entry for bulk price updates"""
    consigner_id: UUID
    player_id: UUID
    price_per_card: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class BulkPriceCreate(BaseModel):
    """Schema for bulk creating/updating prices"""
    prices: list[BulkPriceEntry]
    replace_existing: bool = False  # If true, deactivate existing prices first


class BulkPriceResult(BaseModel):
    """Result of bulk price operation"""
    created: int
    updated: int
    errors: list[str] = []


# ============================================
# LOOKUP SCHEMAS
# ============================================

class PriceLookupRequest(BaseModel):
    """Request to look up best price for a player"""
    player_id: UUID
    prefer_consigner_id: Optional[UUID] = None  # Optionally prefer a specific consigner


class PriceLookupResponse(BaseModel):
    """Response with best available price"""
    player_id: UUID
    player_name: str

    # Best price option
    best_consigner_id: Optional[UUID] = None
    best_consigner_name: Optional[str] = None
    best_price: Optional[Decimal] = None

    # All available options
    all_prices: list[ConsignerPlayerPriceResponse] = []


class ConsignerPriceSummary(BaseModel):
    """Summary of a consigner's pricing"""
    consigner_id: UUID
    consigner_name: str
    total_players_priced: int
    avg_price: Optional[Decimal] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
