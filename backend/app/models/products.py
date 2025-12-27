"""
Product Models: Brand and ProductLine
"""

from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .checklists import Checklist


class Brand(Base):
    """Card brands (Topps, Bowman, Panini, etc.)"""
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product_lines: Mapped[list["ProductLine"]] = relationship(back_populates="brand", cascade="all, delete-orphan")


class ProductLine(Base):
    """Product lines (2024 Bowman Chrome, 2024 Topps Series 1, etc.)"""
    __tablename__ = "product_lines"
    __table_args__ = (
        UniqueConstraint('brand_id', 'name', 'year', name='uq_product_line_brand_name_year'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    release_date: Mapped[Optional[date]] = mapped_column(Date)
    sport: Mapped[str] = mapped_column(String(50), default="Baseball")
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    brand: Mapped["Brand"] = relationship(back_populates="product_lines")
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="product_line", cascade="all, delete-orphan")
