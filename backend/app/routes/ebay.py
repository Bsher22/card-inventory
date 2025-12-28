"""
eBay Listing Routes

Endpoints for generating eBay listing data from inventory.
"""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.ebay import EbayListingRequest, EbayListingResponse
from app.services.ebay_listing_service import EbayListingService

router = APIRouter()


@router.post("/ebay-listings/generate", response_model=EbayListingResponse)
async def generate_ebay_listings(
    request: EbayListingRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate eBay listing data for selected inventory items.
    
    Returns complete listing data including:
    - Title (80 char max, optimized for search)
    - Minimum price (2x cost basis)
    - Item specifics (all eBay required fields)
    """
    service = EbayListingService(db)
    
    try:
        listings = await service.generate_listings(request.inventory_ids)
        
        if not listings:
            raise HTTPException(
                status_code=404,
                detail="No valid inventory items found for the given IDs"
            )
        
        total_min_price = sum(listing.min_price for listing in listings)
        
        return EbayListingResponse(
            listings=listings,
            total_count=len(listings),
            total_min_price=total_min_price,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating listings: {str(e)}"
        )


@router.get("/ebay-listings/preview/{inventory_id}", response_model=EbayListingResponse)
async def preview_single_listing(
    inventory_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Preview eBay listing for a single inventory item."""
    service = EbayListingService(db)
    
    listings = await service.generate_listings([inventory_id])
    
    if not listings:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )
    
    return EbayListingResponse(
        listings=listings,
        total_count=1,
        total_min_price=listings[0].min_price,
    )
