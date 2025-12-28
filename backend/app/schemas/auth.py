"""
Authentication Schemas

Pydantic models for authentication requests and responses.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================
# Token Schemas
# ============================================

class Token(BaseModel):
    """Response model for login - returns JWT token."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    user_id: Optional[UUID] = None
    email: Optional[str] = None


# ============================================
# Login Schema
# ============================================

class LoginRequest(BaseModel):
    """Request body for login."""
    email: EmailStr
    password: str = Field(..., min_length=6)


# ============================================
# User Schemas
# ============================================

class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """Request body for creating a user."""
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    is_admin: bool = False


class UserUpdate(BaseModel):
    """Request body for updating a user."""
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Response model for user data (no password)."""
    id: UUID
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """User model with hashed password (internal use)."""
    hashed_password: str


# ============================================
# Setup Schema (for initial user creation)
# ============================================

class SetupRequest(BaseModel):
    """Request body for initial setup - creates admin user."""
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_name: str = Field(..., min_length=1, max_length=100)
    setup_key: str = Field(..., description="Secret key to authorize setup")
