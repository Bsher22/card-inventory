"""
Signature Authentication Routes

API endpoints for PSA/DNA and JSA signature authentication.
Handles cards, memorabilia, and collectibles.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.signature_auth_service import SignatureAuthService
from app.schemas.grading import (
    GradingCompanyWithLevels,
    ServiceLevelResponse,
    AuthSubmissionCreate,
    AuthSubmissionResponse,
    AuthItemResponse,
    AuthStatusUpdate,
    AuthResultsSubmit,
    AuthStats,
    AuthPendingByCompany,
)

router = APIRouter()


# ============================================
# COMPANY ROUTES
# ============================================

@router.get("/signature-auth/companies", response_model=list[GradingCompanyWithLevels])
async def list_auth_companies(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List authentication companies (PSA/DNA, JSA) with service levels."""
    service = SignatureAuthService(db)
    companies = await service.get_auth_companies(active_only=active_only)
    
    return [
        GradingCompanyWithLevels(
            id=c.id,
            name=c.name,
            code=c.code,
            website=c.website,
            service_type=c.service_type,
            is_active=c.is_active,
            service_levels=[
                ServiceLevelResponse(
                    id=sl.id,
                    name=sl.name,
                    code=sl.code,
                    max_value=sl.max_value,
                    base_fee=sl.base_fee,
                    estimated_days=sl.estimated_days,
                    is_active=sl.is_active,
                )
                for sl in c.service_levels
            ]
        )
        for c in companies
    ]


