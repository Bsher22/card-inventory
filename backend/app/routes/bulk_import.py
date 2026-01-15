# app/routes/bulk_import.py
"""
Bulk Import Routes

Handles bulk inventory imports from Excel files.
"""

from typing import Any
import tempfile
import os

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.bulk_inventory_import import BulkInventoryImporter, preview_import


router = APIRouter(prefix="/bulk-import", tags=["Bulk Import"])


@router.post("/preview")
async def preview_bulk_import(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Preview an Excel import without making changes.
    Returns summary statistics and sample data.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File must be an Excel file (.xlsx or .xls)")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = await preview_import(tmp_path)
        return {
            "status": "preview",
            "data": result
        }
    finally:
        os.unlink(tmp_path)


@router.post("/execute")
async def execute_bulk_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Execute bulk import from Excel file.
    Creates all necessary records: brands, product lines, players, checklists, inventory, purchases.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "File must be an Excel file (.xlsx or .xls)")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        importer = BulkInventoryImporter(db)
        result = await importer.import_all(tmp_path)
        
        return {
            "status": "completed",
            "summary": {
                "total_rows": result.total_rows,
                "successful": result.successful,
                "failed": result.failed,
                "brands_created": result.brands_created,
                "product_lines_created": result.product_lines_created,
                "players_created": result.players_created,
                "checklists_created": result.checklists_created,
                "inventory_created": result.inventory_created,
                "purchases_created": result.purchases_created,
                "purchase_items_created": result.purchase_items_created
            },
            "errors": result.errors[:50] if result.errors else []  # Limit error list
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Import failed: {str(e)}")
    finally:
        os.unlink(tmp_path)


@router.get("/type-mappings")
async def get_type_mappings(
    current_user = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Get the current card type mappings used for import.
    Useful for understanding how Excel "Type" values map to base_type and parallel.
    """
    from app.services.bulk_inventory_import import TYPE_MAPPING
    
    mappings = []
    for excel_type, (base_type, parallel, is_auto) in TYPE_MAPPING.items():
        mappings.append({
            "excel_type": excel_type,
            "base_type": base_type,
            "parallel": parallel,
            "is_autograph": is_auto
        })
    
    return {
        "mappings": sorted(mappings, key=lambda x: x["excel_type"].lower())
    }
