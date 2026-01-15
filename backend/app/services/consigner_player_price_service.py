"""Service layer for consigner player pricing"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.consigner_player_price import ConsignerPlayerPrice
from app.models.consignments import Consigner
from app.models.players import Player
from app.schemas.consigner_player_price import (
    ConsignerPlayerPriceCreate,
    ConsignerPlayerPriceUpdate,
    ConsignerPlayerPriceResponse,
    PricingMatrixResponse,
    ConsignerColumn,
    PlayerRow,
    PlayerPriceInfo,
    BulkPriceCreate,
    BulkPriceResult,
    PriceLookupResponse,
    ConsignerPriceSummary,
)


class ConsignerPlayerPriceService:
    """Service for managing consigner player prices"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # CRUD OPERATIONS
    # ============================================

    async def create_price(
        self, data: ConsignerPlayerPriceCreate
    ) -> ConsignerPlayerPriceResponse:
        """Create a new price entry"""
        # Check if active price already exists
        existing = await self.db.execute(
            select(ConsignerPlayerPrice).where(
                and_(
                    ConsignerPlayerPrice.consigner_id == data.consigner_id,
                    ConsignerPlayerPrice.player_id == data.player_id,
                    ConsignerPlayerPrice.is_active == True,
                )
            )
        )
        existing_price = existing.scalar_one_or_none()

        if existing_price:
            # Deactivate old price
            existing_price.is_active = False

        # Create new price
        price = ConsignerPlayerPrice(**data.model_dump())
        self.db.add(price)
        await self.db.commit()
        await self.db.refresh(price)

        return await self._to_response(price)

    async def get_price(self, price_id: UUID) -> Optional[ConsignerPlayerPriceResponse]:
        """Get a single price entry by ID"""
        result = await self.db.execute(
            select(ConsignerPlayerPrice)
            .options(selectinload(ConsignerPlayerPrice.consigner))
            .options(selectinload(ConsignerPlayerPrice.player))
            .where(ConsignerPlayerPrice.id == price_id)
        )
        price = result.scalar_one_or_none()
        if price:
            return await self._to_response(price)
        return None

    async def update_price(
        self, price_id: UUID, data: ConsignerPlayerPriceUpdate
    ) -> Optional[ConsignerPlayerPriceResponse]:
        """Update a price entry"""
        result = await self.db.execute(
            select(ConsignerPlayerPrice).where(ConsignerPlayerPrice.id == price_id)
        )
        price = result.scalar_one_or_none()

        if not price:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(price, field, value)

        await self.db.commit()
        await self.db.refresh(price)

        return await self._to_response(price)

    async def delete_price(self, price_id: UUID) -> bool:
        """Delete (deactivate) a price entry"""
        result = await self.db.execute(
            select(ConsignerPlayerPrice).where(ConsignerPlayerPrice.id == price_id)
        )
        price = result.scalar_one_or_none()

        if not price:
            return False

        price.is_active = False
        await self.db.commit()
        return True

    # ============================================
    # MATRIX VIEW
    # ============================================

    async def get_pricing_matrix(
        self,
        consigner_ids: Optional[list[UUID]] = None,
        player_search: Optional[str] = None,
        only_with_prices: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> PricingMatrixResponse:
        """
        Get the full pricing matrix showing players vs consigners

        Args:
            consigner_ids: Filter to specific consigners
            player_search: Search players by name
            only_with_prices: Only show players that have at least one price
            limit: Max players to return
            offset: Pagination offset
        """
        # Get active consigners
        consigner_query = select(Consigner).where(Consigner.is_active == True)
        if consigner_ids:
            consigner_query = consigner_query.where(Consigner.id.in_(consigner_ids))
        consigner_query = consigner_query.order_by(Consigner.name)

        consigner_result = await self.db.execute(consigner_query)
        consigners = consigner_result.scalars().all()

        consigner_columns = [
            ConsignerColumn(
                id=c.id,
                name=c.name,
                default_fee=c.default_fee,
                is_active=c.is_active,
            )
            for c in consigners
        ]

        # Build player query
        player_query = select(Player)

        if player_search:
            player_query = player_query.where(
                Player.name.ilike(f"%{player_search}%")
            )

        if only_with_prices:
            # Subquery to find players with prices
            priced_players = (
                select(ConsignerPlayerPrice.player_id)
                .where(ConsignerPlayerPrice.is_active == True)
                .distinct()
            )
            player_query = player_query.where(Player.id.in_(priced_players))

        # Get total count
        count_query = select(func.count()).select_from(player_query.subquery())
        total_result = await self.db.execute(count_query)
        total_players = total_result.scalar() or 0

        # Get paginated players
        player_query = player_query.order_by(Player.name).offset(offset).limit(limit)
        player_result = await self.db.execute(player_query)
        players = player_result.scalars().all()

        # Get all prices for these players
        player_ids = [p.id for p in players]
        consigner_id_list = [c.id for c in consigners]

        if player_ids and consigner_id_list:
            price_query = select(ConsignerPlayerPrice).where(
                and_(
                    ConsignerPlayerPrice.player_id.in_(player_ids),
                    ConsignerPlayerPrice.consigner_id.in_(consigner_id_list),
                    ConsignerPlayerPrice.is_active == True,
                )
            )
            price_result = await self.db.execute(price_query)
            prices = price_result.scalars().all()
        else:
            prices = []

        # Build price lookup: player_id -> consigner_id -> price
        price_map: dict[UUID, dict[UUID, ConsignerPlayerPrice]] = {}
        for price in prices:
            if price.player_id not in price_map:
                price_map[price.player_id] = {}
            price_map[price.player_id][price.consigner_id] = price

        # Build player rows
        player_rows = []
        for player in players:
            prices_dict = {}
            player_prices = price_map.get(player.id, {})

            for consigner in consigners:
                if consigner.id in player_prices:
                    p = player_prices[consigner.id]
                    prices_dict[str(consigner.id)] = PlayerPriceInfo(
                        price_id=p.id,
                        price_per_card=p.price_per_card,
                        notes=p.notes,
                        effective_date=p.effective_date,
                    )
                else:
                    prices_dict[str(consigner.id)] = PlayerPriceInfo()

            player_rows.append(
                PlayerRow(
                    id=player.id,
                    name=player.name,
                    team=player.team if hasattr(player, 'team') else None,
                    prices=prices_dict,
                )
            )

        return PricingMatrixResponse(
            consigners=consigner_columns,
            players=player_rows,
            total_players=total_players,
            total_consigners=len(consigners),
        )

    # ============================================
    # BULK OPERATIONS
    # ============================================

    async def bulk_upsert_prices(self, data: BulkPriceCreate) -> BulkPriceResult:
        """Bulk create or update prices"""
        created = 0
        updated = 0
        errors = []

        for entry in data.prices:
            try:
                # Check for existing active price
                existing = await self.db.execute(
                    select(ConsignerPlayerPrice).where(
                        and_(
                            ConsignerPlayerPrice.consigner_id == entry.consigner_id,
                            ConsignerPlayerPrice.player_id == entry.player_id,
                            ConsignerPlayerPrice.is_active == True,
                        )
                    )
                )
                existing_price = existing.scalar_one_or_none()

                if existing_price:
                    if data.replace_existing:
                        existing_price.is_active = False
                        # Create new
                        new_price = ConsignerPlayerPrice(
                            consigner_id=entry.consigner_id,
                            player_id=entry.player_id,
                            price_per_card=entry.price_per_card,
                            notes=entry.notes,
                        )
                        self.db.add(new_price)
                        created += 1
                    else:
                        # Update existing
                        existing_price.price_per_card = entry.price_per_card
                        if entry.notes:
                            existing_price.notes = entry.notes
                        updated += 1
                else:
                    # Create new
                    new_price = ConsignerPlayerPrice(
                        consigner_id=entry.consigner_id,
                        player_id=entry.player_id,
                        price_per_card=entry.price_per_card,
                        notes=entry.notes,
                    )
                    self.db.add(new_price)
                    created += 1

            except Exception as e:
                errors.append(f"Error for {entry.consigner_id}/{entry.player_id}: {str(e)}")

        await self.db.commit()

        return BulkPriceResult(created=created, updated=updated, errors=errors)

    # ============================================
    # LOOKUP HELPERS
    # ============================================

    async def get_best_price_for_player(
        self, player_id: UUID, prefer_consigner_id: Optional[UUID] = None
    ) -> PriceLookupResponse:
        """Find the best (lowest) price for a player"""
        # Get player info
        player_result = await self.db.execute(
            select(Player).where(Player.id == player_id)
        )
        player = player_result.scalar_one_or_none()

        if not player:
            raise ValueError(f"Player {player_id} not found")

        # Get all active prices for this player
        price_query = (
            select(ConsignerPlayerPrice)
            .options(selectinload(ConsignerPlayerPrice.consigner))
            .where(
                and_(
                    ConsignerPlayerPrice.player_id == player_id,
                    ConsignerPlayerPrice.is_active == True,
                )
            )
            .order_by(ConsignerPlayerPrice.price_per_card)
        )

        price_result = await self.db.execute(price_query)
        prices = price_result.scalars().all()

        all_prices = [await self._to_response(p) for p in prices]

        # Determine best price
        best_price = None
        best_consigner_id = None
        best_consigner_name = None

        if prefer_consigner_id:
            # Check if preferred consigner has a price
            for p in prices:
                if p.consigner_id == prefer_consigner_id:
                    best_price = p.price_per_card
                    best_consigner_id = p.consigner_id
                    best_consigner_name = p.consigner.name
                    break

        # Fall back to lowest price
        if best_price is None and prices:
            p = prices[0]
            best_price = p.price_per_card
            best_consigner_id = p.consigner_id
            best_consigner_name = p.consigner.name

        return PriceLookupResponse(
            player_id=player_id,
            player_name=player.name,
            best_consigner_id=best_consigner_id,
            best_consigner_name=best_consigner_name,
            best_price=best_price,
            all_prices=all_prices,
        )

    async def get_consigner_price_summary(
        self, consigner_id: UUID
    ) -> ConsignerPriceSummary:
        """Get pricing summary for a consigner"""
        # Get consigner
        consigner_result = await self.db.execute(
            select(Consigner).where(Consigner.id == consigner_id)
        )
        consigner = consigner_result.scalar_one_or_none()

        if not consigner:
            raise ValueError(f"Consigner {consigner_id} not found")

        # Get stats
        stats_query = select(
            func.count(ConsignerPlayerPrice.id).label("total"),
            func.avg(ConsignerPlayerPrice.price_per_card).label("avg"),
            func.min(ConsignerPlayerPrice.price_per_card).label("min"),
            func.max(ConsignerPlayerPrice.price_per_card).label("max"),
        ).where(
            and_(
                ConsignerPlayerPrice.consigner_id == consigner_id,
                ConsignerPlayerPrice.is_active == True,
            )
        )

        stats_result = await self.db.execute(stats_query)
        stats = stats_result.one()

        return ConsignerPriceSummary(
            consigner_id=consigner_id,
            consigner_name=consigner.name,
            total_players_priced=stats.total or 0,
            avg_price=Decimal(str(stats.avg)) if stats.avg else None,
            min_price=stats.min,
            max_price=stats.max,
        )

    async def get_prices_for_consigner(
        self, consigner_id: UUID
    ) -> list[ConsignerPlayerPriceResponse]:
        """Get all active prices for a consigner"""
        result = await self.db.execute(
            select(ConsignerPlayerPrice)
            .options(selectinload(ConsignerPlayerPrice.player))
            .options(selectinload(ConsignerPlayerPrice.consigner))
            .where(
                and_(
                    ConsignerPlayerPrice.consigner_id == consigner_id,
                    ConsignerPlayerPrice.is_active == True,
                )
            )
            .order_by(ConsignerPlayerPrice.price_per_card)
        )
        prices = result.scalars().all()
        return [await self._to_response(p) for p in prices]

    # ============================================
    # HELPERS
    # ============================================

    async def _to_response(
        self, price: ConsignerPlayerPrice
    ) -> ConsignerPlayerPriceResponse:
        """Convert model to response schema"""
        # Load relationships if not loaded
        if not price.consigner:
            await self.db.refresh(price, ["consigner"])
        if not price.player:
            await self.db.refresh(price, ["player"])

        return ConsignerPlayerPriceResponse(
            id=price.id,
            consigner_id=price.consigner_id,
            player_id=price.player_id,
            price_per_card=price.price_per_card,
            notes=price.notes,
            effective_date=price.effective_date,
            is_active=price.is_active,
            created_at=price.created_at,
            updated_at=price.updated_at,
            consigner_name=price.consigner.name if price.consigner else None,
            player_name=price.player.name if price.player else None,
        )
