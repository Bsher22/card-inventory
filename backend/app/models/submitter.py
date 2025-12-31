"""
Submitter Model

Third-party grading/authentication submission services (PWCC, MySlabs, etc.).
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID

from sqlalchemy import String, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .grading import CardGradingSubmission, AuthSubmission


class Submitter(Base):
    """Third-party submission service for grading/authentication."""
    __tablename__ = "submitters"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(20))  # Short code like "PWCC"
    website: Mapped[Optional[str]] = mapped_column(String(255))
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Service capabilities
    offers_grading: Mapped[bool] = mapped_column(Boolean, default=True)
    offers_authentication: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    grading_submissions: Mapped[List["CardGradingSubmission"]] = relationship(
        back_populates="submitter",
        lazy="dynamic"
    )
    auth_submissions: Mapped[List["AuthSubmission"]] = relationship(
        back_populates="submitter",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Submitter {self.name}>"