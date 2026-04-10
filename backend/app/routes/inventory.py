"""
Inventory Routes

Handles inventory CRUD operations, analytics, and spreadsheet uploads.
"""

import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import pandas as pd

from app.database import get_db
from app.models import Checklist, Player, ProductLine, Brand, Inventory
from app.schemas import (
    InventoryCreate, InventoryUpdate, InventoryAdjust,
    InventoryResponse, InventoryWithCard, PlayerInventorySummary,
    InventoryAnalytics
)
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("/inventory", response_model=list[InventoryWithCard])
async def list_inventory(
    product_line_id: Optional[UUID] = Query(None),
    player_id: Optional[UUID] = Query(None),
    brand_id: Optional[UUID] = Query(None),
    in_stock_only: bool = Query(True),
    is_signed: Optional[bool] = Query(None),
    is_slabbed: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List inventory items with optional filters."""
    service = InventoryService(db)
    return await service.get_all(
        skip=skip,
        limit=limit,
        product_line_id=product_line_id,
        player_id=player_id,
        brand_id=brand_id,
        in_stock_only=in_stock_only,
        is_signed=is_signed,
        is_slabbed=is_slabbed,
        search=search,
    )


@router.get("/inventory/analytics", response_model=InventoryAnalytics)
async def get_inventory_analytics(db: AsyncSession = Depends(get_db)):
    """Get comprehensive inventory analytics."""
    service = InventoryService(db)
    return await service.get_analytics()


@router.get("/inventory/players", response_model=list[PlayerInventorySummary])
async def get_player_inventory_summary(
    limit: int = Query(20, ge=1, le=100),
    min_cards: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    """Get inventory summary grouped by player."""
    service = InventoryService(db)
    return await service.get_player_summary(limit=limit, min_cards=min_cards)


@router.get("/inventory/{inventory_id}", response_model=InventoryWithCard)
async def get_inventory_item(
    inventory_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single inventory item."""
    service = InventoryService(db)
    inventory = await service.get_by_id(inventory_id)
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return inventory


@router.post("/inventory", response_model=InventoryResponse, status_code=201)
async def create_inventory(
    data: InventoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new inventory item."""
    service = InventoryService(db)
    
    try:
        return await service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/inventory/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(
    inventory_id: UUID,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an inventory item."""
    service = InventoryService(db)
    inventory = await service.update(inventory_id, data)
    
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return inventory


@router.post("/inventory/{inventory_id}/adjust", response_model=InventoryResponse)
async def adjust_inventory_quantity(
    inventory_id: UUID,
    data: InventoryAdjust,
    db: AsyncSession = Depends(get_db),
):
    """Adjust inventory quantity by a positive or negative amount."""
    service = InventoryService(db)
    
    try:
        inventory = await service.adjust_quantity(inventory_id, data.adjustment)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return inventory
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/inventory/{inventory_id}", status_code=204)
async def delete_inventory(
    inventory_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an inventory item."""
    service = InventoryService(db)
    deleted = await service.delete(inventory_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Inventory item not found")


# ============================================
# BULK INVENTORY OPERATIONS
# ============================================

from pydantic import BaseModel
from decimal import Decimal


class BulkInventoryItem(BaseModel):
    checklist_id: UUID
    quantity: int
    raw_condition: str = "NM"
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = None


class BulkInventoryAdd(BaseModel):
    items: list[BulkInventoryItem]


class BulkInventoryResult(BaseModel):
    success_count: int
    error_count: int
    errors: list[str] = []


@router.post("/inventory/bulk", response_model=BulkInventoryResult)
async def bulk_add_inventory(
    data: BulkInventoryAdd,
    db: AsyncSession = Depends(get_db),
):
    """Add multiple items to inventory at once."""
    service = InventoryService(db)
    result = BulkInventoryResult(success_count=0, error_count=0)
    
    for item in data.items:
        try:
            await service.add_to_inventory(
                checklist_id=item.checklist_id,
                quantity=item.quantity,
                raw_condition=item.raw_condition,
                grade_company=item.grade_company,
                grade_value=item.grade_value,
            )
            result.success_count += 1
        except Exception as e:
            result.error_count += 1
            result.errors.append(f"Checklist {item.checklist_id}: {str(e)}")

    return result


# ============================================
# SPREADSHEET UPLOAD
# ============================================

from decimal import Decimal as Dec


class SpreadsheetPreviewRow(BaseModel):
    row_num: int
    player: Optional[str] = None
    year: Optional[str] = None
    product: Optional[str] = None
    card_number: Optional[str] = None
    parallel: Optional[str] = None
    quantity: int = 1
    condition: str = "NM"
    is_signed: bool = False
    is_slabbed: bool = False
    grade_company: Optional[str] = None
    grade_value: Optional[float] = None
    cost: Optional[float] = None
    checklist_id: Optional[str] = None
    match_status: str = "unmatched"  # matched, unmatched, multiple


class SpreadsheetPreviewResponse(BaseModel):
    total_rows: int
    matched_rows: int
    unmatched_rows: int
    detected_columns: dict[str, str] = {}
    rows: list[SpreadsheetPreviewRow] = []
    sample_data: list[dict] = []


class SpreadsheetConfirmItem(BaseModel):
    checklist_id: UUID
    quantity: int = 1
    raw_condition: str = "NM"
    is_signed: bool = False
    is_slabbed: bool = False
    grade_company: Optional[str] = None
    grade_value: Optional[Dec] = None
    card_cost: Dec = Dec("0")


class SpreadsheetConfirmRequest(BaseModel):
    items: list[SpreadsheetConfirmItem]


class SpreadsheetConfirmResponse(BaseModel):
    created: int = 0
    updated: int = 0
    errors: list[str] = []


# Column name mappings (spreadsheet column → internal field)
COLUMN_ALIASES = {
    "player": ["player", "player_name", "name", "player name"],
    "year": ["year", "yr"],
    "product": ["product", "product_line", "product line", "set", "brand", "card_type", "card type", "type"],
    "card_number": ["card_number", "card number", "card #", "card#", "number", "#", "no", "no."],
    "parallel": ["parallel", "variant", "version", "type", "insert"],
    "quantity": ["quantity", "qty", "count", "amount", "num"],
    "condition": ["condition", "cond", "raw_condition"],
    "is_signed": ["signed", "is_signed", "auto", "autograph", "autographed"],
    "is_slabbed": ["slabbed", "is_slabbed", "graded"],
    "grade_company": ["grade_company", "grader", "grading_company", "grading company", "slab company"],
    "grade_value": ["grade_value", "grade", "score"],
    "cost": ["cost", "price", "unit_price", "card_cost", "paid", "total_cost", "purchase_price"],
}


def _detect_columns(df: pd.DataFrame) -> dict[str, str]:
    """Map spreadsheet columns to internal field names."""
    mapping = {}
    df_cols_lower = {col.strip().lower(): col for col in df.columns}

    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in df_cols_lower:
                mapping[field] = df_cols_lower[alias.lower()]
                break

    return mapping


def _parse_bool(val) -> bool:
    """Parse various bool-like values."""
    if pd.isna(val):
        return False
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ("true", "1", "yes", "y", "x")


@router.post("/inventory/upload/preview")
async def preview_spreadsheet_upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse a spreadsheet and attempt to match rows to existing checklists.
    Returns preview data for user confirmation.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV or Excel.")

    contents = await file.read()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File contains no data")

    # Detect column mappings
    col_map = _detect_columns(df)

    # Build preview rows with checklist matching
    preview_rows: list[SpreadsheetPreviewRow] = []
    matched = 0
    unmatched = 0

    for idx, row in df.iterrows():
        player = str(row.get(col_map.get("player", ""), "")).strip() if "player" in col_map else None
        year = str(row.get(col_map.get("year", ""), "")).strip() if "year" in col_map else None
        product = str(row.get(col_map.get("product", ""), "")).strip() if "product" in col_map else None
        card_number = str(row.get(col_map.get("card_number", ""), "")).strip() if "card_number" in col_map else None
        parallel = str(row.get(col_map.get("parallel", ""), "")).strip() if "parallel" in col_map else None

        # Clean up NaN values
        if player and player.lower() == "nan":
            player = None
        if year and year.lower() == "nan":
            year = None
        if product and product.lower() == "nan":
            product = None
        if card_number and card_number.lower() == "nan":
            card_number = None
        if parallel and (parallel.lower() == "nan" or parallel.lower() == "base"):
            parallel = None

        # Parse quantity
        qty = 1
        if "quantity" in col_map:
            try:
                qty = int(float(row.get(col_map["quantity"], 1)))
            except (ValueError, TypeError):
                qty = 1

        # Parse condition
        condition = "NM"
        if "condition" in col_map:
            cond_val = row.get(col_map["condition"], "NM")
            if pd.notna(cond_val):
                condition = str(cond_val).strip()

        # Parse booleans
        is_signed = _parse_bool(row.get(col_map.get("is_signed", ""), False)) if "is_signed" in col_map else False
        is_slabbed = _parse_bool(row.get(col_map.get("is_slabbed", ""), False)) if "is_slabbed" in col_map else False

        # Parse grading
        grade_company = None
        grade_value = None
        if "grade_company" in col_map:
            gc = row.get(col_map["grade_company"], None)
            if pd.notna(gc):
                grade_company = str(gc).strip()
        if "grade_value" in col_map:
            try:
                gv = row.get(col_map["grade_value"], None)
                if pd.notna(gv):
                    grade_value = float(gv)
            except (ValueError, TypeError):
                pass

        # Parse cost
        cost = None
        if "cost" in col_map:
            try:
                c = row.get(col_map["cost"], None)
                if pd.notna(c):
                    cost = float(str(c).replace("$", "").replace(",", ""))
            except (ValueError, TypeError):
                pass

        # Try to match to a checklist
        checklist_id = None
        match_status = "unmatched"

        if player or card_number:
            query = (
                select(Checklist)
                .options(
                    selectinload(Checklist.product_line).selectinload(ProductLine.brand)
                )
            )

            conditions = []

            if card_number:
                conditions.append(Checklist.card_number.ilike(card_number.strip()))

            if player:
                conditions.append(
                    or_(
                        Checklist.player_name_raw.ilike(f"%{player}%"),
                    )
                )

            if year:
                try:
                    year_int = int(float(year))
                    query = query.join(ProductLine, Checklist.product_line_id == ProductLine.id)
                    conditions.append(ProductLine.year == year_int)
                except (ValueError, TypeError):
                    pass

            if conditions:
                query = query.where(and_(*conditions))

            result = await db.execute(query.limit(5))
            matches = result.scalars().all()

            if len(matches) == 1:
                checklist_id = str(matches[0].id)
                match_status = "matched"
                matched += 1
            elif len(matches) > 1:
                # If we have product info, try to narrow down
                if product:
                    for m in matches:
                        pl_name = m.product_line.name.lower() if m.product_line else ""
                        brand_name = m.product_line.brand.name.lower() if m.product_line and m.product_line.brand else ""
                        if product.lower() in pl_name or product.lower() in brand_name:
                            checklist_id = str(m.id)
                            match_status = "matched"
                            matched += 1
                            break
                if not checklist_id:
                    checklist_id = str(matches[0].id)
                    match_status = "multiple"
                    matched += 1
            else:
                unmatched += 1

        else:
            unmatched += 1

        preview_rows.append(SpreadsheetPreviewRow(
            row_num=int(idx) + 1,
            player=player if player else None,
            year=year if year else None,
            product=product if product else None,
            card_number=card_number if card_number else None,
            parallel=parallel if parallel else None,
            quantity=qty,
            condition=condition,
            is_signed=is_signed,
            is_slabbed=is_slabbed,
            grade_company=grade_company,
            grade_value=grade_value,
            cost=cost,
            checklist_id=checklist_id,
            match_status=match_status,
        ))

    # Sample data (first 5 raw rows for debugging)
    sample = df.head(5).fillna("").to_dict(orient="records")

    return SpreadsheetPreviewResponse(
        total_rows=len(preview_rows),
        matched_rows=matched,
        unmatched_rows=unmatched,
        detected_columns=col_map,
        rows=preview_rows,
        sample_data=sample,
    )


@router.post("/inventory/upload/confirm", response_model=SpreadsheetConfirmResponse)
async def confirm_spreadsheet_upload(
    data: SpreadsheetConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm and execute the spreadsheet import.
    Creates/updates inventory for each confirmed item.
    """
    service = InventoryService(db)
    result = SpreadsheetConfirmResponse()

    for item in data.items:
        try:
            # Check if inventory exists for this exact combo
            existing = await db.execute(
                select(Inventory).where(
                    and_(
                        Inventory.checklist_id == item.checklist_id,
                        Inventory.is_signed == item.is_signed,
                        Inventory.is_slabbed == item.is_slabbed,
                        Inventory.raw_condition == item.raw_condition,
                        Inventory.grade_company == item.grade_company,
                        Inventory.grade_value == item.grade_value,
                    )
                )
            )
            inv = existing.scalar_one_or_none()

            if inv:
                inv.quantity += item.quantity
                if item.card_cost:
                    inv.card_cost += item.card_cost
                    inv.total_cost += item.card_cost
                result.updated += 1
            else:
                new_inv = Inventory(
                    checklist_id=item.checklist_id,
                    quantity=item.quantity,
                    raw_condition=item.raw_condition,
                    is_signed=item.is_signed,
                    is_slabbed=item.is_slabbed,
                    grade_company=item.grade_company,
                    grade_value=item.grade_value,
                    card_cost=item.card_cost or Dec("0"),
                    total_cost=item.card_cost or Dec("0"),
                    how_obtained="spreadsheet_import",
                )
                db.add(new_inv)
                result.created += 1

            await db.flush()
        except Exception as e:
            result.errors.append(f"Item {item.checklist_id}: {str(e)}")

    await db.commit()
    return result
