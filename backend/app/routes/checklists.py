"""
Checklist Routes

Handles checklist CRUD operations and file uploads for importing checklists.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Checklist, Player, ProductLine, Inventory
from app.schemas import (
    ChecklistCreate, ChecklistUpdate, ChecklistResponse, ChecklistWithDetails,
    ChecklistUploadResult, ChecklistUploadPreview, PlayerResponse
)
from app.services.checklist_parser import ChecklistParser

router = APIRouter()


@router.get("/checklists", response_model=list[ChecklistWithDetails])
async def list_checklists(
    product_line_id: Optional[UUID] = Query(None),
    player_id: Optional[UUID] = Query(None),
    is_rookie: Optional[bool] = Query(None),
    is_auto: Optional[bool] = Query(None),
    is_relic: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List checklists with optional filters."""
    query = (
        select(Checklist)
        .options(
            selectinload(Checklist.player),
            selectinload(Checklist.card_type),
            selectinload(Checklist.product_line),
        )
    )
    
    if product_line_id:
        query = query.where(Checklist.product_line_id == product_line_id)
    
    if player_id:
        query = query.where(Checklist.player_id == player_id)
    
    if is_rookie is not None:
        query = query.where(Checklist.is_rookie_card == is_rookie)
    
    if is_auto is not None:
        query = query.where(Checklist.is_autograph == is_auto)
    
    if is_relic is not None:
        query = query.where(Checklist.is_relic == is_relic)
    
    if search:
        search_term = f"%{search}%"
        query = query.outerjoin(Player).where(
            (Checklist.card_number.ilike(search_term)) |
            (Checklist.player_name_raw.ilike(search_term)) |
            (Player.name.ilike(search_term)) |
            (Checklist.team.ilike(search_term))
        )
    
    query = query.order_by(Checklist.card_number).offset(skip).limit(limit)
    
    result = await db.execute(query)
    checklists = result.scalars().all()
    
    # Add inventory quantity to each checklist
    checklist_ids = [c.id for c in checklists]
    if checklist_ids:
        inv_query = (
            select(Inventory.checklist_id, func.sum(Inventory.quantity).label("qty"))
            .where(Inventory.checklist_id.in_(checklist_ids))
            .group_by(Inventory.checklist_id)
        )
        inv_result = await db.execute(inv_query)
        inv_map = {row.checklist_id: row.qty for row in inv_result.all()}
        
        # Convert to response with inventory
        responses = []
        for c in checklists:
            resp = ChecklistWithDetails.model_validate(c)
            resp.inventory_quantity = inv_map.get(c.id, 0)
            responses.append(resp)
        return responses
    
    return checklists


@router.get("/checklists/{checklist_id}", response_model=ChecklistWithDetails)
async def get_checklist(
    checklist_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single checklist entry."""
    result = await db.execute(
        select(Checklist)
        .options(
            selectinload(Checklist.player),
            selectinload(Checklist.card_type),
            selectinload(Checklist.product_line),
            selectinload(Checklist.inventory_items),
        )
        .where(Checklist.id == checklist_id)
    )
    checklist = result.scalar_one_or_none()
    
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist entry not found")
    
    resp = ChecklistWithDetails.model_validate(checklist)
    resp.inventory_quantity = sum(i.quantity for i in checklist.inventory_items)
    return resp


@router.post("/checklists", response_model=ChecklistResponse, status_code=201)
async def create_checklist(
    data: ChecklistCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new checklist entry."""
    # Verify product line exists
    pl = await db.get(ProductLine, data.product_line_id)
    if not pl:
        raise HTTPException(status_code=404, detail="Product line not found")
    
    # Check for duplicate
    existing = await db.execute(
        select(Checklist).where(
            Checklist.product_line_id == data.product_line_id,
            Checklist.card_number == data.card_number,
            Checklist.parallel_name == (data.parallel_name or "Base"),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Card already exists in checklist"
        )
    
    checklist = Checklist(**data.model_dump())
    db.add(checklist)
    await db.flush()
    await db.refresh(checklist)
    return checklist


@router.patch("/checklists/{checklist_id}", response_model=ChecklistResponse)
async def update_checklist(
    checklist_id: UUID,
    data: ChecklistUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a checklist entry."""
    checklist = await db.get(Checklist, checklist_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist entry not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(checklist, field, value)
    
    await db.flush()
    await db.refresh(checklist)
    return checklist


@router.delete("/checklists/{checklist_id}", status_code=204)
async def delete_checklist(
    checklist_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a checklist entry."""
    checklist = await db.get(Checklist, checklist_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist entry not found")
    
    await db.delete(checklist)
    await db.flush()


# ============================================
# CHECKLIST UPLOAD ROUTES
# ============================================

@router.post("/checklists/upload/preview", response_model=ChecklistUploadPreview)
async def preview_checklist_upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview a checklist file before importing.
    Returns detected columns and sample data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    valid_extensions = ('.csv', '.xlsx', '.xls')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported: {', '.join(valid_extensions)}"
        )
    
    content = await file.read()
    parser = ChecklistParser(db)
    
    try:
        preview = await parser.preview_upload(content, file.filename)
        
        # Ensure filename is included in response
        if isinstance(preview, dict):
            preview['filename'] = file.filename
            return ChecklistUploadPreview(**preview)
        else:
            # If preview is already a Pydantic model or object, build response manually
            return ChecklistUploadPreview(
                filename=file.filename,
                total_rows=getattr(preview, 'total_rows', 0),
                sample_rows=getattr(preview, 'sample_rows', []),
                detected_columns=getattr(preview, 'detected_columns', {}),
                unmapped_columns=getattr(preview, 'unmapped_columns', []),
                column_mapping=getattr(preview, 'column_mapping', {}),
                columns_found=getattr(preview, 'columns_found', []),
                detected_product=getattr(preview, 'detected_product', None),
                detected_year=getattr(preview, 'detected_year', None),
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@router.post("/checklists/upload", response_model=ChecklistUploadResult)
async def upload_checklist(
    file: UploadFile = File(...),
    product_line_id: UUID = Form(...),
    column_mapping: Optional[str] = Form(None),  # JSON string
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and import a checklist file.
    """
    import json
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    valid_extensions = ('.csv', '.xlsx', '.xls')
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported: {', '.join(valid_extensions)}"
        )
    
    # Parse column mapping if provided
    mapping = None
    if column_mapping:
        try:
            mapping = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid column mapping JSON")
    
    content = await file.read()
    parser = ChecklistParser(db)
    
    try:
        result = await parser.import_checklist(
            content, 
            file.filename, 
            product_line_id,
            mapping,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")


# ============================================
# PLAYER ROUTES (for checklist management)
# ============================================

@router.get("/players", response_model=list[PlayerResponse])
async def list_players(
    search: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    is_rookie: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List players with optional filters."""
  
    query = select(Player)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(Player.name.ilike(search_term))
    
    if team:
        query = query.where(Player.team == team)
    
    if is_rookie is not None:
        query = query.where(Player.is_rookie == is_rookie)
    
    query = query.order_by(Player.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()