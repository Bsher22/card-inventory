"""
Base Schema Classes and Common Types
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common config for ORM mode"""
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper"""
    items: List
    total: int
    limit: int
    offset: int


class MessageResponse(BaseModel):
    """Simple message response"""
    message: str
    success: bool = True
