"""
Submitter Routes

API endpoints for managing third-party submission services.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.submitter import Submitter
from app.models.grading import CardGradingSubmission, AuthSubmission
from app.schemas.submitter import (
    SubmitterCreate,
    SubmitterUpdate,
    SubmitterResponse,
    SubmitterSummary,
    SubmitterStats,
)

router = APIRouter()


# ============================================
# LIST / GET SUBMITTERS
# ============================================

@router.get("/submitters", response_model=List[SubmitterResponse])
async def get_submitters(
    active_only: bool = Query(True),
    grading_only: bool = Query(False, description="Only submitters that offer grading"),
    auth_only: bool = Query(False, description="Only submitters that offer authentication"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all submitters with optional filters.
    
    - **active_only**: Only return active submitters (default: true)
    - **grading_only**: Only submitters that offer grading
    - **auth_only**: Only submitters that offer authentication
    """
    query = select(Submitter)
    
    if active_only:
        query = query.where(Submitter.is_active == True)
    
    if grading_only:
        query = query.where(Submitter.offers_grading == True)
        
    if auth_only:
        query = query.where(Submitter.offers_authentication == True)
    
    query = query.order_by(Submitter.is_default.desc(), Submitter.name)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/submitters/summary", response_model=List[SubmitterSummary])