@router.get("/signature-auth/companies/{company_id}/service-levels", response_model=list[ServiceLevelResponse])
async def get_service_levels(
    company_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """Get service levels for an auth company."""
    service = SignatureAuthService(db)
    return await service.get_service_levels(company_id, active_only=active_only)


# ============================================
# SUBMISSION ROUTES
# ============================================

@router.get("/signature-auth/submissions", response_model=list[AuthSubmissionResponse])
async def list_submissions(
    company_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    item_type: Optional[str] = Query(None, description="Filter by item type: card, memorabilia, collectible"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List authentication submissions with optional filters."""
    service = SignatureAuthService(db)
    submissions = await service.get_submissions(
        company_id=company_id,
        status=status,
        item_type=item_type,
        skip=skip,
        limit=limit,
    )
    
    return [_format_submission_response(s) for s in submissions]


@router.get("/signature-auth/submissions/stats", response_model=AuthStats)
async def get_submission_stats(db: AsyncSession = Depends(get_db)):
    """Get authentication submission statistics."""
    service = SignatureAuthService(db)
    stats = await service.get_stats()
    return AuthStats(**stats)


@router.get("/signature-auth/submissions/pending-by-company", response_model=list[AuthPendingByCompany])
async def get_pending_by_company(db: AsyncSession = Depends(get_db)):
    """Get pending submissions grouped by auth company."""
    service = SignatureAuthService(db)
    pending = await service.get_pending_by_company()
    return [AuthPendingByCompany(**p) for p in pending]


@router.get("/signature-auth/submissions/{submission_id}", response_model=AuthSubmissionResponse)
async def get_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single submission with all items."""
    service = SignatureAuthService(db)
    submission = await service.get_submission(submission_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return _format_submission_response(submission)


@router.post("/signature-auth/submissions", response_model=AuthSubmissionResponse, status_code=201)
async def create_submission(
    data: AuthSubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new authentication submission.
    
    Cards are removed from inventory when submitted.
    """
    service = SignatureAuthService(db)
    
    try:
        items = [item.model_dump() for item in data.items]
        submission = await service.create_submission(
            company_id=data.company_id,
            date_submitted=data.date_submitted,
            items=items,
            service_level_id=data.service_level_id,
            submission_number=data.submission_number,
            reference_number=data.reference_number,
            shipping_to_cost=data.shipping_to_cost,
            shipping_to_tracking=data.shipping_to_tracking,
            insurance_cost=data.insurance_cost,
            notes=data.notes,
        )
        await db.commit()
        return _format_submission_response(submission)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/signature-auth/submissions/{submission_id}/status", response_model=AuthSubmissionResponse)
async def update_submission_status(
    submission_id: UUID,
    data: AuthStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update submission status and tracking info."""
    service = SignatureAuthService(db)
    
    try:
        submission = await service.update_status(
            submission_id=submission_id,
            status=data.status,
            date_shipped=data.date_shipped,
            date_received=data.date_received,
            date_completed=data.date_completed,
            date_shipped_back=data.date_shipped_back,
            date_returned=data.date_returned,
            shipping_to_tracking=data.shipping_to_tracking,
            shipping_return_tracking=data.shipping_return_tracking,
        )
        await db.commit()
        return _format_submission_response(submission)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signature-auth/submissions/{submission_id}/results", response_model=AuthSubmissionResponse)
async def process_auth_results(
    submission_id: UUID,
    data: AuthResultsSubmit,
    db: AsyncSession = Depends(get_db),
):
    """
    Process authentication results when submission returns.
    
    Updates inventory/standalone items with authentication info.
    """
    service = SignatureAuthService(db)
    
    try:
        item_results = [r.model_dump() for r in data.item_results]
        submission = await service.process_results(
            submission_id=submission_id,
            item_results=item_results,
            date_returned=data.date_returned,
            shipping_return_cost=data.shipping_return_cost,
        )
        await db.commit()
        return _format_submission_response(submission)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/signature-auth/submissions/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a pending submission. Restores inventory for cards."""
    service = SignatureAuthService(db)
    
    try:
        deleted = await service.delete_submission(submission_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Submission not found")
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# ITEMS BY TYPE ROUTES (for tabs)
# ============================================

@router.get("/signature-auth/items/cards", response_model=list[AuthItemResponse])
async def get_card_items(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get authentication items for cards tab."""
    service = SignatureAuthService(db)
    items = await service.get_items_by_type(
        item_type="card",
        status=status,
        skip=skip,
        limit=limit,
    )
    return [_format_item_response(i) for i in items]


@router.get("/signature-auth/items/memorabilia", response_model=list[AuthItemResponse])
async def get_memorabilia_items(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get authentication items for memorabilia tab."""
    service = SignatureAuthService(db)
    items = await service.get_items_by_type(
        item_type="memorabilia",
        status=status,
        skip=skip,
        limit=limit,
    )
    return [_format_item_response(i) for i in items]


@router.get("/signature-auth/items/collectibles", response_model=list[AuthItemResponse])
async def get_collectible_items(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get authentication items for collectibles tab."""
    service = SignatureAuthService(db)
    items = await service.get_items_by_type(
        item_type="collectible",
        status=status,
        skip=skip,
        limit=limit,
    )
    return [_format_item_response(i) for i in items]


# ============================================
# HELPER FUNCTIONS
# ============================================

def _format_submission_response(submission) -> AuthSubmissionResponse:
    """Format submission model to response schema."""
    items = [_format_item_response(item) for item in submission.items]
    
    return AuthSubmissionResponse(
        id=submission.id,
        company_id=submission.company_id,
        service_level_id=submission.service_level_id,
        submission_number=submission.submission_number,
        reference_number=submission.reference_number,
        date_submitted=submission.date_submitted,
        date_shipped=submission.date_shipped,
        date_received=submission.date_received,
        date_completed=submission.date_completed,
        date_shipped_back=submission.date_shipped_back,
        date_returned=submission.date_returned,
        status=submission.status,
        authentication_fee=submission.authentication_fee,
        shipping_to_cost=submission.shipping_to_cost,
        shipping_to_tracking=submission.shipping_to_tracking,
        shipping_return_cost=submission.shipping_return_cost,
        shipping_return_tracking=submission.shipping_return_tracking,
        insurance_cost=submission.insurance_cost,
        total_items=submission.total_items,
        items_authenticated=submission.items_authenticated,
        total_declared_value=submission.total_declared_value,
        notes=submission.notes,
        items=items,
        company_name=submission.company.name if submission.company else None,
        company_code=submission.company.code if submission.company else None,
        service_level_name=submission.service_level.name if submission.service_level else None,
    )


def _format_item_response(item) -> AuthItemResponse:
    """Format item model to response schema."""
    resp = AuthItemResponse(
        id=item.id,
        item_type=item.item_type,
        inventory_id=item.inventory_id,
        standalone_item_id=item.standalone_item_id,
        line_number=item.line_number,
        description=item.description,
        signer_name=item.signer_name,
        declared_value=item.declared_value,
        fee_per_item=item.fee_per_item,
        status=item.status,
        cert_number=item.cert_number,
        sticker_number=item.sticker_number,
        letter_number=item.letter_number,
        notes=item.notes,
    )
    
    # Add nested card details
    if item.item_type == "card" and item.inventory:
        checklist = item.inventory.checklist
        if checklist:
            resp.card_number = checklist.card_number
            resp.player_name = (
                checklist.player.name if checklist.player 
                else checklist.player_name_raw
            )
            resp.product_line_name = (
                checklist.product_line.full_name if checklist.product_line 
                else None
            )
    
    # Add standalone item details
    if item.standalone_item:
        resp.item_name = item.standalone_item.name
        resp.item_category = (
            item.standalone_item.category.name if item.standalone_item.category 
            else None
        )
    
    return resp