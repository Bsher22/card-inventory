"""
Services Package - Barrel Exports
=================================

Business logic and service layer exports.
"""

from app.services.checklist_parser import ChecklistParser
from app.services.inventory_service import InventoryService

# Auth service functions
from app.services.auth_service import (
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
    # Existing services
    "ChecklistParser",
    "InventoryService",
    # Auth service functions
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
