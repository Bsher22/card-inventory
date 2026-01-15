"""
Player Models
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .consigner_player_price import ConsignerPlayerPrice
    from .checklists import Checklist


class Player(Base):
    """Players - normalized for analytics and matching"""
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_normalized: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    team: Mapped[Optional[str]] = mapped_column(String(100))
    position: Mapped[Optional[str]] = mapped_column(String(50))
    debut_year: Mapped[Optional[int]] = mapped_column(Integer)
    is_rookie: Mapped[bool] = mapped_column(Boolean, default=False)
    is_prospect: Mapped[bool] = mapped_column(Boolean, default=False)
    mlb_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="player")
    consigner_prices: Mapped[list["ConsignerPlayerPrice"]] = relationship(back_populates="player")
