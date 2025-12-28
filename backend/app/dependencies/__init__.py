"""
Dependencies Package - Barrel Exports
=====================================

FastAPI dependency injection utilities.
"""

from app.dependencies.auth import (
    oauth2_scheme,
    get_current_user,
    get_current_active_user,
    get_current_admin_user,
    CurrentUser,
    AdminUser,
)

__all__ = [
    "oauth2_scheme",
    "get_current_user",
    "get_current_active_user",
    "get_current_admin_user",
    "CurrentUser",
    "AdminUser",
]
