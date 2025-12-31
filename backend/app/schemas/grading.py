"""
Grading & Authentication Schemas

Pydantic models for API request/response handling.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# GRADING COMPANY SCHEMAS
# ============================================

class ServiceLevelResponse(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    max_value: Optional[Decimal] = None
    base_fee: Decimal
    estimated_days: Optional[int] = None
    is_active: bool
    
    class Config:
        from_attributes = True


class GradingCompanyResponse(BaseModel):
    id: UUID
    name: str
    code: str
    website: Optional[str] = None
    service_type: str  # grading, authentication, both
    is_active: bool
    
    class Config:
        from_attributes = True


class GradingCompanyWithLevels(GradingCompanyResponse):
    service_levels: List[ServiceLevelResponse] = []


# ============================================
# CARD GRADING SCHEMAS
# ============================================

class CardGradingItemCreate(BaseModel):
    """Create a grading item from inventory."""
    inventory_id: UUID
    checklist_id: Optional[UUID] = None
    declared_value: Decimal = Decimal("0")
    fee_per_card: Optional[Decimal] = None
    was_signed: bool = False


class CardGradingItemResponse(BaseModel):
    id: UUID
    inventory_id: Optional[UUID] = None
    checklist_id: Optional[UUID] = None
    line_number: Optional[int] = None
    declared_value: Decimal
    fee_per_card: Optional[Decimal] = None
    was_signed: bool
    status: str
    grade_value: Optional[Decimal] = None
    auto_grade: Optional[Decimal] = None
    cert_number: Optional[str] = None
    label_type: Optional[str] = None
    notes: Optional[str] = None
    
    # Nested details
    player_name: Optional[str] = None
    card_number: Optional[str] = None
    product_line_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class CardGradingSubmissionCreate(BaseModel):
    """Create a new grading submission."""
    company_id: UUID
    service_level_id: Optional[UUID] = None
    submitter_id: Optional[UUID] = None  # Third-party submitter (NULL = direct)
    date_submitted: date
    items: List[CardGradingItemCreate]
    submission_number: Optional[str] = None
    reference_number: Optional[str] = None
    shipping_to_cost: Decimal = Decimal("0")
    shipping_to_tracking: Optional[str] = None
    insurance_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class CardGradingSubmissionResponse(BaseModel):
    id: UUID
    company_id: UUID
    service_level_id: Optional[UUID] = None
    submitter_id: Optional[UUID] = None
    submission_number: Optional[str] = None
    reference_number: Optional[str] = None
    date_submitted: date
    date_shipped: Optional[date] = None
    date_received: Optional[date] = None
    date_graded: Optional[date] = None
    date_shipped_back: Optional[date] = None
    date_returned: Optional[date] = None
    status: str
    grading_fee: Decimal
    shipping_to_cost: Decimal
    shipping_to_tracking: Optional[str] = None
    shipping_return_cost: Decimal
    shipping_return_tracking: Optional[str] = None
    insurance_cost: Decimal
    total_cards: int
    cards_graded: int
    total_declared_value: Decimal
    notes: Optional[str] = None
    items: List[CardGradingItemResponse] = []
    
    # Nested company info
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    service_level_name: Optional[str] = None
    submitter_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class CardGradingStatusUpdate(BaseModel):
    """Update submission status/tracking."""
    status: str  # shipped, received, grading, shipped_back, returned
    date_shipped: Optional[date] = None
    date_received: Optional[date] = None
    date_graded: Optional[date] = None
    date_shipped_back: Optional[date] = None
    date_returned: Optional[date] = None
    shipping_to_tracking: Optional[str] = None
    shipping_return_tracking: Optional[str] = None


class CardGradeResult(BaseModel):
    """Result for a single graded card."""
    item_id: UUID
    status: str  # graded, authentic, altered, counterfeit, ungradeable, lost
    grade_value: Optional[Decimal] = None
    auto_grade: Optional[Decimal] = None
    cert_number: Optional[str] = None
    label_type: Optional[str] = None
    notes: Optional[str] = None


class CardGradingResultsSubmit(BaseModel):
    """Submit grading results for items."""
    item_results: List[CardGradeResult]
    date_returned: Optional[date] = None
    shipping_return_cost: Decimal = Decimal("0")


class CardGradingStats(BaseModel):
    """Statistics for card grading."""
    pending_submissions: int
    cards_out_for_grading: int
    pending_fees: Decimal
    total_graded: int
    grade_distribution: Dict[str, int]  # {"10": 5, "9.5": 10, ...}
    gem_rate: float  # Percentage of 10s
    avg_grade: Optional[float] = None
    by_company: Dict[str, int]  # {"PSA": 100, "BGS": 50}


class PendingByCompany(BaseModel):
    """Pending grading items grouped by company."""
    company_id: UUID
    company_name: str
    company_code: str
    pending_count: int
    pending_value: Decimal
    oldest_submission_date: Optional[date] = None


# ============================================
# AUTHENTICATION SCHEMAS
# ============================================

class AuthItemCreate(BaseModel):
    """Create an auth item."""
    item_type: str  # card, memorabilia, collectible
    inventory_id: Optional[UUID] = None  # For cards
    standalone_item_id: Optional[UUID] = None  # For memorabilia/collectibles
    description: Optional[str] = None
    signer_name: Optional[str] = None
    declared_value: Decimal = Decimal("0")
    fee_per_item: Optional[Decimal] = None


class AuthItemResponse(BaseModel):
    id: UUID
    item_type: str
    inventory_id: Optional[UUID] = None
    standalone_item_id: Optional[UUID] = None
    line_number: Optional[int] = None
    description: Optional[str] = None
    signer_name: Optional[str] = None
    declared_value: Decimal
    fee_per_item: Optional[Decimal] = None
    status: str
    cert_number: Optional[str] = None
    sticker_number: Optional[str] = None
    letter_number: Optional[str] = None
    notes: Optional[str] = None
    
    # Nested details for cards
    player_name: Optional[str] = None
    card_number: Optional[str] = None
    product_line_name: Optional[str] = None
    
    # Nested details for standalone items
    item_name: Optional[str] = None
    item_category: Optional[str] = None
    
    class Config:
        from_attributes = True


class AuthSubmissionCreate(BaseModel):
    """Create a new auth submission."""
    company_id: UUID
    service_level_id: Optional[UUID] = None
    submitter_id: Optional[UUID] = None  # Third-party submitter (NULL = direct)
    date_submitted: date
    items: List[AuthItemCreate]
    submission_number: Optional[str] = None
    reference_number: Optional[str] = None
    shipping_to_cost: Decimal = Decimal("0")
    shipping_to_tracking: Optional[str] = None
    insurance_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class AuthSubmissionResponse(BaseModel):
    id: UUID
    company_id: UUID
    service_level_id: Optional[UUID] = None
    submitter_id: Optional[UUID] = None
    submission_number: Optional[str] = None
    reference_number: Optional[str] = None
    date_submitted: date
    date_shipped: Optional[date] = None
    date_received: Optional[date] = None
    date_completed: Optional[date] = None
    date_shipped_back: Optional[date] = None
    date_returned: Optional[date] = None
    status: str
    authentication_fee: Decimal
    shipping_to_cost: Decimal
    shipping_to_tracking: Optional[str] = None
    shipping_return_cost: Decimal
    shipping_return_tracking: Optional[str] = None
    insurance_cost: Decimal
    total_items: int
    items_authenticated: int
    total_declared_value: Decimal
    notes: Optional[str] = None
    items: List[AuthItemResponse] = []
    
    # Nested company info
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    service_level_name: Optional[str] = None
    submitter_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class AuthStatusUpdate(BaseModel):
    """Update auth submission status."""
    status: str  # shipped, received, processing, shipped_back, returned
    date_shipped: Optional[date] = None
    date_received: Optional[date] = None
    date_completed: Optional[date] = None
    date_shipped_back: Optional[date] = None
    date_returned: Optional[date] = None
    shipping_to_tracking: Optional[str] = None
    shipping_return_tracking: Optional[str] = None


class AuthResult(BaseModel):
    """Result for a single authenticated item."""
    item_id: UUID
    status: str  # authentic, not_authentic, inconclusive, lost
    cert_number: Optional[str] = None
    sticker_number: Optional[str] = None
    letter_number: Optional[str] = None
    notes: Optional[str] = None


class AuthResultsSubmit(BaseModel):
    """Submit authentication results."""
    item_results: List[AuthResult]
    date_returned: Optional[date] = None
    shipping_return_cost: Decimal = Decimal("0")


class AuthStats(BaseModel):
    """Statistics for authentication."""
    pending_submissions: int
    items_out_for_auth: int
    pending_fees: Decimal
    total_authenticated: int
    pass_rate: float  # Percentage authenticated
    by_item_type: Dict[str, int]  # {"card": 50, "memorabilia": 20, "collectible": 10}
    by_company: Dict[str, int]  # {"PSA-DNA": 40, "JSA": 40}


class AuthPendingByCompany(BaseModel):
    """Pending auth items grouped by company."""
    company_id: UUID
    company_name: str
    company_code: str
    pending_count: int
    pending_value: Decimal
    oldest_submission_date: Optional[date] = None