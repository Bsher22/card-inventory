"""
Financial Routes

Handles purchases and sales tracking.
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Purchase, PurchaseItem, Sale, SaleItem, Checklist, Inventory
from app.schemas import (
    PurchaseCreate, PurchaseResponse,
    SaleCreate, SaleResponse, SalesAnalytics
)
from app.services.inventory_service import InventoryService

router = APIRouter()


# ============================================
# PURCHASE ROUTES
# ============================================

@router.get("/purchases", response_model=list[PurchaseResponse])
async def list_purchases(
    vendor: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List purchases with optional filters."""
    query = (
        select(Purchase)
        .options(selectinload(Purchase.items))
        .order_by(Purchase.purchase_date.desc())
    )

    if vendor:
        query = query.where(Purchase.vendor.ilike(f"%{vendor}%"))

    if start_date:
        query = query.where(Purchase.purchase_date >= start_date)

    if end_date:
        query = query.where(Purchase.purchase_date <= end_date)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/purchases/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single purchase with items."""
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    return purchase


@router.post("/purchases", response_model=PurchaseResponse, status_code=201)
async def create_purchase(
    data: PurchaseCreate,
    add_to_inventory: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new purchase with items.
    Optionally adds items to inventory automatically.
    """
    # Calculate total - use unit_price (matches model)
    total_cost = sum(item.quantity * item.unit_price for item in data.items)
    total_cost += data.shipping

    # Create purchase
    purchase = Purchase(
        purchase_date=data.purchase_date,
        vendor=data.vendor,
        platform=data.platform,
        order_number=data.order_number,
        subtotal=sum(item.quantity * item.unit_price for item in data.items),
        shipping=data.shipping,
        tax=data.tax,
        total=total_cost + data.tax,
        notes=data.notes,
    )
    db.add(purchase)
    await db.flush()

    # Create purchase items and optionally add to inventory
    inventory_service = InventoryService(db)

    for item_data in data.items:
        # Verify checklist exists
        checklist = await db.get(Checklist, item_data.checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=400,
                detail=f"Checklist not found: {item_data.checklist_id}"
            )

        # Create purchase item - use unit_price (matches model)
        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            checklist_id=item_data.checklist_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            condition=item_data.condition,
            notes=item_data.notes,
        )
        db.add(purchase_item)

        # Add to inventory if requested
        if add_to_inventory:
            await inventory_service.add_to_inventory(
                checklist_id=item_data.checklist_id,
                quantity=item_data.quantity,
                condition=item_data.condition,
            )

    await db.flush()
    await db.refresh(purchase)

    # Reload with items
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase.id)
    )
    return result.scalar_one()


@router.delete("/purchases/{purchase_id}", status_code=204)
async def delete_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a purchase (does not affect inventory)."""
    purchase = await db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    await db.delete(purchase)
    await db.flush()


# ============================================
# SALE ROUTES
# ============================================

@router.get("/sales", response_model=list[SaleResponse])
async def list_sales(
    platform: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List sales with optional filters."""
    query = (
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.sale_date.desc())
    )

    if platform:
        query = query.where(Sale.platform.ilike(f"%{platform}%"))

    if start_date:
        query = query.where(Sale.sale_date >= start_date)

    if end_date:
        query = query.where(Sale.sale_date <= end_date)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/sales/analytics", response_model=SalesAnalytics)
