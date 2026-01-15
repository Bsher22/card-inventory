"""
Consignment Routes

Handles API endpoints for autograph consignment management.
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.consignment_service import ConsignmentService
from app.schemas.consignments import (
    ConsignerCreate,
    ConsignerUpdate,
    ConsignerResponse,
    ConsignerStats,
)

router = APIRouter()


# ============================================
# SCHEMAS (local ones for consignment operations)
# ============================================


class ConsignmentItemCreate(BaseModel):
    checklist_id: UUID
    quantity: int = 1
    fee_per_card: Optional[Decimal] = None
    source_inventory_id: Optional[UUID] = None


class ConsignmentCreate(BaseModel):
    consigner_id: UUID
    date_sent: date
    items: list[ConsignmentItemCreate]
    reference_number: Optional[str] = None
    expected_return_date: Optional[date] = None
    shipping_out_cost: Decimal = Decimal("0")
    shipping_out_tracking: Optional[str] = None
    notes: Optional[str] = None


class ConsignmentItemResult(BaseModel):
    item_id: UUID
    status: str  # 'signed', 'refused', 'lost', 'returned_unsigned'
    inscription: Optional[str] = None
    date_signed: Optional[date] = None
    notes: Optional[str] = None


class ConsignmentReturn(BaseModel):
    item_results: list[ConsignmentItemResult]
    date_returned: Optional[date] = None
    shipping_return_cost: Decimal = Decimal("0")
    shipping_return_tracking: Optional[str] = None


class ConsignmentItemResponse(BaseModel):
    id: UUID
    checklist_id: UUID
    quantity: int
    fee_per_card: Decimal
    status: str
    date_signed: Optional[date]
    inscription: Optional[str]
    checklist: Optional[dict] = None  # Nested checklist with player info
    
    class Config:
        from_attributes = True


class ConsignmentResponse(BaseModel):
    id: UUID
    consigner_id: UUID
    reference_number: Optional[str]
    date_sent: date
    date_returned: Optional[date]
    expected_return_date: Optional[date]
    status: str
    total_fee: Decimal
    fee_paid: bool
    items: list[ConsignmentItemResponse] = []
    
    class Config:
        from_attributes = True


# ============================================
# CONSIGNER ROUTES
# ============================================

@router.get("/consigners", response_model=list[ConsignerResponse])
async def list_consigners(
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all consigners."""
    service = ConsignmentService(db)
    return await service.get_consigners(active_only=active_only, skip=skip, limit=limit)


@router.get("/consigners/{consigner_id}", response_model=ConsignerResponse)
async def get_consigner(
    consigner_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single consigner."""
    service = ConsignmentService(db)
    consigner = await service.get_consigner(consigner_id)
    
    if not consigner:
        raise HTTPException(status_code=404, detail="Consigner not found")
    
    return consigner


@router.get("/consigners/{consigner_id}/stats", response_model=ConsignerStats)
async def get_consigner_stats(
    consigner_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a consigner."""
    service = ConsignmentService(db)
    
    # Verify consigner exists
    consigner = await service.get_consigner(consigner_id)
    if not consigner:
        raise HTTPException(status_code=404, detail="Consigner not found")
    
    return await service.get_consigner_stats(consigner_id)


@router.post("/consigners", response_model=ConsignerResponse, status_code=201)
async def create_consigner(
    data: ConsignerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new consigner."""
    service = ConsignmentService(db)
    return await service.create_consigner(**data.model_dump())


@router.patch("/consigners/{consigner_id}", response_model=ConsignerResponse)
async def update_consigner(
    consigner_id: UUID,
    data: ConsignerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a consigner."""
    service = ConsignmentService(db)
    consigner = await service.update_consigner(
        consigner_id, 
        **data.model_dump(exclude_unset=True)
    )
    
    if not consigner:
        raise HTTPException(status_code=404, detail="Consigner not found")
    
    return consigner


# ============================================
# CONSIGNMENT ROUTES
# ============================================

@router.get("/consignments", response_model=list[ConsignmentResponse])
async def list_consignments(
    consigner_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List consignments with optional filters."""
    service = ConsignmentService(db)
    return await service.get_consignments(
        consigner_id=consigner_id,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.get("/consignments/pending-value")
async def get_pending_consignments_value(db: AsyncSession = Depends(get_db)):
    """Get total value of cards currently out for signing."""
    service = ConsignmentService(db)
    return await service.get_pending_consignments_value()


@router.get("/consignments/{consignment_id}", response_model=ConsignmentResponse)
async def get_consignment(
    consignment_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single consignment with items."""
    service = ConsignmentService(db)
    consignment = await service.get_consignment(consignment_id)
    
    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")
    
    return consignment


@router.post("/consignments", response_model=ConsignmentResponse, status_code=201)
async def create_consignment(
    data: ConsignmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new consignment.
    
    This will remove the specified cards from inventory and track them
    as out for signing.
    """
    service = ConsignmentService(db)
    
    try:
        items = [item.model_dump() for item in data.items]
        return await service.create_consignment(
            consigner_id=data.consigner_id,
            date_sent=data.date_sent,
            items=items,
            reference_number=data.reference_number,
            expected_return_date=data.expected_return_date,
            shipping_out_cost=data.shipping_out_cost,
            shipping_out_tracking=data.shipping_out_tracking,
            notes=data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/consignments/{consignment_id}/return", response_model=ConsignmentResponse)
async def process_consignment_return(
    consignment_id: UUID,
    data: ConsignmentReturn,
    db: AsyncSession = Depends(get_db),
):
    """
    Process a consignment return.
    
    For each item, specify status:
    - 'signed': Card was signed, moves to signed inventory
    - 'refused': Player refused, returns to unsigned inventory
    - 'lost': Card was lost
    - 'returned_unsigned': Returned but not signed
    """
    service = ConsignmentService(db)
    
    try:
        item_results = [r.model_dump() for r in data.item_results]
        return await service.process_consignment_return(
            consignment_id=consignment_id,
            item_results=item_results,
            date_returned=data.date_returned,
            shipping_return_cost=data.shipping_return_cost,
            shipping_return_tracking=data.shipping_return_tracking,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/consignments/{consignment_id}/mark-paid", response_model=ConsignmentResponse)
async def mark_fee_paid(
    consignment_id: UUID,
    fee_paid_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Mark a consignment's fee as paid."""
    service = ConsignmentService(db)
    
    try:
        return await service.mark_fee_paid(consignment_id, fee_paid_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
