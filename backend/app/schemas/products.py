"""
Product Schemas: Brand and ProductLine
"""

from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseSchema


# ============================================
# BRAND SCHEMAS
# ============================================

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)


class BrandResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime


class BrandWithProducts(BrandResponse):
    """Brand with nested product lines"""
    product_lines: List["ProductLineResponse"] = []


# ============================================
# PRODUCT LINE SCHEMAS
# ============================================

class ProductLineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    year: int = Field(..., ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: str = Field(default="Baseball", max_length=50)
    description: Optional[str] = None


class ProductLineCreate(ProductLineBase):
    brand_id: UUID


class ProductLineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    release_date: Optional[date] = None
    sport: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None


class ProductLineResponse(BaseSchema):
    id: UUID
    brand_id: UUID
    name: str
    year: int
    release_date: Optional[date] = None
    sport: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    brand: Optional[BrandResponse] = None
    checklist_count: Optional[int] = None


class ProductLineWithBrand(ProductLineResponse):
    """Product line with nested brand"""
    brand: BrandResponse


class ProductLineSummary(BaseSchema):
    """Summary statistics for product lines"""
    id: UUID
    brand_name: str
    name: str
    year: int
    checklist_count: int = 0
    inventory_count: int = 0
    completion_pct: float = 0.0


# Forward reference resolution
BrandWithProducts.model_rebuild()
