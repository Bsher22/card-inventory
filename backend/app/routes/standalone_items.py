"""
Standalone Items Routes

API endpoints for managing item categories, standalone items, and sports.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.standalone_items import ItemCategory, StandaloneItem, Sport
from app.models.inventory import Inventory
from app.schemas.standalone_items import (
    ItemCategoryCreate,
    ItemCategoryUpdate,
    ItemCategoryResponse,
    StandaloneItemCreate,
    StandaloneItemUpdate,
    StandaloneItemResponse,
    StandaloneItemSummary,
    SportResponse,
    ITEM_TYPES,
    SPORTS,
    AUTHENTICATORS,
    MEMORABILIA_TYPES,
    COLLECTIBLE_TYPES,
    CONDITIONS,
)

router = APIRouter()


# ============================================
# ITEM CATEGORIES ROUTES
# ============================================

@router.get("/item-categories", response_model=list[ItemCategoryResponse])
async def list_item_categories(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List all item categories."""
    query = select(ItemCategory).order_by(ItemCategory.sort_order)
    if active_only:
        query = query.where(ItemCategory.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/item-categories/{category_id}", response_model=ItemCategoryResponse)
async def get_item_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single item category."""
    result = await db.execute(
        select(ItemCategory).where(ItemCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/item-categories", response_model=ItemCategoryResponse)
async def create_item_category(
    data: ItemCategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new item category."""
    category = ItemCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/item-categories/{category_id}", response_model=ItemCategoryResponse)
async def update_item_category(
    category_id: UUID,
    data: ItemCategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an item category."""
    result = await db.execute(
        select(ItemCategory).where(ItemCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    await db.commit()
    await db.refresh(category)
    return category


# ============================================
# SPORTS ROUTES
# ============================================

@router.get("/sports", response_model=list[SportResponse])
async def list_sports(db: AsyncSession = Depends(get_db)):
    """List all sports."""
    result = await db.execute(select(Sport).order_by(Sport.sort_order))
    return result.scalars().all()


# ============================================
# STANDALONE ITEMS ROUTES
# ============================================

@router.get("/standalone-items", response_model=list[StandaloneItemResponse])
async def list_standalone_items(
    category_id: Optional[UUID] = Query(None),
    sport: Optional[str] = Query(None),
    player_name: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    is_authenticated: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List standalone items with filters."""
    query = select(StandaloneItem).options(
        selectinload(StandaloneItem.category)
    ).order_by(StandaloneItem.created_at.desc())
    
    # Apply filters
    if category_id:
        query = query.where(StandaloneItem.category_id == category_id)
    if sport:
        query = query.where(StandaloneItem.sport == sport)
    if player_name:
        query = query.where(StandaloneItem.player_name.ilike(f"%{player_name}%"))
    if team:
        query = query.where(StandaloneItem.team.ilike(f"%{team}%"))
    if year:
        query = query.where(StandaloneItem.year == year)
    if is_authenticated is not None:
        query = query.where(StandaloneItem.is_authenticated == is_authenticated)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                StandaloneItem.title.ilike(search_term),
                StandaloneItem.description.ilike(search_term),
                StandaloneItem.player_name.ilike(search_term),
                StandaloneItem.team.ilike(search_term),
                StandaloneItem.brand.ilike(search_term),
            )
        )
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/standalone-items/summary", response_model=list[StandaloneItemSummary])
async def list_standalone_items_summary(
    category_id: Optional[UUID] = Query(None),
    sport: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get minimal standalone item info for dropdowns and selection."""
    query = select(StandaloneItem).order_by(StandaloneItem.title)
    
    if category_id:
        query = query.where(StandaloneItem.category_id == category_id)
    if sport:
        query = query.where(StandaloneItem.sport == sport)
    if search:
        query = query.where(StandaloneItem.title.ilike(f"%{search}%"))
    
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/standalone-items/{item_id}", response_model=StandaloneItemResponse)
async def get_standalone_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single standalone item."""
    result = await db.execute(
        select(StandaloneItem)
        .options(selectinload(StandaloneItem.category))
        .where(StandaloneItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/standalone-items", response_model=StandaloneItemResponse)
async def create_standalone_item(
    data: StandaloneItemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new standalone item."""
    # Verify category exists
    cat_result = await db.execute(
        select(ItemCategory).where(ItemCategory.id == data.category_id)
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid category_id")
    
    item = StandaloneItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    # Reload with category
    result = await db.execute(
        select(StandaloneItem)
        .options(selectinload(StandaloneItem.category))
        .where(StandaloneItem.id == item.id)
    )
    return result.scalar_one()


@router.patch("/standalone-items/{item_id}", response_model=StandaloneItemResponse)
async def update_standalone_item(
    item_id: UUID,
    data: StandaloneItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a standalone item."""
    result = await db.execute(
        select(StandaloneItem).where(StandaloneItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verify category if being updated
    if 'category_id' in update_data:
        cat_result = await db.execute(
            select(ItemCategory).where(ItemCategory.id == update_data['category_id'])
        )
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid category_id")
    
    for key, value in update_data.items():
        setattr(item, key, value)
    
    await db.commit()
    
    # Reload with category
    result = await db.execute(
        select(StandaloneItem)
        .options(selectinload(StandaloneItem.category))
        .where(StandaloneItem.id == item_id)
    )
    return result.scalar_one()


@router.delete("/standalone-items/{item_id}")
async def delete_standalone_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a standalone item."""
    result = await db.execute(
        select(StandaloneItem).where(StandaloneItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if item has inventory
    inv_result = await db.execute(
        select(func.count()).select_from(Inventory).where(
            Inventory.standalone_item_id == item_id
        )
    )
    inv_count = inv_result.scalar()
    if inv_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete item with {inv_count} inventory records"
        )
    
    await db.delete(item)
    await db.commit()
    return {"message": "Item deleted"}


# ============================================
# CONSTANTS/OPTIONS ROUTES
# ============================================

@router.get("/options/item-types")
async def get_item_types():
    """Get available item types."""
    return ITEM_TYPES


@router.get("/options/sports")
async def get_sports_list():
    """Get available sports."""
    return SPORTS


@router.get("/options/authenticators")
async def get_authenticators():
    """Get available authenticators."""
    return AUTHENTICATORS


@router.get("/options/memorabilia-types")
async def get_memorabilia_types():
    """Get available memorabilia types."""
    return MEMORABILIA_TYPES


@router.get("/options/collectible-types")
async def get_collectible_types():
    """Get available collectible types."""
    return COLLECTIBLE_TYPES


@router.get("/options/conditions")
async def get_conditions():
    """Get available conditions."""
    return CONDITIONS


# ============================================
# STATISTICS
# ============================================

@router.get("/standalone-items/stats")
async def get_standalone_items_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for standalone items."""
    # Total items by category
    cat_stats = await db.execute(
        select(
            ItemCategory.name,
            func.count(StandaloneItem.id).label('count')
        )
        .outerjoin(StandaloneItem, StandaloneItem.category_id == ItemCategory.id)
        .group_by(ItemCategory.id, ItemCategory.name)
        .order_by(ItemCategory.sort_order)
    )
    by_category = {row.name: row.count for row in cat_stats.all()}
    
    # Total items by sport
    sport_stats = await db.execute(
        select(
            StandaloneItem.sport,
            func.count(StandaloneItem.id).label('count')
        )
        .group_by(StandaloneItem.sport)
    )
    by_sport = {row.sport: row.count for row in sport_stats.all()}
    
    # Total authenticated items
    auth_result = await db.execute(
        select(func.count()).select_from(StandaloneItem).where(
            StandaloneItem.is_authenticated == True
        )
    )
    authenticated_count = auth_result.scalar()
    
    # Total items
    total_result = await db.execute(
        select(func.count()).select_from(StandaloneItem)
    )
    total_count = total_result.scalar()
    
    return {
        "total": total_count,
        "authenticated": authenticated_count,
        "by_category": by_category,
        "by_sport": by_sport,
    }
