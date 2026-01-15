"""ConsignerPlayerPrice model - per-player pricing from consigners"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .consignments import Consigner
    from .players import Player


class ConsignerPlayerPrice(Base):
    """Per-player pricing quotes from consigners"""
    __tablename__ = "consigner_player_prices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    consigner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("consigners.id", ondelete="CASCADE"), nullable=False
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )

    # Pricing
    price_per_card: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    consigner: Mapped["Consigner"] = relationship(back_populates="player_prices")
    player: Mapped["Player"] = relationship(back_populates="consigner_prices")

    def __repr__(self) -> str:
        return f"<ConsignerPlayerPrice {self.consigner_id} -> {self.player_id}: ${self.price_per_card}>"
