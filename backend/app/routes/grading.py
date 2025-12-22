"""
Grading Submission Routes

Handles API endpoints for PSA/BGS grading submissions.
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.grading_service import GradingService

router = APIRouter()


# ============================================
# SCHEMAS
# ============================================

class GradingCompanyResponse(BaseModel):
    id: UUID
    name: str
    code: str
    website: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True


class ServiceLevelResponse(BaseModel):
    id: UUID
    name: str
    code: Optional[str]
    max_value: Optional[Decimal]
    base_fee: Decimal
    estimated_days: Optional[int]
    is_active: bool
    
    class Config:
        from_attributes = True


class GradingCompanyWithLevels(GradingCompanyResponse):
    service_levels: list[ServiceLevelResponse] = []


class SubmissionItemCreate(BaseModel):
    checklist_id: UUID
    declared_value: Decimal = Decimal("0")
    fee_per_card: Optional[Decimal] = None
    source_inventory_id: Optional[UUID] = None
    was_signed: bool = False


class SubmissionCreate(BaseModel):
    grading_company_id: UUID
    date_submitted: date
    items: list[SubmissionItemCreate]
    service_level_id: Optional[UUID] = None
    submission_number: Optional[str] = None
    reference_number: Optional[str] = None
    shipping_to_cost: Decimal = Decimal("0")
    shipping_to_tracking: Optional[str] = None
    insurance_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class SubmissionStatusUpdate(BaseModel):
    status: str  # 'shipped', 'received', 'grading', 'shipped_back'
    date_received: Optional[date] = None
    date_graded: Optional[date] = None
    date_shipped_back: Optional[date] = None
    shipping_return_tracking: Optional[str] = None


class GradedItemResult(BaseModel):
    item_id: UUID
    status: str  # 'graded', 'authentic', 'altered', 'counterfeit', 'ungradeable', 'lost'
    grade_value: Optional[Decimal] = None
    auto_grade: Optional[Decimal] = None
    cert_number: Optional[str] = None
    label_type: Optional[str] = None
    notes: Optional[str] = None


class SubmissionGradeResults(BaseModel):
    item_results: list[GradedItemResult]
    date_returned: Optional[date] = None
    shipping_return_cost: Decimal = Decimal("0")


class SubmissionItemResponse(BaseModel):
    id: UUID
    checklist_id: UUID
    line_number: Optional[int]
    declared_value: Optional[Decimal]
    fee_per_card: Optional[Decimal]
    was_signed: bool
    status: str
    grade_value: Optional[Decimal]
    auto_grade: Optional[Decimal]
    cert_number: Optional[str]
    label_type: Optional[str]
    
    class Config:
        from_attributes = True


class SubmissionResponse(BaseModel):
    id: UUID
    grading_company_id: UUID
    service_level_id: Optional[UUID]
    submission_number: Optional[str]
    reference_number: Optional[str]
    date_submitted: date
    date_received: Optional[date]
    date_graded: Optional[date]
    date_shipped_back: Optional[date]
    date_returned: Optional[date]
    status: str
    total_declared_value: Decimal
    grading_fee: Decimal
    shipping_to_cost: Decimal
    shipping_return_cost: Decimal
    insurance_cost: Decimal
    total_cards: int
    cards_graded: int
    items: list[SubmissionItemResponse] = []
    
    class Config:
        from_attributes = True


class SubmissionStats(BaseModel):
    pending_submissions: int
    cards_out_for_grading: int
    pending_fees: Decimal
    grade_distribution: dict[str, int]
    total_graded: int
    gem_rate: float


# ============================================
# GRADING COMPANY ROUTES
# ============================================

@router.get("/grading/companies", response_model=list[GradingCompanyWithLevels])
async def list_grading_companies(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List all grading companies with their service levels."""
    service = GradingService(db)
    return await service.get_grading_companies(active_only=active_only)


@router.get("/grading/companies/{company_id}/service-levels", response_model=list[ServiceLevelResponse])
async def get_service_levels(
    company_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """Get service levels for a grading company."""
    service = GradingService(db)
    return await service.get_service_levels(company_id, active_only=active_only)


# ============================================
# SUBMISSION ROUTES
# ============================================

@router.get("/grading/submissions", response_model=list[SubmissionResponse])
async def list_submissions(
    grading_company_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List submissions with optional filters."""
    service = GradingService(db)
    return await service.get_submissions(
        grading_company_id=grading_company_id,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.get("/grading/submissions/stats", response_model=SubmissionStats)
async def get_submission_stats(db: AsyncSession = Depends(get_db)):
    """Get overall grading submission statistics."""
    service = GradingService(db)
    return await service.get_submission_stats()


@router.get("/grading/submissions/pending-by-company")
async def get_pending_by_company(db: AsyncSession = Depends(get_db)):
    """Get pending submissions grouped by grading company."""
    service = GradingService(db)
    return await service.get_pending_by_company()


@router.get("/grading/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single submission with items."""
    service = GradingService(db)
    submission = await service.get_submission(submission_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return submission


@router.post("/grading/submissions", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new grading submission.
    
    This will remove the specified cards from raw inventory and track them
    as out for grading.
    """
    service = GradingService(db)
    
    try:
        items = [item.model_dump() for item in data.items]
        return await service.create_submission(
            grading_company_id=data.grading_company_id,
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/grading/submissions/{submission_id}/status", response_model=SubmissionResponse)
async def update_submission_status(
    submission_id: UUID,
    data: SubmissionStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update submission tracking status.
    
    Use this to track: shipped, received by PSA, grading, shipped back.
    """
    service = GradingService(db)
    
    try:
        return await service.update_submission_status(
            submission_id=submission_id,
            status=data.status,
            date_received=data.date_received,
            date_graded=data.date_graded,
            date_shipped_back=data.date_shipped_back,
            shipping_return_tracking=data.shipping_return_tracking,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grading/submissions/{submission_id}/grades", response_model=SubmissionResponse)
async def process_graded_items(
    submission_id: UUID,
    data: SubmissionGradeResults,
    db: AsyncSession = Depends(get_db),
):
    """
    Process graded items when submission returns.
    
    For each item, specify status:
    - 'graded': Card was graded, include grade_value
    - 'authentic': Authenticated only (no numeric grade)
    - 'ungradeable': Returned ungraded
    - 'altered': Card was deemed altered
    - 'counterfeit': Card was deemed counterfeit
    - 'lost': Card was lost
    """
    service = GradingService(db)
    
    try:
        item_results = [r.model_dump() for r in data.item_results]
        return await service.process_graded_items(
            submission_id=submission_id,
            item_results=item_results,
            date_returned=data.date_returned,
            shipping_return_cost=data.shipping_return_cost,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
