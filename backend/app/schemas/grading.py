"""
Grading Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema
from .checklists import ChecklistResponse


# ============================================
# GRADING COMPANY SCHEMAS
# ============================================

class GradingCompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str = Field(..., min_length=1, max_length=20)
    website: Optional[str] = Field(None, max_length=200)
    is_active: bool = True


class GradingCompanyCreate(GradingCompanyBase):
    pass


class GradingCompanyResponse(BaseSchema):
    id: UUID
    name: str
    short_name: str
    website: Optional[str] = None
    is_active: bool


class GradingCompanyWithLevels(GradingCompanyResponse):
    """Grading company with service levels"""
    service_levels: List["GradingServiceLevelResponse"] = []


# ============================================
# GRADING SERVICE LEVEL SCHEMAS
# ============================================

class GradingServiceLevelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_per_card: Decimal = Field(..., ge=0)
    turnaround_days: Optional[int] = Field(None, ge=1)
    is_active: bool = True


class GradingServiceLevelCreate(GradingServiceLevelBase):
    company_id: UUID


class GradingServiceLevelResponse(BaseSchema):
    id: UUID
    company_id: UUID
    name: str
    price_per_card: Decimal
    turnaround_days: Optional[int] = None
    is_active: bool


# ============================================
# GRADING SUBMISSION ITEM SCHEMAS
# ============================================

class GradingSubmissionItemBase(BaseModel):
    checklist_id: UUID
    declared_value: Decimal = Field(default=0, ge=0)


class GradingSubmissionItemCreate(GradingSubmissionItemBase):
    pass


class GradingSubmissionItemResponse(BaseSchema):
    id: UUID
    submission_id: UUID
    checklist_id: UUID
    declared_value: Decimal
    grade_received: Optional[Decimal] = None
    auto_grade_received: Optional[Decimal] = None
    cert_number: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[ChecklistResponse] = None


class GradingSubmissionItemUpdate(BaseModel):
    """Update grade results for an item"""
    grade_received: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade_received: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = None
    notes: Optional[str] = None


# ============================================
# GRADING SUBMISSION SCHEMAS
# ============================================

class GradingSubmissionBase(BaseModel):
    company_id: UUID
    service_level_id: UUID
    submission_number: Optional[str] = Field(None, max_length=100)
    date_submitted: date
    notes: Optional[str] = None


class GradingSubmissionCreate(GradingSubmissionBase):
    items: List[GradingSubmissionItemBase]


class SubmissionCreate(GradingSubmissionCreate):
    """Alias for GradingSubmissionCreate"""
    pass


class GradingSubmissionResponse(BaseSchema):
    id: UUID
    company_id: UUID
    service_level_id: UUID
    submission_number: Optional[str] = None
    date_submitted: date
    date_returned: Optional[date] = None
    status: str
    total_cards: int
    total_fee: Decimal
    shipping_cost: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    company: Optional[GradingCompanyResponse] = None
    service_level: Optional[GradingServiceLevelResponse] = None
    items: Optional[List[GradingSubmissionItemResponse]] = None


class SubmissionGradeResults(BaseModel):
    """Process grading results for a submission"""
    date_returned: Optional[date] = None
    items: List[dict]  # {item_id: str, grade_received: Decimal, ...}


class GradingStats(BaseModel):
    """Grading statistics"""
    total_submissions: int = 0
    total_cards_submitted: int = 0
    total_cards_graded: int = 0
    total_fees: Decimal = Decimal("0")
    average_grade: Optional[Decimal] = None
    pending_cards: int = 0


class PendingByCompany(BaseModel):
    """Pending submissions by company"""
    company_id: UUID
    company_name: str
    pending_submissions: int
    pending_cards: int
    total_fees: Decimal


# Forward reference resolution
GradingCompanyWithLevels.model_rebuild()
