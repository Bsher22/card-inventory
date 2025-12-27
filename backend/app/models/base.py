"""
Base model class and common imports for all models.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import (
    String, Integer, Text, Boolean, Date, DateTime,
    Numeric, ForeignKey, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass
