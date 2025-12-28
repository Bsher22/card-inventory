"""
Application Configuration

Loads settings from environment variables.
Integrates database, CORS, file upload, and authentication settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os
import json


class Settings(BaseSettings):
    # ============================================
    # Database - Railway provides DATABASE_URL automatically
    # ============================================
    database_url: Optional[str] = None
    database_url_sync: Optional[str] = None
    
    # ============================================
    # App
    # ============================================
    app_name: str = "IDGAS - Card Inventory Manager"
    debug: bool = False
    
    # ============================================
    # CORS - will be set via environment variable on Railway
    # ============================================
    cors_origins: str = '["http://localhost:3000", "http://localhost:5173"]'
    
    # ============================================
    # File Upload
    # ============================================
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    
    # ============================================
    # JWT Authentication
    # ============================================
    secret_key: str = "your-super-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days default
    
    # ============================================
    # Setup (for initial admin creation)
    # ============================================
    setup_key: str = "change-this-setup-key-in-production"
    
    class Config:
        env_file = ".env"
        extra = "ignore"
    
    def get_async_database_url(self) -> str:
        """Get async database URL, converting from Railway's format if needed."""
        url = self.database_url or os.getenv("DATABASE_URL", "")
        
        # Railway uses postgres://, SQLAlchemy needs postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        # Add asyncpg driver
        if url.startswith("postgresql://") and "asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        return url
    
    def get_sync_database_url(self) -> str:
        """Get sync database URL for migrations and scripts."""
        if self.database_url_sync:
            return self.database_url_sync
        
        url = self.database_url or os.getenv("DATABASE_URL", "")
        
        # Ensure postgresql:// format (not postgres://)
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        # Remove asyncpg if present
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        
        return url
    
    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from string."""
        try:
            return json.loads(self.cors_origins)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000", "http://localhost:5173"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
