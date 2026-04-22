"""
eBay Consignments API Routes

Endpoints for:
    /api/ebay-consigners
    /api/ebay-consignment-agreements
    /api/ebay-consignment-agreements/{id}/items
    /api/ebay-consignment-items
    /api/ebay-consignment-payouts
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.ebay_consignments import (
    EbayConsignerCreate,
    EbayConsignerResponse,
    EbayConsignerStats,
    EbayConsignerUpdate,
    EbayConsignmentAgreementCreate,
    EbayConsignmentAgreementResponse,
    EbayConsignmentAgreementUpdate,
    EbayConsignmentItemCreate,
    EbayConsignmentItemResponse,
    EbayConsignmentItemUpdate,
    EbayItemSaleInput,
    EbayPayoutGenerateRequest,
    EbayPayoutMarkPaid,
    EbayPayoutPreview,
    EbayPayoutResponse,
)
from app.services.ebay_consignment_pdf import (
    build_agreement_pdf, build_payout_statement_pdf,
)
from app.services.ebay_consignment_service import EbayConsignmentService


router = APIRouter()


# ==============================================================
# CONSIGNERS
# ==============================================================

@router.get("/ebay-consigners", response_model=list[EbayConsignerResponse])
async def list_ebay_consigners(
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    return await svc.list_consigners(active_only=active_only, skip=skip, limit=limit)


@router.get("/ebay-consigners/{consigner_id}", response_model=EbayConsignerResponse)
async def get_ebay_consigner(consigner_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    consigner = await svc.get_consigner(consigner_id)
    if not consigner:
        raise HTTPException(404, "Consigner not found")
    return consigner


@router.get("/ebay-consigners/{consigner_id}/stats", response_model=EbayConsignerStats)
async def get_ebay_consigner_stats(consigner_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    if not await svc.get_consigner(consigner_id):
        raise HTTPException(404, "Consigner not found")
    return await svc.get_consigner_stats(consigner_id)


@router.post("/ebay-consigners", response_model=EbayConsignerResponse, status_code=201)
async def create_ebay_consigner(data: EbayConsignerCreate, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    return await svc.create_consigner(**data.model_dump())


@router.patch("/ebay-consigners/{consigner_id}", response_model=EbayConsignerResponse)
async def update_ebay_consigner(
    consigner_id: UUID,
    data: EbayConsignerUpdate,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    consigner = await svc.update_consigner(consigner_id, **data.model_dump(exclude_unset=True))
    if not consigner:
        raise HTTPException(404, "Consigner not found")
    return consigner


# ==============================================================
# AGREEMENTS
# ==============================================================

@router.get("/ebay-consignment-agreements", response_model=list[EbayConsignmentAgreementResponse])
async def list_ebay_agreements(
    consigner_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    rows = await svc.list_agreements(consigner_id=consigner_id, status=status, skip=skip, limit=limit)
    return rows


@router.get("/ebay-consignment-agreements/{agreement_id}", response_model=EbayConsignmentAgreementResponse)
async def get_ebay_agreement(agreement_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    agr = await svc.get_agreement(agreement_id)
    if not agr:
        raise HTTPException(404, "Agreement not found")
    resp = EbayConsignmentAgreementResponse.model_validate(agr)
    if agr.consigner:
        resp.consigner_name = agr.consigner.name
    return resp


@router.post("/ebay-consignment-agreements", response_model=EbayConsignmentAgreementResponse, status_code=201)
async def create_ebay_agreement(
    data: EbayConsignmentAgreementCreate,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    if not await svc.get_consigner(data.consigner_id):
        raise HTTPException(400, "Unknown consigner")
    items = [it.model_dump() for it in (data.items or [])]
    agr = await svc.create_agreement(
        consigner_id=data.consigner_id,
        agreement_date=data.agreement_date,
        fee_percent=data.fee_percent,
        items=items,
        notes=data.notes,
    )
    return agr


@router.patch("/ebay-consignment-agreements/{agreement_id}", response_model=EbayConsignmentAgreementResponse)
async def update_ebay_agreement(
    agreement_id: UUID,
    data: EbayConsignmentAgreementUpdate,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    agr = await svc.update_agreement(agreement_id, **data.model_dump(exclude_unset=True))
    if not agr:
        raise HTTPException(404, "Agreement not found")
    return agr


@router.delete("/ebay-consignment-agreements/{agreement_id}", status_code=204)
async def delete_ebay_agreement(agreement_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    if not await svc.delete_agreement(agreement_id):
        raise HTTPException(404, "Agreement not found")
    return None


class _SignBody(BaseModel):
    party: str   # "client" | "idgas"
    signature_name: str


@router.post("/ebay-consignment-agreements/{agreement_id}/sign",
             response_model=EbayConsignmentAgreementResponse)
async def sign_ebay_agreement(
    agreement_id: UUID, body: _SignBody, db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    try:
        agr = await svc.sign_agreement(
            agreement_id, party=body.party, signature_name=body.signature_name,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not agr:
        raise HTTPException(404, "Agreement not found")
    return agr


@router.get("/ebay-consignment-agreements/{agreement_id}/agreement.pdf")
async def download_agreement_pdf(agreement_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    agr = await svc.get_agreement(agreement_id)
    if not agr:
        raise HTTPException(404, "Agreement not found")
    pdf_bytes = build_agreement_pdf(agr, agr.consigner)
    filename = f"consignment-agreement-{agr.agreement_number or agr.id}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==============================================================
# ITEMS (nested under agreement)
# ==============================================================

@router.post("/ebay-consignment-agreements/{agreement_id}/items",
             response_model=EbayConsignmentItemResponse, status_code=201)
async def add_ebay_item(
    agreement_id: UUID,
    data: EbayConsignmentItemCreate,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    if not await svc.get_agreement(agreement_id):
        raise HTTPException(404, "Agreement not found")
    return await svc.add_item(agreement_id, **data.model_dump())


@router.patch("/ebay-consignment-items/{item_id}", response_model=EbayConsignmentItemResponse)
async def update_ebay_item(
    item_id: UUID,
    data: EbayConsignmentItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    item = await svc.update_item(item_id, **data.model_dump(exclude_unset=True))
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.delete("/ebay-consignment-items/{item_id}", status_code=204)
async def delete_ebay_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    try:
        ok = await svc.delete_item(item_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not ok:
        raise HTTPException(404, "Item not found")
    return None


@router.post("/ebay-consignment-items/{item_id}/sale", response_model=EbayConsignmentItemResponse)
async def record_ebay_item_sale(
    item_id: UUID,
    data: EbayItemSaleInput,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    try:
        item = await svc.record_sale(item_id, **data.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not item:
        raise HTTPException(404, "Item not found")
    return item


# ==============================================================
# PAYOUTS
# ==============================================================

@router.get("/ebay-consignment-payouts", response_model=list[EbayPayoutResponse])
async def list_ebay_payouts(
    consigner_id: Optional[UUID] = Query(None),
    year: Optional[int] = Query(None),
    is_paid: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    rows = await svc.list_payouts(consigner_id=consigner_id, year=year, is_paid=is_paid,
                                  skip=skip, limit=limit)
    out = []
    for p in rows:
        resp = EbayPayoutResponse.model_validate(p)
        if p.consigner:
            resp.consigner_name = p.consigner.name
        out.append(resp)
    return out


@router.get("/ebay-consignment-payouts/preview", response_model=EbayPayoutPreview)
async def preview_ebay_payout(
    consigner_id: UUID = Query(...),
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    if not await svc.get_consigner(consigner_id):
        raise HTTPException(404, "Consigner not found")
    return await svc.preview_payout(consigner_id, year, month)


@router.post("/ebay-consignment-payouts", response_model=EbayPayoutResponse, status_code=201)
async def generate_ebay_payout(
    data: EbayPayoutGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    if not await svc.get_consigner(data.consigner_id):
        raise HTTPException(404, "Consigner not found")
    try:
        payout = await svc.generate_payout(data.consigner_id, data.period_year,
                                           data.period_month, notes=data.notes)
    except ValueError as e:
        raise HTTPException(400, str(e))
    full = await svc.get_payout(payout.id)
    resp = EbayPayoutResponse.model_validate(full)
    if full and full.consigner:
        resp.consigner_name = full.consigner.name
    return resp


@router.get("/ebay-consignment-payouts/{payout_id}", response_model=EbayPayoutResponse)
async def get_ebay_payout(payout_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    p = await svc.get_payout(payout_id)
    if not p:
        raise HTTPException(404, "Payout not found")
    resp = EbayPayoutResponse.model_validate(p)
    if p.consigner:
        resp.consigner_name = p.consigner.name
    return resp


@router.post("/ebay-consignment-payouts/{payout_id}/mark-paid", response_model=EbayPayoutResponse)
async def mark_ebay_payout_paid(
    payout_id: UUID,
    data: EbayPayoutMarkPaid,
    db: AsyncSession = Depends(get_db),
):
    svc = EbayConsignmentService(db)
    p = await svc.mark_payout_paid(payout_id, **data.model_dump(exclude_unset=True))
    if not p:
        raise HTTPException(404, "Payout not found")
    resp = EbayPayoutResponse.model_validate(p)
    if p.consigner:
        resp.consigner_name = p.consigner.name
    return resp


@router.delete("/ebay-consignment-payouts/{payout_id}", status_code=204)
async def delete_ebay_payout(payout_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    try:
        ok = await svc.delete_payout(payout_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not ok:
        raise HTTPException(404, "Payout not found")
    return None


@router.get("/ebay-consignment-payouts/{payout_id}/statement.pdf")
async def download_payout_statement_pdf(payout_id: UUID, db: AsyncSession = Depends(get_db)):
    svc = EbayConsignmentService(db)
    payout = await svc.get_payout(payout_id)
    if not payout:
        raise HTTPException(404, "Payout not found")
    pdf_bytes = build_payout_statement_pdf(payout, payout.consigner, payout.items)
    filename = f"statement-{payout.consigner.name.replace(' ', '_')}-{payout.period_year}-{payout.period_month:02d}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
