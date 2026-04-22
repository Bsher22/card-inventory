"""
Pydantic schemas for eBay Consignments.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# CONSIGNER
# ============================================================

class EbayConsignerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "USA"
    default_fee_percent: Optional[Decimal] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None


class EbayConsignerCreate(EbayConsignerBase):
    pass


class EbayConsignerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    default_fee_percent: Optional[Decimal] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class EbayConsignerResponse(EbayConsignerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EbayConsignerStats(BaseModel):
    consigner_id: UUID
    total_agreements: int
    active_agreements: int
    items_listed: int
    items_sold: int
    items_pending: int
    lifetime_gross: Decimal
    lifetime_idgas_fees: Decimal
    lifetime_payout: Decimal
    unpaid_balance: Decimal


# ============================================================
# ITEMS
# ============================================================

class EbayConsignmentItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    minimum_price: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class EbayConsignmentItemCreate(EbayConsignmentItemBase):
    pass


class EbayConsignmentItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    minimum_price: Optional[Decimal] = None
    status: Optional[str] = None
    ebay_listing_id: Optional[str] = None
    listed_at: Optional[datetime] = None
    notes: Optional[str] = None


class EbayItemSaleInput(BaseModel):
    """Record a sale for an item."""
    sold_price: Decimal = Field(..., ge=0)
    sold_at: Optional[datetime] = None
    ebay_fees: Decimal = Decimal("0")
    payment_fees: Decimal = Decimal("0")
    shipping_cost: Decimal = Decimal("0")
    buyer_info: Optional[str] = None
    notes: Optional[str] = None


class EbayConsignmentItemResponse(EbayConsignmentItemBase):
    id: UUID
    agreement_id: UUID
    status: str
    ebay_listing_id: Optional[str] = None
    listed_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    sold_price: Optional[Decimal] = None
    ebay_fees: Decimal
    payment_fees: Decimal
    shipping_cost: Decimal
    buyer_info: Optional[str] = None
    payout_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# AGREEMENTS
# ============================================================

class EbayConsignmentAgreementBase(BaseModel):
    consigner_id: UUID
    agreement_date: date
    fee_percent: Decimal = Field(..., ge=0, le=100)
    notes: Optional[str] = None


class EbayConsignmentAgreementCreate(EbayConsignmentAgreementBase):
    items: list[EbayConsignmentItemCreate] = Field(default_factory=list)


class EbayConsignmentAgreementUpdate(BaseModel):
    agreement_date: Optional[date] = None
    fee_percent: Optional[Decimal] = None
    status: Optional[str] = None
    client_signature_name: Optional[str] = None
    client_signed_at: Optional[datetime] = None
    idgas_signature_name: Optional[str] = None
    idgas_signed_at: Optional[datetime] = None
    notes: Optional[str] = None


class EbayConsignmentAgreementResponse(EbayConsignmentAgreementBase):
    id: UUID
    agreement_number: Optional[str] = None
    status: str
    client_signature_name: Optional[str] = None
    client_signed_at: Optional[datetime] = None
    idgas_signature_name: Optional[str] = None
    idgas_signed_at: Optional[datetime] = None
    pdf_path: Optional[str] = None
    docusign_envelope_id: Optional[str] = None
    docusign_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: list[EbayConsignmentItemResponse] = Field(default_factory=list)
    # Optional denormalised consigner info when fetched with join
    consigner_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PAYOUTS
# ============================================================

class EbayPayoutGenerateRequest(BaseModel):
    consigner_id: UUID
    period_year: int = Field(..., ge=2000, le=2100)
    period_month: int = Field(..., ge=1, le=12)
    notes: Optional[str] = None


class EbayPayoutMarkPaid(BaseModel):
    paid_at: Optional[datetime] = None
    paid_method: Optional[str] = None
    paid_reference: Optional[str] = None


class EbayPayoutResponse(BaseModel):
    id: UUID
    consigner_id: UUID
    period_year: int
    period_month: int
    total_gross: Decimal
    total_idgas_fee: Decimal
    total_ebay_fees: Decimal
    total_other_fees: Decimal
    net_payout: Decimal
    item_count: int
    is_paid: bool
    paid_at: Optional[datetime] = None
    paid_method: Optional[str] = None
    paid_reference: Optional[str] = None
    statement_pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    consigner_name: Optional[str] = None
    items: list[EbayConsignmentItemResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class EbayPayoutPreview(BaseModel):
    """What a payout WOULD look like without saving it."""
    consigner_id: UUID
    period_year: int
    period_month: int
    total_gross: Decimal
    total_idgas_fee: Decimal
    total_ebay_fees: Decimal
    total_other_fees: Decimal
    net_payout: Decimal
    item_count: int
    items: list[EbayConsignmentItemResponse] = Field(default_factory=list)
