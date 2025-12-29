"""
Financial Routes: Purchases, Sales, Analytics

Features:
1. INLINE CARD ENTRY for purchases:
   - If PurchaseItemCreate has checklist_id, use it directly
   - If not, use inline fields (year, card_type, player) to find/create checklist
   
2. Standard sales CRUD with eBay source tracking
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Purchase, PurchaseItem,
    Sale, SaleItem,
    Checklist, ProductLine, Brand,
    Inventory
)
from app.schemas.financial import (
    PurchaseCreate, PurchaseResponse, PurchaseItemCreate,
    SaleCreate, SaleResponse,
    SalesAnalytics, PurchaseAnalytics, DashboardStats,
    CARD_TYPE_OPTIONS, PARALLEL_OPTIONS, PLATFORM_OPTIONS, GRADE_COMPANY_OPTIONS
)
from app.utils.auth import get_current_user

router = APIRouter(tags=["financial"])


# ============================================
# HELPER: Find or Create Product Line
# ============================================

async def find_or_create_product_line(
    db: AsyncSession,
    year: int,
    card_type: str
) -> ProductLine:
    """Find existing product line or create a new one"""
    
    # Determine brand from card type
    brand_name = "Bowman" if "Bowman" in card_type else "Topps"
    
    # Find or create brand
    brand_result = await db.execute(
        select(Brand).where(Brand.name == brand_name)
    )
    brand = brand_result.scalar_one_or_none()
    
    if not brand:
        brand = Brand(id=uuid4(), name=brand_name)
        db.add(brand)
        await db.flush()
    
    # Find or create product line
    result = await db.execute(
        select(ProductLine).where(
            and_(
                ProductLine.year == year,
                ProductLine.name == card_type
            )
        )
    )
    product_line = result.scalar_one_or_none()
    
    if not product_line:
        product_line = ProductLine(
            id=uuid4(),
            brand_id=brand.id,
            year=year,
            name=card_type,
        )
        db.add(product_line)
        await db.flush()
    
    return product_line


# ============================================
# HELPER: Find or Create Checklist
# ============================================

async def find_or_create_checklist(
    db: AsyncSession,
    product_line: ProductLine,
    item: PurchaseItemCreate
) -> Checklist:
    """
    Find existing checklist entry or create a new one based on inline card details.
    """
    
    # Build query to find matching checklist
    query = select(Checklist).where(
        and_(
            Checklist.product_line_id == product_line.id,
            Checklist.player_name_raw == item.player,
            Checklist.is_autograph == item.is_auto
        )
    )
    
    # Match on card number if provided
    if item.card_number:
        query = query.where(Checklist.card_number == item.card_number)
    
    # Match on parallel if provided
    if item.parallel and item.parallel != "Base":
        query = query.where(Checklist.parallel_name == item.parallel)
    
    result = await db.execute(query)
    checklist = result.scalar_one_or_none()
    
    if checklist:
        return checklist
    
    # Create new checklist entry
    checklist = Checklist(
        id=uuid4(),
        product_line_id=product_line.id,
        card_number=item.card_number or "INL",  # INLine placeholder
        player_name_raw=item.player,
        parallel_name=item.parallel if item.parallel and item.parallel != "Base" else None,
        is_autograph=item.is_auto,
        is_relic=False,
        is_rookie_card=False,
        is_first_bowman=False,
    )
    db.add(checklist)
    await db.flush()
    
    return checklist


# ============================================
# HELPER: Create Inventory Entry
# ============================================

async def create_inventory_entry(
    db: AsyncSession,
    checklist: Checklist,
    item: PurchaseItemCreate,
    cost_per_card: Decimal
) -> Inventory:
    """Create inventory entry for purchased card"""
    
    inventory = Inventory(
        id=uuid4(),
        checklist_id=checklist.id,
        quantity=item.quantity,
        raw_quantity=item.quantity if not item.is_slabbed else 0,
        slabbed_quantity=item.quantity if item.is_slabbed else 0,
        parallel=item.parallel if item.parallel and item.parallel != "Base" else None,
        is_signed=item.is_signed,
        is_slabbed=item.is_slabbed,
        grade_company=item.grade_company,
        grade_value=item.grade_value,
        total_cost=cost_per_card * item.quantity,
        per_unit_cost=cost_per_card,
        source="purchase",
    )
    db.add(inventory)
    await db.flush()
    
    return inventory


# ============================================
# PURCHASE ROUTES
# ============================================

@router.get("/purchases", response_model=list[PurchaseResponse])
async def list_purchases(
    vendor: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List purchases with optional filters."""
    query = select(Purchase).options(
        selectinload(Purchase.items).selectinload(PurchaseItem.checklist)
    )
    
    if vendor:
        query = query.where(Purchase.vendor.ilike(f"%{vendor}%"))
    if platform:
        query = query.where(Purchase.platform == platform)
    if start_date:
        query = query.where(Purchase.purchase_date >= start_date)
    if end_date:
        query = query.where(Purchase.purchase_date <= end_date)
    
    query = query.order_by(Purchase.purchase_date.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/purchases/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single purchase by ID."""
    query = select(Purchase).options(
        selectinload(Purchase.items).selectinload(PurchaseItem.checklist)
    ).where(Purchase.id == purchase_id)
    
    result = await db.execute(query)
    purchase = result.scalar_one_or_none()
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return purchase


@router.post("/purchases", response_model=PurchaseResponse)
async def create_purchase(
    data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Create a new purchase.
    
    Items can reference existing checklists (checklist_id) OR provide
    inline card details (year, card_type, player) to create/find checklists.
    """
    try:
        # Calculate totals
        card_subtotal = sum(
            item.quantity * item.unit_price 
            for item in data.items
        )
        total_cost = card_subtotal + data.shipping + data.tax
        
        # Create purchase header
        purchase = Purchase(
            id=uuid4(),
            purchase_date=data.purchase_date,
            vendor=data.vendor,
            platform=data.platform,
            order_number=data.order_number,
            subtotal=card_subtotal,
            shipping=data.shipping,
            tax=data.tax,
            total=total_cost,
            notes=data.notes,
        )
        db.add(purchase)
        await db.flush()
        
        # Calculate shipping/tax per card for cost basis
        total_cards = sum(item.quantity for item in data.items)
        shipping_per_card = data.shipping / total_cards if total_cards > 0 else Decimal("0")
        tax_per_card = data.tax / total_cards if total_cards > 0 else Decimal("0")
        
        # Process each item
        for item in data.items:
            # Resolve checklist_id
            if item.checklist_id:
                # Use provided checklist_id
                checklist = await db.get(Checklist, item.checklist_id)
                if not checklist:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Checklist not found: {item.checklist_id}"
                    )
            else:
                # Create/find checklist from inline details
                product_line = await find_or_create_product_line(
                    db, item.year, item.card_type
                )
                checklist = await find_or_create_checklist(
                    db, product_line, item
                )
            
            # Create purchase item
            purchase_item = PurchaseItem(
                id=uuid4(),
                purchase_id=purchase.id,
                checklist_id=checklist.id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                condition=item.condition,
                notes=item.notes,
            )
            db.add(purchase_item)
            
            # Create inventory entry if requested
            if data.add_to_inventory:
                cost_per_card = item.unit_price + shipping_per_card + tax_per_card
                await create_inventory_entry(db, checklist, item, cost_per_card)
        
        await db.commit()
        
        # Reload with items
        result = await db.execute(
            select(Purchase)
            .options(selectinload(Purchase.items).selectinload(PurchaseItem.checklist))
            .where(Purchase.id == purchase.id)
        )
        return result.scalar_one()
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create purchase: {str(e)}"
        )


