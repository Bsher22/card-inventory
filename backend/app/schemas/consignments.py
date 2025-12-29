# app/schemas/consignment.py
# Updated with address fields for consigners

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, computed_field

from .checklists import ChecklistResponse


# ============================================
# CONSIGNER SCHEMAS
# ============================================

class ConsignerBase(BaseModel):
    """Base schema for consigner data."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    
    # Address fields
    street_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field("USA", max_length=100)
    
    # Legacy location label
    location: Optional[str] = Field(None, max_length=200, description="Optional label like Home, Office")
    
    # Payment info
    default_fee: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    payment_details: Optional[str] = None
    
    is_active: bool = True
    notes: Optional[str] = None


class ConsignerCreate(ConsignerBase):
    """Schema for creating a new consigner."""
    pass


class ConsignerUpdate(BaseModel):
    """Schema for updating an existing consigner (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    
    # Address fields
    street_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    location: Optional[str] = Field(None, max_length=200)
    
    default_fee: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=100)
    payment_details: Optional[str] = None
    
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ConsignerResponse(ConsignerBase):
    """Schema for consigner response with computed fields."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    @computed_field
    @property
    def formatted_address(self) -> Optional[str]:
        """Returns a formatted mailing address string."""
        parts = []
        if self.street_address:
            parts.append(self.street_address)
        city_state_zip = []
        if self.city:
            city_state_zip.append(self.city)
        if self.state:
            city_state_zip.append(self.state)
        if city_state_zip:
            line2 = ", ".join(city_state_zip)
            if self.postal_code:
                line2 += f" {self.postal_code}"
            parts.append(line2)
        elif self.postal_code:
            parts.append(self.postal_code)
        if self.country and self.country != "USA":
            parts.append(self.country)
        return "\n".join(parts) if parts else None
    
    class Config:
        from_attributes = True


class ConsignerSummary(BaseModel):
    """Minimal consigner info for dropdowns and references."""
    id: UUID
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True


# ============================================
# CONSIGNMENT SCHEMAS
# ============================================

class ConsignmentBase(BaseModel):
    """Base schema for consignment data."""
    consigner_id: UUID
    reference_number: Optional[str] = Field(None, max_length=100)
    date_sent: date
    date_returned: Optional[date] = None
    expected_return_date: Optional[date] = None
    status: str = Field("pending", pattern="^(pending|shipped|with_signer|returned|completed|cancelled)$")
    total_fee: Decimal = Field(Decimal("0"), ge=0)
    fee_paid: bool = False
    fee_paid_date: Optional[date] = None
    shipping_out_cost: Decimal = Field(Decimal("0"), ge=0)
    shipping_out_tracking: Optional[str] = Field(None, max_length=100)
    shipping_return_cost: Decimal = Field(Decimal("0"), ge=0)
    shipping_return_tracking: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class ConsignmentCreate(ConsignmentBase):
    """Schema for creating a new consignment."""
    pass


class ConsignmentUpdate(BaseModel):
    """Schema for updating an existing consignment."""
    consigner_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    date_sent: Optional[date] = None
    date_returned: Optional[date] = None
    expected_return_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(pending|shipped|with_signer|returned|completed|cancelled)$")
    total_fee: Optional[Decimal] = Field(None, ge=0)
    fee_paid: Optional[bool] = None
    fee_paid_date: Optional[date] = None
    shipping_out_cost: Optional[Decimal] = Field(None, ge=0)
    shipping_out_tracking: Optional[str] = Field(None, max_length=100)
    shipping_return_cost: Optional[Decimal] = Field(None, ge=0)
    shipping_return_tracking: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class ConsignmentResponse(ConsignmentBase):
    """Schema for consignment response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    consigner: Optional[ConsignerSummary] = None
    
    class Config:
        from_attributes = True


# ============================================
# CONSIGNMENT ITEM SCHEMAS
# ============================================

class ConsignmentItemBase(BaseModel):
    """Base schema for consignment item data."""
    checklist_id: UUID
    source_inventory_id: Optional[UUID] = None
    target_inventory_id: Optional[UUID] = None
    quantity: int = Field(1, ge=1)
    fee_per_card: Decimal = Field(..., ge=0)
    status: str = Field("pending", pattern="^(pending|signed|rejected|lost)$")
    date_signed: Optional[date] = None
    inscription: Optional[str] = None
    condition_notes: Optional[str] = None
    notes: Optional[str] = None


class ConsignmentItemCreate(ConsignmentItemBase):
    """Schema for creating a consignment item."""
    pass


class ConsignmentItemUpdate(BaseModel):
    """Schema for updating a consignment item."""
    checklist_id: Optional[UUID] = None
    source_inventory_id: Optional[UUID] = None
    target_inventory_id: Optional[UUID] = None
    quantity: Optional[int] = Field(None, ge=1)
    fee_per_card: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(pending|signed|rejected|lost)$")
    date_signed: Optional[date] = None
    inscription: Optional[str] = None
    condition_notes: Optional[str] = None
    notes: Optional[str] = None


class ConsignmentItemResponse(ConsignmentItemBase):
    """Schema for consignment item response."""
    id: UUID
    consignment_id: UUID
    created_at: datetime
    updated_at: datetime
    checklist: Optional[ChecklistResponse] = None
    
    class Config:
        from_attributes = True


# ============================================
# CONSIGNER STATS SCHEMA
# ============================================

class ConsignerStats(BaseModel):
    """Statistics for a consigner."""
    total_consignments: int
    total_cards_sent: int
    cards_signed: int
    cards_refused: int
    cards_pending: int
    total_fees_paid: Decimal
    success_rate: float


# ============================================
# CONSIGNMENT RETURN SCHEMAS
# ============================================

class ConsignmentReturnItem(BaseModel):
    """Individual item result in a consignment return."""
    consignment_item_id: UUID
    status: str = Field(..., pattern="^(signed|rejected|lost)$")
    date_signed: Optional[date] = None
    inscription: Optional[str] = None
    condition_notes: Optional[str] = None


class ConsignmentReturn(BaseModel):
    """Schema for processing a consignment return."""
    date_returned: date
    items: list[ConsignmentReturnItem]


# ============================================
# PENDING CONSIGNMENTS VALUE SCHEMA
# ============================================

class PendingConsignmentsValue(BaseModel):
    """Value of pending consignments."""
    total_cards_out: int
    total_pending_fees: Decimal
    consignments_out: int