"""
Beckett Import API Routes
=========================

Complete FastAPI routes for importing Beckett XLSX checklists.
Includes preview and import endpoints with is_first_bowman support.

Place in: backend/app/routes/beckett.py
"""

from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional

from app.database import get_db
from app.models import Brand, ProductLine, Checklist, Player
from app.schemas import (
    BeckettImportPreview,
    BeckettImportResponse,
    BeckettParsedCard,
)
from app.services.beckett_parser import parse_beckett_bytes, BeckettParser
from app.services.beckett_import_service import BeckettImportService


router = APIRouter(prefix="/api/beckett", tags=["Beckett Import"])


@router.post("/preview", response_model=BeckettImportPreview)
async def preview_beckett_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview a Beckett XLSX file before importing.
    
    Returns product info, card counts, and sample cards.
    Does not modify the database.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(400, "File must be an XLSX file")
    
    # Read and parse file
    content = await file.read()
    
    try:
        result = parse_beckett_bytes(content, file.filename)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")
    
    if result.error_count > 0 and result.parsed_count == 0:
        raise HTTPException(400, f"Failed to parse file: {'; '.join(result.errors[:5])}")
    
    # Check if product line already exists
    pl_result = await db.execute(
        select(ProductLine).where(
            ProductLine.name == result.product_name,
            ProductLine.year == result.year,
        )
    )
    product_line = pl_result.scalar_one_or_none()
    
    # Count card types
    first_bowman_count = sum(1 for c in result.cards if c.is_first_bowman)
    auto_count = sum(1 for c in result.cards if c.is_autograph)
    rookie_count = sum(1 for c in result.cards if c.is_rookie_card)
    
    # Convert sample cards to schema
    sample_cards = [
        BeckettParsedCard(
            set_name=c.set_name,
            card_number=c.card_number,
            card_prefix=c.card_prefix,
            card_suffix=c.card_suffix,
            player_name=c.player_name,
            team=c.team,
            is_rookie_card=c.is_rookie_card,
            is_autograph=c.is_autograph,
            is_relic=c.is_relic,
            is_first_bowman=c.is_first_bowman,
            serial_numbered=c.serial_numbered,
            notes=c.notes,
            raw_line=c.raw_line,
        )
        for c in result.cards[:15]  # Return first 15 as sample
    ]
    
    return BeckettImportPreview(
        product_name=result.product_name,
        year=result.year,
        brand=result.brand,
        total_cards=result.parsed_count,
        first_bowman_count=first_bowman_count,
        auto_count=auto_count,
        rookie_count=rookie_count,
        sets_found=result.sets_found,
        sample_cards=sample_cards,
        product_line_exists=product_line is not None,
        product_line_id=str(product_line.id) if product_line else None,
    )


@router.post("/import", response_model=BeckettImportResponse)
async def import_beckett_file(
    file: UploadFile = File(...),
    create_product_line: bool = Query(True, description="Create product line if not exists"),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a Beckett XLSX checklist file.
    
    Creates/updates:
    - Brand (if not exists)
    - Product line (if create_product_line=True)
    - Players (with fuzzy matching)
    - Checklist entries
    
    Returns import statistics.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(400, "File must be an XLSX file")
    
    # Read file content
    content = await file.read()
    
    # Create service and import
    service = BeckettImportService(db)
    
    try:
        result = await service.import_from_bytes(
            content,
            file.filename,
            create_product_line=create_product_line,
        )
    except Exception as e:
        raise HTTPException(500, f"Import failed: {str(e)}")
    
    if not result.success and result.errors:
        raise HTTPException(400, f"Import failed: {'; '.join(result.errors[:5])}")
    
    return BeckettImportResponse(
        success=result.success,
        product_line_id=str(result.product_line_id) if result.product_line_id else None,
        product_line_name=result.product_line_name,
        year=result.year,
        brand=result.brand,
        total_cards=result.total_cards,
        cards_created=result.cards_created,
        cards_updated=result.cards_updated,
        cards_skipped=result.cards_skipped,
        players_created=result.players_created,
        players_matched=result.players_matched,
        first_bowman_count=result.first_bowman_count,
        sets_imported=result.sets_imported,
        errors=result.errors,
        warnings=result.warnings,
    )


@router.get("/sets/{product_line_id}")
async def get_sets_for_product_line(
    product_line_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, int]:
    """
    Get set names and counts for a product line.
    Useful for filtering checklists by set.
    """
    result = await db.execute(
        select(
            Checklist.set_name,
            func.count(Checklist.id).label('count')
        )
        .where(Checklist.product_line_id == product_line_id)
        .group_by(Checklist.set_name)
        .order_by(func.count(Checklist.id).desc())
    )
    
    sets = {}
    for row in result.all():
        set_name = row.set_name or "Unknown"
        sets[set_name] = row.count
    
    return sets


@router.get("/first-bowman-stats")
async def get_first_bowman_stats(
    db: AsyncSession = Depends(get_db),
) -> Dict:
    """
    Get statistics about 1st Bowman cards in the database.
    """
    # Total 1st Bowman cards
    total_result = await db.execute(
        select(func.count(Checklist.id))
        .where(Checklist.is_first_bowman == True)
    )
    total_first_bowman = total_result.scalar() or 0
    
    # By year
    by_year_result = await db.execute(
        select(
            ProductLine.year,
            func.count(Checklist.id).label('count')
        )
        .join(ProductLine, Checklist.product_line_id == ProductLine.id)
        .where(Checklist.is_first_bowman == True)
        .group_by(ProductLine.year)
        .order_by(ProductLine.year.desc())
    )
    by_year = {row.year: row.count for row in by_year_result.all()}
    
    # By product line
    by_product_result = await db.execute(
        select(
            ProductLine.name,
            ProductLine.year,
            func.count(Checklist.id).label('count')
        )
        .join(ProductLine, Checklist.product_line_id == ProductLine.id)
        .where(Checklist.is_first_bowman == True)
        .group_by(ProductLine.id, ProductLine.name, ProductLine.year)
        .order_by(func.count(Checklist.id).desc())
        .limit(20)
    )
    by_product = [
        {"name": row.name, "year": row.year, "count": row.count}
        for row in by_product_result.all()
    ]
    
    return {
        "total_first_bowman": total_first_bowman,
        "by_year": by_year,
        "top_products": by_product,
    }


@router.get("/supported-products")
async def get_supported_products() -> List[Dict]:
    """
    Get list of Bowman products the parser recognizes.
    """
    return [
        {
            "name": "Bowman",
            "url_pattern": "bowman-baseball",
            "description": "Main Bowman Baseball set with prospects",
        },
        {
            "name": "Bowman Chrome",
            "url_pattern": "bowman-chrome",
            "description": "Bowman Chrome with Refractor parallels",
        },
        {
            "name": "Bowman Draft",
            "url_pattern": "bowman-draft",
            "description": "Bowman Draft with latest draft picks",
        },
        {
            "name": "Bowman Sterling",
            "url_pattern": "bowman-sterling",
            "description": "Premium Bowman set with autographs",
        },
        {
            "name": "Bowman Platinum",
            "url_pattern": "bowman-platinum",
            "description": "Bowman Platinum prospect set",
        },
    ]