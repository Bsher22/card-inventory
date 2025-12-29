"""
Inventory Routes

Handles inventory CRUD operations and analytics.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    InventoryCreate, InventoryUpdate, InventoryAdjust,
    InventoryResponse, InventoryWithCard, PlayerInventorySummary,
    InventoryAnalytics
)
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("/inventory", response_model=list[InventoryWithCard])
async def list_inventory(
    product_line_id: Optional[UUID] = Query(None),
    player_id: Optional[UUID] = Query(None),
    brand_id: Optional[UUID] = Query(None),
    in_stock_only: bool = Query(True),
    is_signed: Optional[bool] = Query(None),
    is_slabbed: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List inventory items with optional filters."""
    service = InventoryService(db)
    return await service.get_all(
        skip=skip,
        limit=limit,
        product_line_id=product_line_id,
        player_id=player_id,
        brand_id=brand_id,
        in_stock_only=in_stock_only,
        is_signed=is_signed,
        is_slabbed=is_slabbed,
        search=search,
    )


@router.get("/inventory/analytics", response_model=InventoryAnalytics)
async def get_inventory_analytics(db: AsyncSession = Depends(get_db)):
    """Get comprehensive inventory analytics."""
    service = InventoryService(db)
    return await service.get_analytics()


@router.get("/inventory/players", response_model=list[PlayerInventorySummary])
async def get_player_inventory_summary(
    limit: int = Query(20, ge=1, le=100),
    min_cards: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    """Get inventory summary grouped by player."""
    service = InventoryService(db)
    return await service.get_player_summary(limit=limit, min_cards=min_cards)


@router.get("/inventory/{inventory_id}", response_model=InventoryWithCard)
async def get_inventory_item(
    inventory_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single inventory item."""
    service = InventoryService(db)
    inventory = await service.get_by_id(inventory_id)
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return inventory


@router.post("/inventory", response_model=InventoryResponse, status_code=201)
async def create_inventory(
    data: InventoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new inventory item."""
    service = InventoryService(db)
    
    try:
        return await service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/inventory/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(
    inventory_id: UUID,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an inventory item."""
    service = InventoryService(db)
    inventory = await service.update(inventory_id, data)
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return inventory


@router.post("/inventory/{inventory_id}/adjust", response_model=InventoryResponse)
async def adjust_inventory_quantity(
    inventory_id: UUID,
    data: InventoryAdjust,
    db: AsyncSession = Depends(get_db),
):
    """Adjust inventory quantity by a positive or negative amount."""
    service = InventoryService(db)
    
    try:
        inventory = await service.adjust_quantity(inventory_id, data.adjustment)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return inventory
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/inventory/{inventory_id}", status_code=204)
async def delete_inventory(
    inventory_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an inventory item."""
    service = InventoryService(db)
    deleted = await service.delete(inventory_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Inventory item not found")


# ============================================
# BULK INVENTORY OPERATIONS
# ============================================

from pydantic import BaseModel
from decimal import Decimal


class BulkInventoryItem(BaseModel):
    checklist_id: UUID
    quantity: int
    condition: str = "NM"
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None


class BulkInventoryAdd(BaseModel):
    items: list[BulkInventoryItem]


class BulkInventoryResult(BaseModel):
    success_count: int
    error_count: int
    errors: list[str] = []


@router.post("/inventory/bulk", response_model=BulkInventoryResult)
async def bulk_add_inventory(
    data: BulkInventoryAdd,
    db: AsyncSession = Depends(get_db),
):
    """Add multiple items to inventory at once."""
    service = InventoryService(db)
    result = BulkInventoryResult(success_count=0, error_count=0)
    
    for item in data.items:
        try:
            await service.add_to_inventory(
                checklist_id=item.checklist_id,
                quantity=item.quantity,
                condition=item.condition,
                grade_company=item.grade_company,
                grade_value=item.grade_value,
            )
            result.success_count += 1
        except Exception as e:
            result.error_count += 1
            result.errors.append(f"Checklist {item.checklist_id}: {str(e)}")
    
    return result
