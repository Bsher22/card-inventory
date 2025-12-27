"""
Checklist and CardType Models
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base

if TYPE_CHECKING:
    from .products import ProductLine
    from .players import Player
    from .inventory import Inventory


class CardType(Base):
    """Card types (Base, Refractor, Auto, Relic, etc.)"""
    __tablename__ = "card_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50))  # 'base', 'parallel', 'insert', 'auto', 'relic'
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    checklists: Mapped[list["Checklist"]] = relationship(back_populates="card_type")


class Checklist(Base):
    """Master checklist of all cards in a product line"""
    __tablename__ = "checklists"
    __table_args__ = (
        UniqueConstraint('product_line_id', 'card_number', 'set_name', name='uq_checklist_product_card_set'),
        Index('idx_checklist_player', 'player_id'),
        Index('idx_checklist_product_line', 'product_line_id'),
        Index('idx_checklist_first_bowman', 'is_first_bowman', postgresql_where='is_first_bowman = TRUE'),
        Index('idx_checklist_rookie', 'is_rookie_card', postgresql_where='is_rookie_card = TRUE'),
        Index('idx_checklist_auto', 'is_autograph', postgresql_where='is_autograph = TRUE'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_line_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_lines.id", ondelete="CASCADE"), nullable=False)

    # Card identification
    card_number: Mapped[str] = mapped_column(String(50), nullable=False)
    card_prefix: Mapped[Optional[str]] = mapped_column(String(20))  # e.g., "BP", "BCP", "CPA"
    card_suffix: Mapped[Optional[str]] = mapped_column(String(10))  # e.g., "A", "B"

    # Player info
    player_name_raw: Mapped[str] = mapped_column(String(200), nullable=False)
    player_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("players.id"))
    team: Mapped[Optional[str]] = mapped_column(String(100))

    # Card classification
    card_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("card_types.id"))
    set_name: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "Base", "Bowman Prospects"
    parallel_name: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., "Refractor", "Gold /50"

    # Card attributes
    is_autograph: Mapped[bool] = mapped_column(Boolean, default=False)
    is_relic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rookie_card: Mapped[bool] = mapped_column(Boolean, default=False)
    is_first_bowman: Mapped[bool] = mapped_column(Boolean, default=False)  # 1st Bowman card for this player

    # Numbering
    serial_numbered: Mapped[Optional[int]] = mapped_column(Integer)  # e.g., 199 for /199

    # Raw data for reference
    raw_checklist_line: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product_line: Mapped["ProductLine"] = relationship(back_populates="checklists")
    player: Mapped[Optional["Player"]] = relationship(back_populates="checklists")
    card_type: Mapped[Optional["CardType"]] = relationship(back_populates="checklists")
    inventory_items: Mapped[list["Inventory"]] = relationship(back_populates="checklist", cascade="all, delete-orphan")