@router.delete("/purchases/{purchase_id}", status_code=204)
async def delete_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a purchase (does not affect inventory)."""
    purchase = await db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    await db.delete(purchase)
    await db.commit()


# ============================================
# DROPDOWN OPTIONS ENDPOINT
# ============================================

@router.get("/purchase-options")
async def get_purchase_options():
    """Get dropdown options for purchase form"""
    return {
        "card_types": CARD_TYPE_OPTIONS,
        "parallels": PARALLEL_OPTIONS,
        "platforms": PLATFORM_OPTIONS,
        "grade_companies": GRADE_COMPANY_OPTIONS,
    }


# ============================================
# SALE ROUTES
# ============================================

@router.get("/sales", response_model=list[SaleResponse])
async def list_sales(
    platform: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List sales with optional filters."""
    query = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.checklist)
    )
    
    if platform:
        query = query.where(Sale.platform == platform)
    if source:
        query = query.where(Sale.source == source)
    if start_date:
        query = query.where(Sale.sale_date >= start_date)
    if end_date:
        query = query.where(Sale.sale_date <= end_date)
    
    query = query.order_by(Sale.sale_date.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/sales/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single sale by ID."""
    query = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.checklist)
    ).where(Sale.id == sale_id)
    
    result = await db.execute(query)
    sale = result.scalar_one_or_none()
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return sale


@router.post("/sales", response_model=SaleResponse)
async def create_sale(
    data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new sale."""
    try:
        # Calculate totals
        gross = sum(item.quantity * item.sale_price for item in data.items)
        net = (
            gross
            + data.shipping_collected
            - data.platform_fees
            - data.payment_fees
            - data.shipping_cost
        )
        
        # Create sale
        sale = Sale(
            id=uuid4(),
            sale_date=data.sale_date,
            platform=data.platform,
            buyer_name=data.buyer_name,
            order_number=data.order_number,
            gross_amount=gross,
            platform_fees=data.platform_fees,
            payment_fees=data.payment_fees,
            shipping_collected=data.shipping_collected,
            shipping_cost=data.shipping_cost,
            net_amount=net,
            notes=data.notes,
            source=data.source,
            ebay_listing_sale_id=data.ebay_listing_sale_id,
        )
        db.add(sale)
        await db.flush()
        
        # Create sale items
        for item in data.items:
            sale_item = SaleItem(
                id=uuid4(),
                sale_id=sale.id,
                checklist_id=item.checklist_id,
                quantity=item.quantity,
                sale_price=item.sale_price,
                notes=item.notes,
            )
            db.add(sale_item)
        
        await db.commit()
        
        # Reload with items
        result = await db.execute(
            select(Sale)
            .options(selectinload(Sale.items).selectinload(SaleItem.checklist))
            .where(Sale.id == sale.id)
        )
        return result.scalar_one()
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create sale: {str(e)}"
        )


