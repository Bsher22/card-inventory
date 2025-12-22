"""
Brand and Product Line Routes
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Brand, ProductLine, Checklist, Inventory
from app.schemas import (
    BrandCreate, BrandResponse, BrandWithProducts,
    ProductLineCreate, ProductLineUpdate, ProductLineResponse, 
    ProductLineWithBrand, ProductLineSummary
)

router = APIRouter()


# ============================================
# BRAND ROUTES
# ============================================

@router.get("/brands", response_model=list[BrandResponse])
async def list_brands(db: AsyncSession = Depends(get_db)):
    """List all brands."""
    result = await db.execute(select(Brand).order_by(Brand.name))
    return result.scalars().all()


@router.get("/brands/{brand_id}", response_model=BrandWithProducts)
async def get_brand(brand_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a brand with its product lines."""
    result = await db.execute(
        select(Brand)
        .options(selectinload(Brand.product_lines))
        .where(Brand.id == brand_id)
    )
    brand = result.scalar_one_or_none()
    
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return brand


@router.post("/brands", response_model=BrandResponse, status_code=201)
async def create_brand(data: BrandCreate, db: AsyncSession = Depends(get_db)):
    """Create a new brand."""
    # Check for existing
    existing = await db.execute(
        select(Brand).where(Brand.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Brand with this slug already exists")
    
    brand = Brand(**data.model_dump())
    db.add(brand)
    await db.flush()
    await db.refresh(brand)
    return brand


# ============================================
# PRODUCT LINE ROUTES
# ============================================

@router.get("/product-lines", response_model=list[ProductLineSummary])
async def list_product_lines(
    brand_id: Optional[UUID] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List product lines with summary statistics."""
    from sqlalchemy import func, case
    
    # Build query with aggregations
    query = (
        select(
            ProductLine.id,
            Brand.name.label("brand_name"),
            ProductLine.name,
            ProductLine.year,
            func.count(func.distinct(Checklist.id)).label("checklist_count"),
            func.sum(
                case((Inventory.quantity > 0, 1), else_=0)
            ).label("inventory_count"),
        )
        .select_from(ProductLine)
        .join(Brand)
        .outerjoin(Checklist)
        .outerjoin(Inventory)
        .group_by(ProductLine.id, Brand.name)
        .order_by(ProductLine.year.desc(), Brand.name, ProductLine.name)
    )
    
    if brand_id:
        query = query.where(ProductLine.brand_id == brand_id)
    
    if year:
        query = query.where(ProductLine.year == year)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    summaries = []
    for row in rows:
        checklist_count = row.checklist_count or 0
        inventory_count = row.inventory_count or 0
        completion = (inventory_count / checklist_count * 100) if checklist_count > 0 else 0
        
        summaries.append(ProductLineSummary(
            id=row.id,
            brand_name=row.brand_name,
            name=row.name,
            year=row.year,
            checklist_count=checklist_count,
            inventory_count=inventory_count,
            completion_pct=round(completion, 1),
        ))
    
    return summaries


@router.get("/product-lines/{product_line_id}", response_model=ProductLineWithBrand)
async def get_product_line(
    product_line_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """Get a single product line with brand info."""
    result = await db.execute(
        select(ProductLine)
        .options(selectinload(ProductLine.brand))
        .where(ProductLine.id == product_line_id)
    )
    product_line = result.scalar_one_or_none()
    
    if not product_line:
        raise HTTPException(status_code=404, detail="Product line not found")
    
    return product_line


@router.post("/product-lines", response_model=ProductLineResponse, status_code=201)
async def create_product_line(
    data: ProductLineCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new product line."""
    # Verify brand exists
    brand = await db.get(Brand, data.brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Check for duplicate
    existing = await db.execute(
        select(ProductLine).where(
            ProductLine.brand_id == data.brand_id,
            ProductLine.name == data.name,
            ProductLine.year == data.year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Product line already exists for this brand/name/year"
        )
    
    product_line = ProductLine(**data.model_dump())
    db.add(product_line)
    await db.flush()
    await db.refresh(product_line)
    return product_line


@router.patch("/product-lines/{product_line_id}", response_model=ProductLineResponse)
async def update_product_line(
    product_line_id: UUID,
    data: ProductLineUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a product line."""
    product_line = await db.get(ProductLine, product_line_id)
    if not product_line:
        raise HTTPException(status_code=404, detail="Product line not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product_line, field, value)
    
    await db.flush()
    await db.refresh(product_line)
    return product_line


@router.delete("/product-lines/{product_line_id}", status_code=204)
async def delete_product_line(
    product_line_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a product line and all associated checklists."""
    product_line = await db.get(ProductLine, product_line_id)
    if not product_line:
        raise HTTPException(status_code=404, detail="Product line not found")
    
    await db.delete(product_line)
    await db.flush()
