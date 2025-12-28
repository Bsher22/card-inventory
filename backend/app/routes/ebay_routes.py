"""
eBay Sales Import Routes

Endpoints for uploading, previewing, and importing eBay sales data.
"""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models_ebay import EbayImportBatch, EbayListingSale
from ..schemas_ebay import (
    EbayImportBatchDetail,
    EbayImportBatchRead,
    EbayImportRequest,
    EbayImportResponse,
    EbayListingSaleRead,
    EbaySalesAnalytics,
    EbayUploadPreviewResponse,
)
from .services.ebay_parser import parse_ebay_csv

router = APIRouter(prefix="/sales/ebay", tags=["eBay Sales"])


# ============================================
# Upload & Preview
# ============================================

@router.post("/upload/preview", response_model=EbayUploadPreviewResponse)
async def preview_ebay_upload(
    file: UploadFile = File(...),
):
    """
    Upload eBay CSV and return parsed data for preview.
    User can then select which listings to import.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Parse the CSV
    result = parse_ebay_csv(content)
    
    return result


# ============================================
# Import Selected Listings
# ============================================

@router.post("/import", response_model=EbayImportResponse)
async def import_ebay_sales(
    request: EbayImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Import selected listings from previewed eBay data.
    Creates an import batch and individual listing records.
    """
    if not request.listings:
        raise HTTPException(status_code=400, detail="No listings to import")
    
    # Calculate totals
    total_quantity = sum(l.quantity_sold for l in request.listings)
    total_item_sales = sum(l.item_sales for l in request.listings)
    total_net_sales = sum(l.net_sales for l in request.listings)
    
    # Create import batch
    batch = EbayImportBatch(
        report_start_date=request.report_start_date,
        report_end_date=request.report_end_date,
        total_listings=len(request.listings),
        total_quantity_sold=total_quantity,
        total_item_sales=total_item_sales,
        total_net_sales=total_net_sales,
        notes=request.notes,
    )
    db.add(batch)
    await db.flush()  # Get the batch ID
    
    # Create listing records
    for listing_data in request.listings:
        listing = EbayListingSale(
            import_batch_id=batch.id,
            listing_title=listing_data.listing_title,
            ebay_item_id=listing_data.ebay_item_id,
            quantity_sold=listing_data.quantity_sold,
            
            total_sales=listing_data.total_sales,
            item_sales=listing_data.item_sales,
            shipping_collected=listing_data.shipping_collected,
            taxes_to_seller=listing_data.taxes_to_seller,
            taxes_to_ebay=listing_data.taxes_to_ebay,
            
            total_selling_costs=listing_data.total_selling_costs,
            insertion_fees=listing_data.insertion_fees,
            listing_upgrade_fees=listing_data.listing_upgrade_fees,
            final_value_fees=listing_data.final_value_fees,
            promoted_general_fees=listing_data.promoted_general_fees,
            promoted_priority_fees=listing_data.promoted_priority_fees,
            ads_express_fees=listing_data.ads_express_fees,
            promoted_offsite_fees=listing_data.promoted_offsite_fees,
            international_fees=listing_data.international_fees,
            other_ebay_fees=listing_data.other_ebay_fees,
            deposit_processing_fees=listing_data.deposit_processing_fees,
            fee_credits=listing_data.fee_credits,
            shipping_label_cost=listing_data.shipping_label_cost,
            
            net_sales=listing_data.net_sales,
            average_selling_price=listing_data.average_selling_price,
            
            quantity_via_promoted=listing_data.quantity_via_promoted,
            quantity_via_best_offer=listing_data.quantity_via_best_offer,
            quantity_via_seller_offer=listing_data.quantity_via_seller_offer,
        )
        db.add(listing)
    
    await db.commit()
    
    return EbayImportResponse(
        success=True,
        message=f"Successfully imported {len(request.listings)} listings",
        batch_id=batch.id,
        imported_count=len(request.listings),
        total_item_sales=total_item_sales,
        total_net_sales=total_net_sales,
    )


# ============================================
# List & Read Import Batches
# ============================================

@router.get("/batches", response_model=list[EbayImportBatchRead])
async def list_import_batches(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List all eBay import batches, most recent first."""
    result = await db.execute(
        select(EbayImportBatch)
        .order_by(EbayImportBatch.import_date.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/batches/{batch_id}", response_model=EbayImportBatchDetail)
async def get_import_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single import batch with all its listings."""
    result = await db.execute(
        select(EbayImportBatch)
        .options(selectinload(EbayImportBatch.listing_sales))
        .where(EbayImportBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    
    return batch


@router.delete("/batches/{batch_id}")
async def delete_import_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an import batch and all its listings."""
    result = await db.execute(
        select(EbayImportBatch).where(EbayImportBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    
    await db.delete(batch)
    await db.commit()
    
    return {"message": "Import batch deleted successfully"}


# ============================================
# List Individual Listings
# ============================================

@router.get("/listings", response_model=list[EbayListingSaleRead])
async def list_ebay_listings(
    db: AsyncSession = Depends(get_db),
    batch_id: Optional[UUID] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List eBay listing sales with optional filtering."""
    query = select(EbayListingSale)
    
    if batch_id:
        query = query.where(EbayListingSale.import_batch_id == batch_id)
    
    if search:
        query = query.where(EbayListingSale.listing_title.ilike(f"%{search}%"))
    
    query = query.order_by(EbayListingSale.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


# ============================================
# Analytics
# ============================================

@router.get("/analytics", response_model=EbaySalesAnalytics)
async def get_ebay_analytics(
    db: AsyncSession = Depends(get_db),
):
    """Get summary analytics for all eBay sales."""
    # Batch counts
    batch_count = await db.execute(select(func.count(EbayImportBatch.id)))
    total_batches = batch_count.scalar() or 0
    
    # Listing aggregates
    result = await db.execute(
        select(
            func.count(EbayListingSale.id),
            func.sum(EbayListingSale.quantity_sold),
            func.sum(EbayListingSale.item_sales),
            func.sum(EbayListingSale.net_sales),
            func.sum(EbayListingSale.total_selling_costs),
        )
    )
    row = result.one()
    
    total_listings = row[0] or 0
    total_quantity = row[1] or 0
    total_item_sales = row[2] or Decimal("0")
    total_net_sales = row[3] or Decimal("0")
    total_fees = row[4] or Decimal("0")
    
    # Calculate average fee percentage
    avg_fee_pct = Decimal("0")
    if total_item_sales > 0:
        avg_fee_pct = (total_fees / total_item_sales * 100).quantize(Decimal("0.01"))
    
    return EbaySalesAnalytics(
        total_batches=total_batches,
        total_listings=total_listings,
        total_quantity_sold=total_quantity,
        total_item_sales=total_item_sales,
        total_net_sales=total_net_sales,
        total_fees=total_fees,
        average_fee_percentage=avg_fee_pct,
    )
