"""API routes for consigner player pricing"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.consigner_player_price_service import ConsignerPlayerPriceService
from app.schemas.consigner_player_price import (
    ConsignerPlayerPriceCreate,
    ConsignerPlayerPriceUpdate,
    ConsignerPlayerPriceResponse,
    PricingMatrixResponse,
    BulkPriceCreate,
    BulkPriceResult,
    PriceLookupResponse,
    ConsignerPriceSummary,
)

router = APIRouter(prefix="/consigner-prices", tags=["Consigner Pricing"])


def get_service(db: AsyncSession = Depends(get_db)) -> ConsignerPlayerPriceService:
    return ConsignerPlayerPriceService(db)


# ============================================
# MATRIX VIEW
# ============================================

@router.get("/matrix", response_model=PricingMatrixResponse)
async def get_pricing_matrix(
    consigner_ids: Optional[str] = Query(None, description="Comma-separated consigner UUIDs"),
    player_search: Optional[str] = Query(None, description="Search players by name"),
    only_with_prices: bool = Query(False, description="Only show players with at least one price"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """
    Get the pricing matrix showing all players and their prices from each consigner.

    Returns a grid where rows are players and columns are consigners.
    """
    # Parse consigner IDs if provided
    consigner_id_list = None
    if consigner_ids:
        try:
            consigner_id_list = [UUID(id.strip()) for id in consigner_ids.split(",")]
        except ValueError:
            raise HTTPException(400, "Invalid consigner ID format")

    return await service.get_pricing_matrix(
        consigner_ids=consigner_id_list,
        player_search=player_search,
        only_with_prices=only_with_prices,
        limit=limit,
        offset=offset,
    )


# ============================================
# CRUD OPERATIONS
# ============================================

@router.post("", response_model=ConsignerPlayerPriceResponse)
async def create_price(
    data: ConsignerPlayerPriceCreate,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Create a new price entry for a consigner/player combination"""
    return await service.create_price(data)


@router.get("/{price_id}", response_model=ConsignerPlayerPriceResponse)
async def get_price(
    price_id: UUID,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Get a single price entry by ID"""
    price = await service.get_price(price_id)
    if not price:
        raise HTTPException(404, "Price not found")
    return price


@router.patch("/{price_id}", response_model=ConsignerPlayerPriceResponse)
async def update_price(
    price_id: UUID,
    data: ConsignerPlayerPriceUpdate,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Update a price entry"""
    price = await service.update_price(price_id, data)
    if not price:
        raise HTTPException(404, "Price not found")
    return price


@router.delete("/{price_id}")
async def delete_price(
    price_id: UUID,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Delete (deactivate) a price entry"""
    success = await service.delete_price(price_id)
    if not success:
        raise HTTPException(404, "Price not found")
    return {"success": True}


# ============================================
# BULK OPERATIONS
# ============================================

@router.post("/bulk", response_model=BulkPriceResult)
async def bulk_upsert_prices(
    data: BulkPriceCreate,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Bulk create or update prices"""
    return await service.bulk_upsert_prices(data)


# ============================================
# LOOKUP ENDPOINTS
# ============================================

@router.get("/lookup/player/{player_id}", response_model=PriceLookupResponse)
async def lookup_player_price(
    player_id: UUID,
    prefer_consigner_id: Optional[UUID] = Query(None),
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """
    Look up the best price for a player.

    Optionally specify a preferred consigner - if they have a price, it will be returned
    even if it's not the lowest.
    """
    try:
        return await service.get_best_price_for_player(player_id, prefer_consigner_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/consigner/{consigner_id}/summary", response_model=ConsignerPriceSummary)
async def get_consigner_summary(
    consigner_id: UUID,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Get pricing summary for a consigner"""
    try:
        return await service.get_consigner_price_summary(consigner_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/consigner/{consigner_id}/prices", response_model=list[ConsignerPlayerPriceResponse])
async def get_consigner_prices(
    consigner_id: UUID,
    service: ConsignerPlayerPriceService = Depends(get_service),
):
    """Get all active prices for a consigner"""
    return await service.get_prices_for_consigner(consigner_id)
