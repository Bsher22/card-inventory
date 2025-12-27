"""
Financial Schemas: Purchase, Sale, Analytics
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema
from .checklists import ChecklistResponse


# ============================================
# PURCHASE ITEM SCHEMAS
# ============================================

class PurchaseItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(default=0, ge=0)
    condition: str = Field(default="NM", max_length=20)
    notes: Optional[str] = None


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemResponse(BaseSchema):
    id: UUID
    purchase_id: UUID
    checklist_id: UUID
    quantity: int
    unit_price: Decimal
    condition: str
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


# ============================================
# PURCHASE SCHEMAS
# ============================================

class PurchaseBase(BaseModel):
    purchase_date: date
    vendor: Optional[str] = Field(None, max_length=200)
    platform: Optional[str] = Field(None, max_length=100)
    order_number: Optional[str] = Field(None, max_length=100)
    shipping: Decimal = Field(default=0, ge=0)
    tax: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemBase]


class PurchaseResponse(BaseSchema):
    id: UUID
    purchase_date: date
    vendor: Optional[str] = None
    platform: Optional[str] = None
    order_number: Optional[str] = None
    subtotal: Decimal
    shipping: Decimal
    tax: Decimal
    total: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: Optional[List[PurchaseItemResponse]] = None


# ============================================
# SALE ITEM SCHEMAS
# ============================================

class SaleItemBase(BaseModel):
    checklist_id: UUID
    quantity: int = Field(default=1, ge=1)
    sale_price: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class SaleItemCreate(SaleItemBase):
    pass


class SaleItemResponse(BaseSchema):
    id: UUID
    sale_id: UUID
    checklist_id: UUID
    quantity: int
    sale_price: Decimal
    cost_basis: Decimal
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


# ============================================
# SALE SCHEMAS
# ============================================

class SaleBase(BaseModel):
    sale_date: date
    platform: str = Field(..., min_length=1, max_length=100)
    buyer_name: Optional[str] = Field(None, max_length=200)
    order_number: Optional[str] = Field(None, max_length=100)
    platform_fees: Decimal = Field(default=0, ge=0)
    payment_fees: Decimal = Field(default=0, ge=0)
    shipping_collected: Decimal = Field(default=0, ge=0)
    shipping_cost: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    items: List[SaleItemBase]


class SaleResponse(BaseSchema):
    id: UUID
    sale_date: date
    platform: str
    buyer_name: Optional[str] = None
    order_number: Optional[str] = None
    gross_amount: Decimal
    platform_fees: Decimal
    payment_fees: Decimal
    shipping_collected: Decimal
    shipping_cost: Decimal
    net_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: Optional[List[SaleItemResponse]] = None


# ============================================
# ANALYTICS SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    """Dashboard overview statistics"""
    total_cards: int
    total_cost_basis: Decimal
    total_revenue: Decimal
    total_profit: Decimal
    unique_players: int
    unique_products: int
    autograph_count: int
    first_bowman_count: int
    rookie_count: int
    graded_count: int


class SalesAnalytics(BaseModel):
    """Sales analytics summary"""
    total_sales: int
    total_revenue: Decimal
    total_profit: Decimal
    avg_sale_price: Decimal
    sales_by_platform: Dict[str, Decimal]
    sales_by_month: Dict[str, Decimal]


class PurchaseAnalytics(BaseModel):
    """Purchase analytics summary"""
    total_purchases: int
    total_spent: Decimal
    avg_purchase_price: Decimal
    purchases_by_vendor: Dict[str, Decimal]
    purchases_by_month: Dict[str, Decimal]


class PlayerSummary(BaseModel):
    """Player-level analytics"""
    player_id: UUID
    player_name: str
    team: Optional[str] = None
    total_cards: int
    unique_cards: int
    autograph_count: int
    rookie_count: int
    first_bowman_count: int
    graded_count: int
    total_value: Decimal
