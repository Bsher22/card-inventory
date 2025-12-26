"""
Card Types and Parallels Routes
API endpoints for managing base types, parallels, and related operations
"""

import os
import tempfile
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models_card_types import CardBaseType, ParallelCategory, Parallel, CardPrefixMapping
from ..schemas_card_types import (
    CardBaseTypeCreate, CardBaseTypeUpdate, CardBaseTypeResponse, CardBaseTypeWithCounts,
    ParallelCategoryCreate, ParallelCategoryUpdate, ParallelCategoryResponse, ParallelCategoryWithParallels,
    ParallelCreate, ParallelUpdate, ParallelResponse, ParallelWithCategory, ParallelWithInventoryCount,
    ParallelFilter,
    CardPrefixMappingCreate, CardPrefixMappingResponse,
)
from ..services.checklist_pdf_parser import BowmanChecklistParser, ChecklistParseResult

router = APIRouter(prefix="/api", tags=["Card Types & Parallels"])

# ============================================
# PDF DIRECTORY CONFIGURATION
# ============================================

# Default PDF directory - can be overridden by environment variable
PDF_CHECKLIST_DIR = os.environ.get(
    "PDF_CHECKLIST_DIR",
    r"C:\Users\Brian\Desktop\IDGAS\data"
)


def get_pdf_directory() -> Path:
    """Get the configured PDF directory path"""
    return Path(PDF_CHECKLIST_DIR)


# ============================================
# CARD BASE TYPES ENDPOINTS
# ============================================

@router.get("/base-types", response_model=List[CardBaseTypeResponse])
async def list_base_types(db: AsyncSession = Depends(get_db)):
    """List all card base types (Paper, Chrome, Mega, Sapphire)"""
    result = await db.execute(
        select(CardBaseType).order_by(CardBaseType.sort_order)
    )
    return result.scalars().all()


@router.get("/base-types/with-counts", response_model=List[CardBaseTypeWithCounts])
async def list_base_types_with_counts(db: AsyncSession = Depends(get_db)):
    """List base types with checklist and inventory counts"""
    result = await db.execute(
        select(CardBaseType).order_by(CardBaseType.sort_order)
    )
    base_types = result.scalars().all()
    
    return [
        CardBaseTypeWithCounts(
            **{k: v for k, v in bt.__dict__.items() if not k.startswith('_')},
            checklist_count=0,
            inventory_count=0,
        )
        for bt in base_types
    ]


