"""
Services Package - Barrel Exports
=================================

Business logic and service layer exports.
"""

# Core Services
from app.services.checklist_parser import ChecklistParser
from app.services.inventory_service import InventoryService

# Grading & Authentication Services
from app.services.card_grading_service import CardGradingService
from app.services.signature_auth_service import SignatureAuthService

# User Auth service functions (JWT, passwords)
from app.services.user_auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    decode_access_token,
    authenticate_user,
    get_user_by_id,
    get_user_by_email,
    create_user,
    update_user_password,
    get_user_count,
)

__all__ = [
    # Core Services
    "ChecklistParser",
    "InventoryService",
    # Grading & Authentication Services
    "CardGradingService",
    "SignatureAuthService",
    # User Auth functions
    "verify_password",
    "hash_password",
    "create_access_token",
    "decode_access_token",
    "authenticate_user",
    "get_user_by_id",
    "get_user_by_email",
    "create_user",
    "update_user_password",
    "get_user_count",
]