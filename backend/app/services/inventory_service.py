"""
Inventory Service

Handles all inventory-related business logic including CRUD operations,
quantity adjustments, and inventory analytics.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models import (
    Inventory, Checklist, Player, ProductLine, Brand,
    PurchaseItem, SaleItem, CardType
)
from app.schemas import (
    InventoryCreate, InventoryUpdate, InventoryAdjust,
    InventoryResponse, InventoryWithCard, PlayerInventorySummary,
    InventoryAnalytics
)


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        product_line_id: Optional[UUID] = None,
        player_id: Optional[UUID] = None,
        brand_id: Optional[UUID] = None,
        in_stock_only: bool = True,
        is_signed: Optional[bool] = None,
        is_slabbed: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> list[InventoryWithCard]:
        """Get all inventory items with optional filters."""
        query = (
            select(Inventory)
            .options(
                selectinload(Inventory.checklist)
                .selectinload(Checklist.player),
                selectinload(Inventory.checklist)
                .selectinload(Checklist.product_line)
                .selectinload(ProductLine.brand),
                selectinload(Inventory.checklist)
                .selectinload(Checklist.card_type),
            )
            .join(Checklist)
        )

        if in_stock_only:
            query = query.where(Inventory.quantity > 0)

        if product_line_id:
            query = query.where(Checklist.product_line_id == product_line_id)

        if player_id:
            query = query.where(Checklist.player_id == player_id)

        if brand_id:
            query = query.join(ProductLine).where(ProductLine.brand_id == brand_id)

        if is_signed is not None:
            query = query.where(Inventory.is_signed == is_signed)

        if is_slabbed is not None:
            query = query.where(Inventory.is_slabbed == is_slabbed)

        if search:
            search_term = f"%{search}%"
            query = query.outerjoin(Player).where(
                or_(
                    Checklist.card_number.ilike(search_term),
                    Checklist.player_name_raw.ilike(search_term),
                    Player.name.ilike(search_term),
                    Checklist.team.ilike(search_term),
                )
            )

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, inventory_id: UUID) -> Optional[Inventory]:
        """Get a single inventory item by ID."""
        query = (
            select(Inventory)
            .options(
                selectinload(Inventory.checklist)
                .selectinload(Checklist.player),
                selectinload(Inventory.checklist)
                .selectinload(Checklist.product_line),
            )
            .where(Inventory.id == inventory_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_checklist(
        self,
        checklist_id: UUID,
        condition: Optional[str] = None,
    ) -> list[Inventory]:
        """Get inventory items for a specific checklist."""
        query = select(Inventory).where(Inventory.checklist_id == checklist_id)

        if condition:
            query = query.where(Inventory.condition == condition)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, data: InventoryCreate) -> Inventory:
        """Create a new inventory item."""
        # Check if inventory already exists for this checklist/condition combo
        existing = await self.db.execute(
            select(Inventory).where(
                and_(
                    Inventory.checklist_id == data.checklist_id,
                    Inventory.condition == data.condition,
                    Inventory.grade_company == data.grade_company,
                    Inventory.grade_value == data.grade_value,
                )
            )
        )

        if existing.scalar_one_or_none():
            raise ValueError("Inventory item already exists for this card/condition combination")

        inventory = Inventory(**data.model_dump())
        self.db.add(inventory)
        await self.db.flush()
        await self.db.refresh(inventory)
        return inventory

    async def update(self, inventory_id: UUID, data: InventoryUpdate) -> Optional[Inventory]:
        """Update an inventory item."""
        inventory = await self.get_by_id(inventory_id)
        if not inventory:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(inventory, field, value)

        await self.db.flush()
        await self.db.refresh(inventory)
        return inventory

    async def adjust_quantity(
        self,
        inventory_id: UUID,
        adjustment: int
    ) -> Optional[Inventory]:
        """Adjust inventory quantity by a positive or negative amount."""
        inventory = await self.get_by_id(inventory_id)
        if not inventory:
            return None

        new_quantity = inventory.quantity + adjustment
        if new_quantity < 0:
            raise ValueError(f"Cannot reduce quantity below 0 (current: {inventory.quantity}, adjustment: {adjustment})")

        inventory.quantity = new_quantity
        await self.db.flush()
        await self.db.refresh(inventory)
        return inventory

    async def add_to_inventory(
        self,
        checklist_id: UUID,
        quantity: int,
        condition: str = "NM",
        grade_company: Optional[str] = None,
        grade_value: Optional[Decimal] = None,
    ) -> Inventory:
        """
        Add quantity to inventory. Creates new record if doesn't exist,
        otherwise increments existing quantity.
        """
        # Look for existing inventory record
        query = select(Inventory).where(
            and_(
                Inventory.checklist_id == checklist_id,
                Inventory.condition == condition,
                Inventory.grade_company == grade_company,
                Inventory.grade_value == grade_value,
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.quantity += quantity
            await self.db.flush()
            return existing
        else:
            new_inventory = Inventory(
                checklist_id=checklist_id,
                quantity=quantity,
                condition=condition,
                grade_company=grade_company,
                grade_value=grade_value,
            )
            self.db.add(new_inventory)
            await self.db.flush()
            return new_inventory

    async def remove_from_inventory(
        self,
        checklist_id: UUID,
        quantity: int,
        condition: str = "NM",
        grade_company: Optional[str] = None,
        grade_value: Optional[Decimal] = None,
    ) -> Optional[Inventory]:
        """Remove quantity from inventory."""
        query = select(Inventory).where(
            and_(
                Inventory.checklist_id == checklist_id,
                Inventory.condition == condition,
                Inventory.grade_company == grade_company,
                Inventory.grade_value == grade_value,
            )
        )
        result = await self.db.execute(query)
        inventory = result.scalar_one_or_none()

        if not inventory:
            raise ValueError("Inventory record not found")

        if inventory.quantity < quantity:
            raise ValueError(f"Insufficient quantity (have: {inventory.quantity}, requested: {quantity})")

        inventory.quantity -= quantity
        await self.db.flush()
        return inventory

    async def delete(self, inventory_id: UUID) -> bool:
        """Delete an inventory item."""
        inventory = await self.get_by_id(inventory_id)
        if not inventory:
            return False

        await self.db.delete(inventory)
        await self.db.flush()
        return True

    async def get_player_summary(
        self,
        limit: int = 20,
        min_cards: int = 1,
    ) -> list[PlayerInventorySummary]:
        """Get inventory summary grouped by player."""
        query = (
            select(
                Player.id.label("player_id"),
                Player.name.label("player_name"),
                Player.team,
                Player.position,
                func.count(func.distinct(Checklist.id)).label("unique_cards"),
                func.sum(Inventory.quantity).label("total_cards"),
                func.sum(
                    case(
                        (Checklist.is_autograph == True, Inventory.quantity),
                        else_=0
                    )
                ).label("auto_count"),
                func.sum(
                    case(
                        (Checklist.is_rookie_card == True, Inventory.quantity),
                        else_=0
                    )
                ).label("rookie_count"),
                func.sum(
                    case(
                        (Checklist.serial_numbered.isnot(None), Inventory.quantity),
                        else_=0
                    )
                ).label("numbered_count"),
            )
            .select_from(Player)
            .join(Checklist, Checklist.player_id == Player.id)
            .join(Inventory, Inventory.checklist_id == Checklist.id)
            .where(Inventory.quantity > 0)
            .group_by(Player.id, Player.name, Player.team, Player.position)
            .having(func.sum(Inventory.quantity) >= min_cards)
            .order_by(func.sum(Inventory.quantity).desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        rows = result.all()

        summaries = []
        for row in rows:
            summaries.append(PlayerInventorySummary(
                player_id=row.player_id,
                player_name=row.player_name,
                team=row.team,
                position=row.position,
                unique_cards=row.unique_cards,
                total_cards=row.total_cards or 0,
                auto_count=row.auto_count or 0,
                rookie_count=row.rookie_count or 0,
                numbered_count=row.numbered_count or 0,
            ))

        return summaries

    async def get_analytics(self) -> InventoryAnalytics:
        """Get comprehensive inventory analytics."""
        # Basic counts
        count_query = select(
            func.count(func.distinct(Checklist.id)).label("unique_cards"),
            func.sum(Inventory.quantity).label("total_quantity"),
        ).select_from(Inventory).join(Checklist).where(Inventory.quantity > 0)

        count_result = await self.db.execute(count_query)
        counts = count_result.one()

        # Cost basis - use unit_price (matches model)
        cost_query = select(
            func.sum(PurchaseItem.quantity * PurchaseItem.unit_price)
        ).select_from(PurchaseItem)
        cost_result = await self.db.execute(cost_query)
        total_cost = cost_result.scalar() or Decimal("0")

        # Revenue
        revenue_query = select(
            func.sum(SaleItem.quantity * SaleItem.sale_price)
        ).select_from(SaleItem)
        revenue_result = await self.db.execute(revenue_query)
        total_revenue = revenue_result.scalar() or Decimal("0")

        # Cards by brand
        brand_query = (
            select(Brand.name, func.sum(Inventory.quantity))
            .select_from(Inventory)
            .join(Checklist)
            .join(ProductLine)
            .join(Brand)
            .where(Inventory.quantity > 0)
            .group_by(Brand.name)
        )
        brand_result = await self.db.execute(brand_query)
        cards_by_brand = {row[0]: row[1] for row in brand_result.all()}

        # Cards by year
        year_query = (
            select(ProductLine.year, func.sum(Inventory.quantity))
            .select_from(Inventory)
            .join(Checklist)
            .join(ProductLine)
            .where(Inventory.quantity > 0)
            .group_by(ProductLine.year)
            .order_by(ProductLine.year.desc())
        )
        year_result = await self.db.execute(year_query)
        cards_by_year = {row[0]: row[1] for row in year_result.all()}

        # Top players
        top_players = await self.get_player_summary(limit=10)

        return InventoryAnalytics(
            total_unique_cards=counts.unique_cards or 0,
            total_quantity=counts.total_quantity or 0,
            total_cost_basis=total_cost,
            total_revenue=total_revenue,
            total_profit=total_revenue - total_cost,
            cards_by_brand=cards_by_brand,
            cards_by_year=cards_by_year,
            top_players=top_players,
        )