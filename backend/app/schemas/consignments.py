"""
Consignment Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema
from .checklists import ChecklistResponse


# ============================================
# CONSIGNER SCHEMAS
# ============================================

class ConsignerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    default_fee_per_card: Decimal = Field(default=0, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    is_active: bool = True


class ConsignerCreate(ConsignerBase):
    pass


class ConsignerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    default_fee_per_card: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ConsignerResponse(BaseSchema):
    id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    default_fee_per_card: Decimal
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ConsignerStats(BaseModel):
    """Statistics for a consigner"""
    total_consignments: int = 0
    total_cards_sent: int = 0
    total_cards_returned: int = 0
    total_fees_paid: Decimal = Decimal("0")
    pending_cards: int = 0
    success_rate: float = 0.0


# ============================================
# CONSIGNMENT ITEM SCHEMAS
# ============================================

class ConsignmentItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    fee_per_card: Decimal = Field(default=0, ge=0)
    status: str = Field(default="pending", max_length=50)
    notes: Optional[str] = None


class ConsignmentItemCreate(ConsignmentItemBase):
    pass


class ConsignmentItemResponse(BaseSchema):
    id: UUID
    consignment_id: UUID
    checklist_id: UUID
    quantity: int
    fee_per_card: Decimal
    status: str
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


# ============================================
# CONSIGNMENT SCHEMAS
# ============================================

class ConsignmentBase(BaseModel):
    consigner_id: UUID
    date_sent: date
    notes: Optional[str] = None


class ConsignmentCreate(ConsignmentBase):
    items: List[ConsignmentItemBase]


class ConsignmentResponse(BaseSchema):
    id: UUID
    consigner_id: UUID
    date_sent: date
    date_returned: Optional[date] = None
    status: str
    total_cards: int
    total_fee: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    consigner: Optional[ConsignerResponse] = None
    items: Optional[List[ConsignmentItemResponse]] = None


class ConsignmentReturn(BaseModel):
    """Process a consignment return"""
    date_returned: date
    items: List[dict]  # {item_id: str, status: str, notes: Optional[str]}


class PendingConsignmentsValue(BaseModel):
    """Value of pending consignments"""
    total_pending_cards: int = 0
    total_pending_fees: Decimal = Decimal("0")
    consignments_count: int = 0
