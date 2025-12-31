"""
Submitter Schemas

Pydantic schemas for third-party submission services.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


# ============================================
# BASE SCHEMAS
# ============================================

class SubmitterBase(BaseModel):
    """Base submitter fields"""
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    offers_grading: bool = True
    offers_authentication: bool = True
    is_active: bool = True
    is_default: bool = False
    notes: Optional[str] = None


# ============================================
# CREATE/UPDATE SCHEMAS
# ============================================

class SubmitterCreate(SubmitterBase):
    """Schema for creating a new submitter"""
    pass


class SubmitterUpdate(BaseModel):
    """Schema for updating a submitter (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    offers_grading: Optional[bool] = None
    offers_authentication: Optional[bool] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None


# ============================================
# RESPONSE SCHEMAS
# ============================================

class SubmitterResponse(SubmitterBase):
    """Full submitter response with all fields"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SubmitterSummary(BaseModel):
    """Minimal submitter info for dropdowns"""
    id: UUID
    name: str
    code: Optional[str] = None
    offers_grading: bool
    offers_authentication: bool
    is_default: bool
    
    class Config:
        from_attributes = True


# ============================================
# STATS SCHEMA
# ============================================

class SubmitterStats(BaseModel):
    """Statistics for a submitter"""
    id: UUID
    name: str
    total_grading_submissions: int = 0
    total_auth_submissions: int = 0
    pending_grading: int = 0
    pending_auth: int = 0
    cards_graded: int = 0
    items_authenticated: int = 0