@router.delete("/sales/{sale_id}", status_code=204)
async def delete_sale(
    sale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a sale."""
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    await db.delete(sale)
    await db.commit()


# ============================================
# ANALYTICS ROUTES
# ============================================

@router.get("/analytics/sales", response_model=SalesAnalytics)
async def get_sales_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get sales analytics summary."""
    query = select(Sale)
    
    if start_date:
        query = query.where(Sale.sale_date >= start_date)
    if end_date:
        query = query.where(Sale.sale_date <= end_date)
    
    result = await db.execute(query.options(selectinload(Sale.items)))
    sales = result.scalars().all()
    
    total_revenue = sum(s.net_amount or Decimal("0") for s in sales)
    total_cost = sum(
        sum(i.cost_basis or Decimal("0") for i in s.items)
        for s in sales
    )
    
    # Platform breakdown
    platform_totals: dict[str, Decimal] = {}
    for s in sales:
        p = s.platform or "Unknown"
        platform_totals[p] = platform_totals.get(p, Decimal("0")) + (s.net_amount or Decimal("0"))
    
    # Monthly breakdown
    month_totals: dict[str, Decimal] = {}
    for s in sales:
        m = s.sale_date.strftime("%Y-%m")
        month_totals[m] = month_totals.get(m, Decimal("0")) + (s.net_amount or Decimal("0"))
    
    return SalesAnalytics(
        total_sales=len(sales),
        total_revenue=total_revenue,
        total_profit=total_revenue - total_cost,
        avg_sale_price=total_revenue / len(sales) if sales else Decimal("0"),
        sales_by_platform=platform_totals,
        sales_by_month=month_totals,
    )


@router.get("/analytics/purchases", response_model=PurchaseAnalytics)
async def get_purchase_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get purchase analytics summary."""
    query = select(Purchase)
    
    if start_date:
        query = query.where(Purchase.purchase_date >= start_date)
    if end_date:
        query = query.where(Purchase.purchase_date <= end_date)
    
    result = await db.execute(query)
    purchases = result.scalars().all()
    
    total_spent = sum(p.total or Decimal("0") for p in purchases)
    
    # Vendor breakdown
    vendor_totals: dict[str, Decimal] = {}
    for p in purchases:
        v = p.vendor or "Unknown"
        vendor_totals[v] = vendor_totals.get(v, Decimal("0")) + (p.total or Decimal("0"))
    
    # Monthly breakdown
    month_totals: dict[str, Decimal] = {}
    for p in purchases:
        m = p.purchase_date.strftime("%Y-%m")
        month_totals[m] = month_totals.get(m, Decimal("0")) + (p.total or Decimal("0"))
    
    return PurchaseAnalytics(
        total_purchases=len(purchases),
        total_spent=total_spent,
        avg_purchase_price=total_spent / len(purchases) if purchases else Decimal("0"),
        purchases_by_vendor=vendor_totals,
        purchases_by_month=month_totals,
    )