async def get_sales_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get sales analytics."""
    # Base query
    base_filter = []
    if start_date:
        base_filter.append(Sale.sale_date >= start_date)
    if end_date:
        base_filter.append(Sale.sale_date <= end_date)

    # Total sales count
    count_query = select(func.count(Sale.id))
    if base_filter:
        count_query = count_query.where(*base_filter)
    count_result = await db.execute(count_query)
    total_sales = count_result.scalar() or 0

    # Total revenue
    revenue_query = (
        select(func.sum(SaleItem.quantity * SaleItem.sale_price))
        .select_from(SaleItem)
        .join(Sale)
    )
    if base_filter:
        revenue_query = revenue_query.where(*base_filter)
    revenue_result = await db.execute(revenue_query)
    total_revenue = revenue_result.scalar() or Decimal("0")

    # Total profit (revenue - cost basis)
    profit_query = (
        select(
            func.sum(SaleItem.quantity * SaleItem.sale_price) -
            func.coalesce(func.sum(SaleItem.cost_basis), 0)
        )
        .select_from(SaleItem)
        .join(Sale)
    )
    if base_filter:
        profit_query = profit_query.where(*base_filter)
    profit_result = await db.execute(profit_query)
    total_profit = profit_result.scalar() or Decimal("0")

    # Average sale price
    avg_price = total_revenue / total_sales if total_sales > 0 else Decimal("0")

    # Sales by platform
    platform_query = (
        select(Sale.platform, func.sum(SaleItem.quantity * SaleItem.sale_price))
        .select_from(SaleItem)
        .join(Sale)
        .group_by(Sale.platform)
    )
    if base_filter:
        platform_query = platform_query.where(*base_filter)
    platform_result = await db.execute(platform_query)
    sales_by_platform = {
        (row[0] or "Unknown"): row[1] or Decimal("0")
        for row in platform_result.all()
    }

    # Sales by month - use the same expression in GROUP BY and ORDER BY
    month_expr = func.to_char(Sale.sale_date, 'YYYY-MM')
    month_query = (
        select(
            month_expr.label("month"),
            func.sum(SaleItem.quantity * SaleItem.sale_price).label("total")
        )
        .select_from(SaleItem)
        .join(Sale)
        .group_by(month_expr)
        .order_by(month_expr)
    )
    if base_filter:
        month_query = month_query.where(*base_filter)
    month_result = await db.execute(month_query)
    sales_by_month = {row[0]: row[1] or Decimal("0") for row in month_result.all()}

    return SalesAnalytics(
        total_sales=total_sales,
        total_revenue=total_revenue,
        total_profit=total_profit,
        avg_sale_price=avg_price,
        sales_by_platform=sales_by_platform,
        sales_by_month=sales_by_month,
    )


@router.get("/sales/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single sale with items."""
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()

    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    return sale


@router.post("/sales", response_model=SaleResponse, status_code=201)
async def create_sale(
    data: SaleCreate,
    remove_from_inventory: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new sale with items.
    Optionally removes items from inventory automatically.
    """
    # Calculate gross amount
    gross_amount = sum(item.quantity * item.sale_price for item in data.items)

    # Calculate net amount
    net_amount = (
        gross_amount 
        + data.shipping_collected 
        - data.platform_fees 
        - data.payment_fees 
        - data.shipping_cost
    )

    # Create sale
    sale = Sale(
        sale_date=data.sale_date,
        platform=data.platform,
        buyer_name=data.buyer_name,
        order_number=data.order_number,
        gross_amount=gross_amount,
        platform_fees=data.platform_fees,
        payment_fees=data.payment_fees,
        shipping_collected=data.shipping_collected,
        shipping_cost=data.shipping_cost,
        net_amount=net_amount,
        notes=data.notes,
    )
    db.add(sale)
    await db.flush()

    # Create sale items and optionally remove from inventory
    inventory_service = InventoryService(db)

    for item_data in data.items:
        # Verify checklist exists
        checklist = await db.get(Checklist, item_data.checklist_id)
        if not checklist:
            raise HTTPException(
                status_code=400,
                detail=f"Checklist not found: {item_data.checklist_id}"
            )

        # Try to calculate cost basis from purchase history - use unit_price
        cost_basis_query = (
            select(func.avg(PurchaseItem.unit_price))
            .where(PurchaseItem.checklist_id == item_data.checklist_id)
        )
        cost_result = await db.execute(cost_basis_query)
        avg_cost = cost_result.scalar()
        cost_basis = avg_cost * item_data.quantity if avg_cost else Decimal("0")

        # Create sale item
        sale_item = SaleItem(
            sale_id=sale.id,
            checklist_id=item_data.checklist_id,
            quantity=item_data.quantity,
            sale_price=item_data.sale_price,
            cost_basis=cost_basis,
            notes=item_data.notes,
        )
        db.add(sale_item)

        # Remove from inventory if requested
        if remove_from_inventory:
            try:
                await inventory_service.remove_from_inventory(
                    checklist_id=item_data.checklist_id,
                    quantity=item_data.quantity,
                    condition="NM",
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot complete sale: {str(e)}"
                )

    await db.flush()
    await db.refresh(sale)

    # Reload with items
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale.id)
    )
    return result.scalar_one()


@router.delete("/sales/{sale_id}", status_code=204)
async def delete_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a sale (does not affect inventory)."""
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    await db.delete(sale)
    await db.flush()