async def get_submitters_summary(
    grading_only: bool = Query(False, description="Only submitters that offer grading"),
    auth_only: bool = Query(False, description="Only submitters that offer authentication"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get minimal submitter info for dropdowns.
    Only returns active submitters.
    """
    query = select(Submitter).where(Submitter.is_active == True)
    
    if grading_only:
        query = query.where(Submitter.offers_grading == True)
        
    if auth_only:
        query = query.where(Submitter.offers_authentication == True)
    
    query = query.order_by(Submitter.is_default.desc(), Submitter.name)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/submitters/default", response_model=Optional[SubmitterSummary])
async def get_default_submitter(
    db: AsyncSession = Depends(get_db),
):
    """Get the default submitter (usually 'Direct')"""
    query = select(Submitter).where(
        Submitter.is_default == True,
        Submitter.is_active == True
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.get("/submitters/{submitter_id}", response_model=SubmitterResponse)
async def get_submitter(
    submitter_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific submitter by ID"""
    query = select(Submitter).where(Submitter.id == submitter_id)
    result = await db.execute(query)
    submitter = result.scalar_one_or_none()
    
    if not submitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submitter not found"
        )
    
    return submitter


@router.get("/submitters/{submitter_id}/stats", response_model=SubmitterStats)
async def get_submitter_stats(
    submitter_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a specific submitter"""
    # Get submitter
    query = select(Submitter).where(Submitter.id == submitter_id)
    result = await db.execute(query)
    submitter = result.scalar_one_or_none()
    
    if not submitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submitter not found"
        )
    
    # Count grading submissions
    grading_query = select(func.count(CardGradingSubmission.id)).where(
        CardGradingSubmission.submitter_id == submitter_id
    )
    grading_result = await db.execute(grading_query)
    total_grading = grading_result.scalar() or 0
    
    # Count pending grading
    pending_grading_query = select(func.count(CardGradingSubmission.id)).where(
        CardGradingSubmission.submitter_id == submitter_id,
        CardGradingSubmission.status.in_(['pending', 'shipped', 'received', 'grading'])
    )
    pending_grading_result = await db.execute(pending_grading_query)
    pending_grading = pending_grading_result.scalar() or 0
    
    # Count auth submissions
    auth_query = select(func.count(AuthSubmission.id)).where(
        AuthSubmission.submitter_id == submitter_id
    )
    auth_result = await db.execute(auth_query)
    total_auth = auth_result.scalar() or 0
    
    # Count pending auth
    pending_auth_query = select(func.count(AuthSubmission.id)).where(
        AuthSubmission.submitter_id == submitter_id,
        AuthSubmission.status.in_(['pending', 'shipped', 'received', 'processing'])
    )
    pending_auth_result = await db.execute(pending_auth_query)
    pending_auth = pending_auth_result.scalar() or 0
    
    # Sum cards graded
    cards_graded_query = select(func.sum(CardGradingSubmission.cards_graded)).where(
        CardGradingSubmission.submitter_id == submitter_id
    )
    cards_graded_result = await db.execute(cards_graded_query)
    cards_graded = cards_graded_result.scalar() or 0
    
    # Sum items authenticated
    items_auth_query = select(func.sum(AuthSubmission.items_authenticated)).where(
        AuthSubmission.submitter_id == submitter_id
    )
    items_auth_result = await db.execute(items_auth_query)
    items_authenticated = items_auth_result.scalar() or 0
    
    return SubmitterStats(
        id=submitter.id,
        name=submitter.name,
        total_grading_submissions=total_grading,
        total_auth_submissions=total_auth,
        pending_grading=pending_grading,
        pending_auth=pending_auth,
        cards_graded=cards_graded,
        items_authenticated=items_authenticated,
    )


# ============================================
# CREATE / UPDATE / DELETE SUBMITTERS
# ============================================

@router.post("/submitters", response_model=SubmitterResponse, status_code=status.HTTP_201_CREATED)
async def create_submitter(
    data: SubmitterCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new submitter"""
    # Check for duplicate name
    existing_query = select(Submitter).where(Submitter.name == data.name)
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Submitter with name '{data.name}' already exists"
        )
    
    # If this is set as default, clear other defaults
    if data.is_default:
        clear_query = select(Submitter).where(Submitter.is_default == True)
        clear_result = await db.execute(clear_query)
        for s in clear_result.scalars():
            s.is_default = False
    
    submitter = Submitter(**data.model_dump())
    db.add(submitter)
    await db.commit()
    await db.refresh(submitter)
    
    return submitter


@router.patch("/submitters/{submitter_id}", response_model=SubmitterResponse)
async def update_submitter(
    submitter_id: UUID,
    data: SubmitterUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing submitter"""
    query = select(Submitter).where(Submitter.id == submitter_id)
    result = await db.execute(query)
    submitter = result.scalar_one_or_none()
    
    if not submitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submitter not found"
        )
    
    # Check for duplicate name if name is being changed
    update_data = data.model_dump(exclude_unset=True)
    if 'name' in update_data and update_data['name'] != submitter.name:
        existing_query = select(Submitter).where(Submitter.name == update_data['name'])
        existing = await db.execute(existing_query)
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Submitter with name '{update_data['name']}' already exists"
            )
    
    # If this is set as default, clear other defaults
    if update_data.get('is_default'):
        clear_query = select(Submitter).where(
            Submitter.is_default == True,
            Submitter.id != submitter_id
        )
        clear_result = await db.execute(clear_query)
        for s in clear_result.scalars():
            s.is_default = False
    
    for field, value in update_data.items():
        setattr(submitter, field, value)
    
    await db.commit()
    await db.refresh(submitter)
    
    return submitter


@router.delete("/submitters/{submitter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_submitter(
    submitter_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a submitter.
    
    Note: This will set submitter_id to NULL on any linked submissions.
    Consider deactivating instead of deleting for historical records.
    """
    query = select(Submitter).where(Submitter.id == submitter_id)
    result = await db.execute(query)
    submitter = result.scalar_one_or_none()
    
    if not submitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submitter not found"
        )
    
    # Prevent deleting the default "Direct" submitter
    if submitter.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default submitter. Deactivate it instead."
        )
    
    await db.delete(submitter)
    await db.commit()


@router.post("/submitters/{submitter_id}/set-default", response_model=SubmitterResponse)
async def set_default_submitter(
    submitter_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Set a submitter as the default"""
    query = select(Submitter).where(Submitter.id == submitter_id)
    result = await db.execute(query)
    submitter = result.scalar_one_or_none()
    
    if not submitter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submitter not found"
        )
    
    if not submitter.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set inactive submitter as default"
        )
    
    # Clear existing default
    clear_query = select(Submitter).where(Submitter.is_default == True)
    clear_result = await db.execute(clear_query)
    for s in clear_result.scalars():
        s.is_default = False
    
    submitter.is_default = True
    await db.commit()
    await db.refresh(submitter)
    
    return submitter