@router.get("/base-types/{base_type_id}", response_model=CardBaseTypeResponse)
async def get_base_type(base_type_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific base type by ID"""
    result = await db.execute(
        select(CardBaseType).where(CardBaseType.id == base_type_id)
    )
    base_type = result.scalar_one_or_none()
    if not base_type:
        raise HTTPException(status_code=404, detail="Base type not found")
    return base_type


@router.post("/base-types", response_model=CardBaseTypeResponse, status_code=201)
async def create_base_type(
    data: CardBaseTypeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new base type"""
    base_type = CardBaseType(**data.model_dump())
    db.add(base_type)
    await db.commit()
    await db.refresh(base_type)
    return base_type


@router.patch("/base-types/{base_type_id}", response_model=CardBaseTypeResponse)
async def update_base_type(
    base_type_id: UUID,
    data: CardBaseTypeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a base type"""
    result = await db.execute(
        select(CardBaseType).where(CardBaseType.id == base_type_id)
    )
    base_type = result.scalar_one_or_none()
    if not base_type:
        raise HTTPException(status_code=404, detail="Base type not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(base_type, key, value)
    
    await db.commit()
    await db.refresh(base_type)
    return base_type


# ============================================
# PARALLEL CATEGORIES ENDPOINTS
# ============================================

@router.get("/parallel-categories", response_model=List[ParallelCategoryResponse])
async def list_parallel_categories(db: AsyncSession = Depends(get_db)):
    """List all parallel categories"""
    result = await db.execute(
        select(ParallelCategory).order_by(ParallelCategory.sort_order)
    )
    return result.scalars().all()


@router.get("/parallel-categories/with-parallels", response_model=List[ParallelCategoryWithParallels])
async def list_categories_with_parallels(db: AsyncSession = Depends(get_db)):
    """List all categories with their parallels"""
    result = await db.execute(
        select(ParallelCategory)
        .options(selectinload(ParallelCategory.parallels))
        .order_by(ParallelCategory.sort_order)
    )
    return result.scalars().all()


@router.get("/parallel-categories/{category_id}", response_model=ParallelCategoryWithParallels)
async def get_parallel_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific category with its parallels"""
    result = await db.execute(
        select(ParallelCategory)
        .options(selectinload(ParallelCategory.parallels))
        .where(ParallelCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/parallel-categories", response_model=ParallelCategoryResponse, status_code=201)
async def create_parallel_category(
    data: ParallelCategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new parallel category"""
    category = ParallelCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


# ============================================
# PARALLELS ENDPOINTS
# ============================================

@router.get("/parallels", response_model=List[ParallelWithCategory])
async def list_parallels(
    category_id: Optional[UUID] = None,
    is_numbered: Optional[bool] = None,
    max_print_run: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all parallels with optional filtering"""
    query = select(Parallel).options(selectinload(Parallel.category))
    
    if category_id:
        query = query.where(Parallel.category_id == category_id)
    if is_numbered is not None:
        query = query.where(Parallel.is_numbered == is_numbered)
    if max_print_run:
        query = query.where(Parallel.print_run <= max_print_run)
    if search:
        query = query.where(
            Parallel.name.ilike(f"%{search}%") |
            Parallel.short_name.ilike(f"%{search}%")
        )
    
    query = query.order_by(Parallel.sort_order)
    result = await db.execute(query)
    parallels = result.scalars().all()
    
    return [
        ParallelWithCategory(
            **{k: v for k, v in p.__dict__.items() if not k.startswith('_')},
            display_name=p.display_name,
            category=p.category,
        )
        for p in parallels
    ]


@router.get("/parallels/by-rarity", response_model=List[ParallelWithCategory])
async def list_parallels_by_rarity(
    max_print_run: int = Query(50, description="Maximum print run to include"),
    db: AsyncSession = Depends(get_db)
):
    """List parallels by rarity (limited print runs)"""
    result = await db.execute(
        select(Parallel)
        .options(selectinload(Parallel.category))
        .where(Parallel.print_run <= max_print_run)
        .where(Parallel.print_run.isnot(None))
        .order_by(Parallel.print_run)
    )
    parallels = result.scalars().all()
    
    return [
        ParallelWithCategory(
            **{k: v for k, v in p.__dict__.items() if not k.startswith('_')},
            display_name=p.display_name,
            category=p.category,
        )
        for p in parallels
    ]


@router.get("/parallels/{parallel_id}", response_model=ParallelWithCategory)
async def get_parallel(parallel_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific parallel by ID"""
    result = await db.execute(
        select(Parallel)
        .options(selectinload(Parallel.category))
        .where(Parallel.id == parallel_id)
    )
    parallel = result.scalar_one_or_none()
    if not parallel:
        raise HTTPException(status_code=404, detail="Parallel not found")
    
    return ParallelWithCategory(
        **{k: v for k, v in parallel.__dict__.items() if not k.startswith('_')},
        display_name=parallel.display_name,
        category=parallel.category,
    )


@router.post("/parallels", response_model=ParallelResponse, status_code=201)
async def create_parallel(
    data: ParallelCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new parallel type"""
    if data.print_run == 1:
        data.is_one_of_one = True
    
    parallel = Parallel(**data.model_dump())
    db.add(parallel)
    await db.commit()
    await db.refresh(parallel)
    return parallel


@router.patch("/parallels/{parallel_id}", response_model=ParallelResponse)
async def update_parallel(
    parallel_id: UUID,
    data: ParallelUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a parallel"""
    result = await db.execute(
        select(Parallel).where(Parallel.id == parallel_id)
    )
    parallel = result.scalar_one_or_none()
    if not parallel:
        raise HTTPException(status_code=404, detail="Parallel not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(parallel, key, value)
    
    if parallel.print_run == 1:
        parallel.is_one_of_one = True
    
    await db.commit()
    await db.refresh(parallel)
    return parallel


@router.delete("/parallels/{parallel_id}", status_code=204)
async def delete_parallel(parallel_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a parallel (only if not in use)"""
    result = await db.execute(
        select(Parallel).where(Parallel.id == parallel_id)
    )
    parallel = result.scalar_one_or_none()
    if not parallel:
        raise HTTPException(status_code=404, detail="Parallel not found")
    
    await db.delete(parallel)
    await db.commit()


# ============================================
# PREFIX MAPPINGS ENDPOINTS
# ============================================

@router.get("/prefix-mappings", response_model=List[CardPrefixMappingResponse])
async def list_prefix_mappings(
    product_type: Optional[str] = None,
    is_prospect: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """List card prefix mappings"""
    query = select(CardPrefixMapping)
    
    if product_type:
        query = query.where(CardPrefixMapping.product_type == product_type)
    if is_prospect is not None:
        query = query.where(CardPrefixMapping.is_prospect == is_prospect)
    
    query = query.order_by(CardPrefixMapping.prefix)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/prefix-mappings", response_model=CardPrefixMappingResponse, status_code=201)
async def create_prefix_mapping(
    data: CardPrefixMappingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new prefix mapping"""
    mapping = CardPrefixMapping(**data.model_dump())
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping


# ============================================
# CHECKLIST PDF PARSING ENDPOINTS
# ============================================

@router.get("/checklists/available-pdfs")
async def list_available_pdfs():
    """
    List all PDF files available in the configured directory
    Directory: C:\\Users\\Brian\\Desktop\\IDGAS\\data
    """
    pdf_dir = get_pdf_directory()
    
    if not pdf_dir.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"PDF directory not found: {pdf_dir}"
        )
    
    pdf_files = list(pdf_dir.glob("*.pdf"))
    
    return {
        "directory": str(pdf_dir),
        "files": [
            {
                "filename": f.name,
                "size_kb": round(f.stat().st_size / 1024, 1),
                "path": str(f),
            }
            for f in sorted(pdf_files)
        ],
        "count": len(pdf_files),
    }


@router.post("/checklists/parse-pdf")
async def parse_checklist_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Parse an uploaded Bowman checklist PDF and return prospect cards
    Does NOT save to database - just returns parsed data for review
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        parser = BowmanChecklistParser()
        result = parser.parse_pdf(tmp_path)
        return result.to_dict()
    finally:
        os.unlink(tmp_path)


@router.post("/checklists/parse-local/{filename}")
async def parse_local_pdf(
    filename: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Parse a PDF from the local directory: C:\\Users\\Brian\\Desktop\\IDGAS\\data
    
    Example: POST /api/checklists/parse-local/2025_Bowman_Chrome.pdf
    """
    pdf_dir = get_pdf_directory()
    pdf_path = pdf_dir / filename
    
    if not pdf_path.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"PDF not found: {filename}. Available files: {[f.name for f in pdf_dir.glob('*.pdf')]}"
        )
    
    if not pdf_path.suffix.lower() == '.pdf':
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    parser = BowmanChecklistParser()
    result = parser.parse_pdf(str(pdf_path))
    return result.to_dict()


@router.post("/checklists/parse-all-local")
async def parse_all_local_pdfs():
    """
    Parse ALL PDFs in the local directory: C:\\Users\\Brian\\Desktop\\IDGAS\\data
    Returns combined results from all checklist files
    """
    pdf_dir = get_pdf_directory()
    
    if not pdf_dir.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"PDF directory not found: {pdf_dir}"
        )
    
    pdf_files = list(pdf_dir.glob("*.pdf"))
    
    if not pdf_files:
        raise HTTPException(
            status_code=404, 
            detail=f"No PDF files found in {pdf_dir}"
        )
    
    parser = BowmanChecklistParser()
    results = []
    
    for pdf_path in sorted(pdf_files):
        try:
            result = parser.parse_pdf(str(pdf_path))
            results.append({
                "filename": pdf_path.name,
                "result": result.to_dict(),
            })
        except Exception as e:
            results.append({
                "filename": pdf_path.name,
                "error": str(e),
            })
    
    # Summary stats
    total_cards = sum(
        r["result"]["stats"]["prospect_cards_found"] 
        for r in results 
        if "result" in r
    )
    
    return {
        "directory": str(pdf_dir),
        "files_processed": len(results),
        "total_prospect_cards": total_cards,
        "results": results,
    }


@router.post("/checklists/import-parsed")
async def import_parsed_checklist(
    product_line_id: UUID,
    parsed_cards: List[dict],
    db: AsyncSession = Depends(get_db)
):
    """
    Import previously parsed checklist cards into the database
    
    Expects the cards array from parse-pdf endpoint
    """
    from ..models import Checklist, ProductLine
    
    pl_result = await db.execute(
        select(ProductLine).where(ProductLine.id == product_line_id)
    )
    product_line = pl_result.scalar_one_or_none()
    if not product_line:
        raise HTTPException(status_code=404, detail="Product line not found")
    
    bt_result = await db.execute(select(CardBaseType))
    base_types = {bt.name: bt.id for bt in bt_result.scalars().all()}
    
    imported = 0
    errors = []
    
    for card_data in parsed_cards:
        try:
            base_type_id = base_types.get(card_data.get('base_type'))
            
            checklist = Checklist(
                product_line_id=product_line_id,
                card_number=card_data['card_number'],
                card_prefix=card_data.get('card_prefix'),
                card_suffix=card_data.get('card_suffix'),
                player_name_raw=card_data['player_name'],
                team=card_data.get('team'),
                is_autograph=card_data.get('is_autograph', False),
                is_rookie_card=card_data.get('is_rookie', False),
                set_name=card_data.get('set_name'),
                base_type_id=base_type_id,
                raw_checklist_line=card_data.get('raw_line'),
            )
            db.add(checklist)
            imported += 1
        except Exception as e:
            errors.append({
                'card': card_data.get('card_number'),
                'error': str(e)
            })
    
    await db.commit()
    
    return {
        'imported': imported,
        'errors': errors,
        'product_line_id': str(product_line_id),
    }