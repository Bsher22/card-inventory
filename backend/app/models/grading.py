"""
Grading Models: GradingCompany, GradingServiceLevel, GradingSubmission, GradingSubmissionItem
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Boolean, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .checklists import Checklist


class GradingCompany(Base):
    """Grading companies (PSA, BGS, SGC, etc.)"""
    __tablename__ = "grading_companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    short_name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    service_levels: Mapped[list["GradingServiceLevel"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class GradingServiceLevel(Base):
    """Service levels for grading companies"""
    __tablename__ = "grading_service_levels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    turnaround_days: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    company: Mapped["GradingCompany"] = relationship(back_populates="service_levels")
    submissions: Mapped[list["GradingSubmission"]] = relationship(back_populates="service_level")


class GradingSubmission(Base):
    """Grading submission batches"""
    __tablename__ = "grading_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_companies.id", ondelete="CASCADE"), nullable=False)
    service_level_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_service_levels.id"), nullable=False)
    submission_number: Mapped[Optional[str]] = mapped_column(String(100))
    date_submitted: Mapped[date] = mapped_column(Date, nullable=False)
    date_returned: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="submitted")  # submitted, grading, shipped, received
    total_cards: Mapped[int] = mapped_column(Integer, default=0)
    total_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company: Mapped["GradingCompany"] = relationship(back_populates="submissions")
    service_level: Mapped["GradingServiceLevel"] = relationship(back_populates="submissions")
    items: Mapped[list["GradingSubmissionItem"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class GradingSubmissionItem(Base):
    """Individual cards in a grading submission"""
    __tablename__ = "grading_submission_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("grading_submissions.id", ondelete="CASCADE"), nullable=False)
    checklist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklists.id"), nullable=False)
    declared_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    grade_received: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    auto_grade_received: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    submission: Mapped["GradingSubmission"] = relationship(back_populates="items")
    checklist: Mapped["Checklist"] = relationship()
