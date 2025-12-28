"""
Authentication Routes

Handles login, user info, and user management.
"""

from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies.auth import CurrentUser, AdminUser
from app.models import User
from app.schemas import (
    Token,
    LoginRequest,
    UserCreate,
    UserUpdate,
    UserResponse,
    SetupRequest,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_user_by_email,
    get_user_count,
    hash_password,
)


settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================
# Login Endpoints
# ============================================

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Login with email and password.
    
    Uses OAuth2 form data (username field contains email).
    Returns JWT access token.
    """
    user = await authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login/json", response_model=Token)
async def login_json(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Login with JSON body (alternative to form data).
    
    Useful for frontend applications.
    """
    user = await authenticate_user(db, login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return Token(access_token=access_token, token_type="bearer")


# ============================================
# Current User Endpoints
# ============================================

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """Get the current authenticated user's info."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Update the current user's profile."""
    if update_data.email and update_data.email != current_user.email:
        # Check if email is already taken
        existing = await get_user_by_email(db, update_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = update_data.email
    
    if update_data.name:
        current_user.name = update_data.name
    
    if update_data.password:
        current_user.hashed_password = hash_password(update_data.password)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


# ============================================
# Admin: User Management
# ============================================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """List all users (admin only)."""
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return users


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    user_data: UserCreate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Create a new user (admin only)."""
    # Check if email already exists
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = await create_user(
        db,
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        is_admin=user_data.is_admin
    )
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Update a user (admin only)."""
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if update_data.email and update_data.email != user.email:
        existing = await get_user_by_email(db, update_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = update_data.email
    
    if update_data.name:
        user.name = update_data.name
    
    if update_data.password:
        user.hashed_password = hash_password(update_data.password)
    
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Delete a user (admin only). Cannot delete yourself."""
    if str(admin.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()


# ============================================
# Setup Endpoint (First-time setup)
# ============================================

@router.post("/setup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def initial_setup(
    setup_data: SetupRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Initial setup - creates the first admin user.
    
    Only works if no users exist in the database.
    Requires setup_key to match SETUP_KEY environment variable.
    """
    # Verify setup key
    if setup_data.setup_key != settings.setup_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid setup key"
        )
    
    # Check if any users exist
    user_count = await get_user_count(db)
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup already completed. Users already exist."
        )
    
    # Create admin user
    admin = await create_user(
        db,
        email=setup_data.admin_email,
        password=setup_data.admin_password,
        name=setup_data.admin_name,
        is_admin=True
    )
    
    return admin
