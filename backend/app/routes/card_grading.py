"""
Card Grading Routes

API endpoints for PSA/BGS/SGC card grading submissions.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.card_grading_service import CardGradingService
from app.schemas.grading import (
    GradingCompanyWithLevels,
    ServiceLevelResponse,
    CardGradingSubmissionCreate,
    CardGradingSubmissionResponse,
    CardGradingStatusUpdate,
    CardGradingResultsSubmit,
    CardGradingStats,
)

router = APIRouter()


# ============================================
# COMPANY & SERVICE LEVEL ROUTES
# ============================================

@router.get("/grading/companies", response_model=list[GradingCompanyWithLevels])
async def list_grading_companies(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List all grading companies (PSA, BGS, SGC) with service levels."""
    service = CardGradingService(db)
    companies = await service.get_grading_companies(active_only=active_only)
    
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


@router.get("/grading/companies/{company_id}/service-levels", response_model=list[ServiceLevelResponse])
async def get_service_levels(
    company_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """Get service levels for a grading company."""
    service = CardGradingService(db)
    return await service.get_service_levels(company_id, active_only=active_only)


# ============================================
# SUBMISSION ROUTES
# ============================================

@router.get("/grading/submissions", response_model=list[CardGradingSubmissionResponse])
async def list_submissions(
    company_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List grading submissions with optional filters."""
    service = CardGradingService(db)
    submissions = await service.get_submissions(
        company_id=company_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    
    return [_format_submission_response(s) for s in submissions]


@router.get("/grading/submissions/stats", response_model=CardGradingStats)
async def get_submission_stats(db: AsyncSession = Depends(get_db)):
    """Get grading submission statistics."""
    service = CardGradingService(db)
    stats = await service.get_stats()
    return CardGradingStats(**stats)


@router.get("/grading/submissions/pending-by-company")
async def get_pending_by_company(db: AsyncSession = Depends(get_db)):
    """Get pending submissions grouped by grading company."""
    service = CardGradingService(db)
    return await service.get_pending_by_company()


@router.get("/grading/submissions/{submission_id}", response_model=CardGradingSubmissionResponse)
async def get_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single submission with all items."""
    service = CardGradingService(db)
    submission = await service.get_submission(submission_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return _format_submission_response(submission)


@router.post("/grading/submissions", response_model=CardGradingSubmissionResponse, status_code=201)
async def create_submission(
    data: CardGradingSubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new grading submission.
    
    Cards are removed from inventory when submitted.
    """
    service = CardGradingService(db)
    
    try:
        items = [item.model_dump() for item in data.items]
        submission = await service.create_submission(
            company_id=data.company_id,
            date_submitted=data.date_submitted,
            items=items,
            service_level_id=data.service_level_id,
            submitter_id=data.submitter_id,
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


@router.patch("/grading/submissions/{submission_id}/status", response_model=CardGradingSubmissionResponse)
async def update_submission_status(
    submission_id: UUID,
    data: CardGradingStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update submission status and tracking info."""
    service = CardGradingService(db)
    
    try:
        submission = await service.update_status(
            submission_id=submission_id,
            status=data.status,
            date_shipped=data.date_shipped,
            date_received=data.date_received,
            date_graded=data.date_graded,
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


@router.post("/grading/submissions/{submission_id}/results", response_model=CardGradingSubmissionResponse)
async def process_grading_results(
    submission_id: UUID,
    data: CardGradingResultsSubmit,
    db: AsyncSession = Depends(get_db),
):
    """
    Process grading results when submission returns.
    
    Creates slabbed inventory records for graded cards.
    """
    service = CardGradingService(db)
    
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


@router.delete("/grading/submissions/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a pending submission. Restores inventory."""
    service = CardGradingService(db)
    
    try:
        deleted = await service.delete_submission(submission_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Submission not found")
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# HELPER FUNCTIONS
# ============================================

def _format_submission_response(submission) -> CardGradingSubmissionResponse:
    """Format submission model to response schema."""
    items = []
    for item in submission.items:
        item_resp = {
            "id": item.id,
            "inventory_id": item.inventory_id,
            "checklist_id": item.checklist_id,
            "line_number": item.line_number,
            "declared_value": item.declared_value,
            "fee_per_card": item.fee_per_card,
            "was_signed": item.was_signed,
            "status": item.status,
            "grade_value": item.grade_value,
            "auto_grade": item.auto_grade,
            "cert_number": item.cert_number,
            "label_type": item.label_type,
            "notes": item.notes,
        }
        
        # Add nested card details
        if item.checklist:
            item_resp["card_number"] = item.checklist.card_number
            item_resp["player_name"] = (
                item.checklist.player.name if item.checklist.player 
                else item.checklist.player_name_raw
            )
            item_resp["product_line_name"] = (
                item.checklist.product_line.full_name if item.checklist.product_line 
                else None
            )
        
        items.append(item_resp)
    
    return CardGradingSubmissionResponse(
        id=submission.id,
        company_id=submission.company_id,
        service_level_id=submission.service_level_id,
        submitter_id=submission.submitter_id,
        submission_number=submission.submission_number,
        reference_number=submission.reference_number,
        date_submitted=submission.date_submitted,
        date_shipped=submission.date_shipped,
        date_received=submission.date_received,
        date_graded=submission.date_graded,
        date_shipped_back=submission.date_shipped_back,
        date_returned=submission.date_returned,
        status=submission.status,
        grading_fee=submission.grading_fee,
        shipping_to_cost=submission.shipping_to_cost,
        shipping_to_tracking=submission.shipping_to_tracking,
        shipping_return_cost=submission.shipping_return_cost,
        shipping_return_tracking=submission.shipping_return_tracking,
        insurance_cost=submission.insurance_cost,
        total_cards=submission.total_cards,
        cards_graded=submission.cards_graded,
        total_declared_value=submission.total_declared_value,
        notes=submission.notes,
        items=items,
        company_name=submission.company.name if submission.company else None,
        company_code=submission.company.code if submission.company else None,
        service_level_name=submission.service_level.name if submission.service_level else None,
        submitter_name=submission.submitter.name if submission.submitter else None,
    )