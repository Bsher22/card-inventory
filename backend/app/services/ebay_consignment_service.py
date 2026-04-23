"""
eBay Consignment Service

Business logic for managing consigners, agreements, items, and monthly payouts.
Uses async SQLAlchemy (same pattern as app/services/consignment_service.py).
"""

from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ebay_consignments import (
    EbayConsigner,
    EbayConsignmentAgreement,
    EbayConsignmentItem,
    EbayConsignmentPayout,
)


class EbayConsignmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ==============================================================
    # CONSIGNERS
    # ==============================================================

    async def list_consigners(
        self,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[EbayConsigner]:
        stmt = select(EbayConsigner)
        if active_only:
            stmt = stmt.where(EbayConsigner.is_active == True)  # noqa: E712
        stmt = stmt.order_by(EbayConsigner.name).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_consigner(self, consigner_id: UUID) -> Optional[EbayConsigner]:
        res = await self.db.execute(
            select(EbayConsigner).where(EbayConsigner.id == consigner_id)
        )
        return res.scalar_one_or_none()

    async def create_consigner(self, **fields) -> EbayConsigner:
        consigner = EbayConsigner(**fields)
        self.db.add(consigner)
        await self.db.commit()
        await self.db.refresh(consigner)
        return consigner

    async def update_consigner(self, consigner_id: UUID, **fields) -> Optional[EbayConsigner]:
        consigner = await self.get_consigner(consigner_id)
        if not consigner:
            return None
        for k, v in fields.items():
            setattr(consigner, k, v)
        await self.db.commit()
        await self.db.refresh(consigner)
        return consigner

    async def get_consigner_stats(self, consigner_id: UUID) -> dict:
        """Aggregate lifetime stats for a consigner."""
        agreements_stmt = select(
            func.count(EbayConsignmentAgreement.id),
            func.count(EbayConsignmentAgreement.id).filter(
                EbayConsignmentAgreement.status.in_(("signed", "active"))
            ),
        ).where(EbayConsignmentAgreement.consigner_id == consigner_id)
        total_agreements, active_agreements = (await self.db.execute(agreements_stmt)).one()

        items_stmt = (
            select(
                EbayConsignmentItem.status,
                func.count(EbayConsignmentItem.id),
                func.coalesce(func.sum(EbayConsignmentItem.sold_price), 0),
                func.coalesce(func.sum(EbayConsignmentItem.ebay_fees), 0),
                func.coalesce(
                    func.sum(EbayConsignmentItem.payment_fees + EbayConsignmentItem.shipping_cost), 0
                ),
            )
            .join(EbayConsignmentAgreement, EbayConsignmentAgreement.id == EbayConsignmentItem.agreement_id)
            .where(EbayConsignmentAgreement.consigner_id == consigner_id)
            .group_by(EbayConsignmentItem.status)
        )
        rows = (await self.db.execute(items_stmt)).all()

        by_status = {r[0]: {"count": r[1], "gross": r[2], "ebay_fees": r[3], "other_fees": r[4]} for r in rows}
        sold = by_status.get("sold", {"count": 0, "gross": Decimal(0), "ebay_fees": Decimal(0), "other_fees": Decimal(0)})
        listed = by_status.get("listed", {"count": 0})
        pending = by_status.get("pending", {"count": 0})

        # Lifetime IDGAS commission - the share IDGAS keeps, computed as
        # (100 - payout_percent)% of each sold item.  One SQL round-trip.
        idgas_fee_stmt = (
            select(
                func.coalesce(
                    func.sum(
                        EbayConsignmentItem.sold_price
                        * (100 - EbayConsignmentAgreement.payout_percent)
                        / 100
                    ),
                    0,
                )
            )
            .select_from(EbayConsignmentItem)
            .join(EbayConsignmentAgreement, EbayConsignmentAgreement.id == EbayConsignmentItem.agreement_id)
            .where(
                EbayConsignmentAgreement.consigner_id == consigner_id,
                EbayConsignmentItem.status == "sold",
            )
        )
        lifetime_idgas_fees = (await self.db.execute(idgas_fee_stmt)).scalar_one()

        payouts_stmt = select(
            func.coalesce(func.sum(EbayConsignmentPayout.net_payout), 0),
            func.coalesce(
                func.sum(EbayConsignmentPayout.net_payout).filter(
                    EbayConsignmentPayout.is_paid == False  # noqa: E712
                ),
                0,
            ),
        ).where(EbayConsignmentPayout.consigner_id == consigner_id)
        lifetime_payout, unpaid_balance = (await self.db.execute(payouts_stmt)).one()

        return {
            "consigner_id": consigner_id,
            "total_agreements": int(total_agreements or 0),
            "active_agreements": int(active_agreements or 0),
            "items_listed": int(listed["count"]),
            "items_sold": int(sold["count"]),
            "items_pending": int(pending["count"]),
            "lifetime_gross": Decimal(sold.get("gross") or 0),
            "lifetime_idgas_fees": Decimal(lifetime_idgas_fees or 0),
            "lifetime_payout": Decimal(lifetime_payout or 0),
            "unpaid_balance": Decimal(unpaid_balance or 0),
        }

    # ==============================================================
    # AGREEMENTS
    # ==============================================================

    async def list_agreements(
        self,
        consigner_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[EbayConsignmentAgreement]:
        stmt = select(EbayConsignmentAgreement).options(selectinload(EbayConsignmentAgreement.items))
        if consigner_id:
            stmt = stmt.where(EbayConsignmentAgreement.consigner_id == consigner_id)
        if status:
            stmt = stmt.where(EbayConsignmentAgreement.status == status)
        stmt = (
            stmt.order_by(EbayConsignmentAgreement.agreement_date.desc(),
                          EbayConsignmentAgreement.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_agreement(self, agreement_id: UUID) -> Optional[EbayConsignmentAgreement]:
        res = await self.db.execute(
            select(EbayConsignmentAgreement)
            .options(selectinload(EbayConsignmentAgreement.items),
                     selectinload(EbayConsignmentAgreement.consigner))
            .where(EbayConsignmentAgreement.id == agreement_id)
        )
        return res.scalar_one_or_none()

    async def create_agreement(
        self,
        consigner_id: UUID,
        agreement_date,
        payout_percent: Decimal,
        items: Optional[list[dict]] = None,
        notes: Optional[str] = None,
    ) -> EbayConsignmentAgreement:
        agreement = EbayConsignmentAgreement(
            consigner_id=consigner_id,
            agreement_date=agreement_date,
            payout_percent=payout_percent,
            notes=notes,
            status="draft",
        )
        self.db.add(agreement)
        await self.db.flush()  # get agreement.id

        for it in items or []:
            self.db.add(EbayConsignmentItem(agreement_id=agreement.id, **it))

        await self.db.commit()
        return await self.get_agreement(agreement.id)

    async def update_agreement(self, agreement_id: UUID, **fields) -> Optional[EbayConsignmentAgreement]:
        agreement = await self.get_agreement(agreement_id)
        if not agreement:
            return None
        for k, v in fields.items():
            setattr(agreement, k, v)
        await self.db.commit()
        return await self.get_agreement(agreement_id)

    async def delete_agreement(self, agreement_id: UUID) -> bool:
        agreement = await self.get_agreement(agreement_id)
        if not agreement:
            return False
        await self.db.delete(agreement)
        await self.db.commit()
        return True

    async def set_agreement_pdf_path(self, agreement_id: UUID, path: str):
        agreement = await self.get_agreement(agreement_id)
        if agreement:
            agreement.pdf_path = path
            await self.db.commit()

    async def sign_agreement(
        self,
        agreement_id: UUID,
        *,
        party: str,  # "client" or "idgas"
        signature_name: str,
    ) -> Optional[EbayConsignmentAgreement]:
        agreement = await self.get_agreement(agreement_id)
        if not agreement:
            return None
        now = datetime.now(timezone.utc)
        if party == "client":
            agreement.client_signature_name = signature_name
            agreement.client_signed_at = now
        elif party == "idgas":
            agreement.idgas_signature_name = signature_name
            agreement.idgas_signed_at = now
        else:
            raise ValueError("party must be 'client' or 'idgas'")

        # Auto-advance status when both have signed
        if agreement.client_signed_at and agreement.idgas_signed_at and agreement.status in ("draft", "sent"):
            agreement.status = "active"

        await self.db.commit()
        return await self.get_agreement(agreement_id)

    # ==============================================================
    # ITEMS
    # ==============================================================

    async def add_item(self, agreement_id: UUID, **fields) -> EbayConsignmentItem:
        item = EbayConsignmentItem(agreement_id=agreement_id, **fields)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def list_items(
        self,
        consigner_id: Optional[UUID] = None,
        agreement_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[EbayConsignmentItem]:
        """List items across all agreements with optional filters.

        Items are returned with their parent agreement and consigner eager-loaded
        so the API can flatten consigner_name and agreement_number into the
        response without an extra round-trip per row.
        """
        stmt = (
            select(EbayConsignmentItem)
            .options(
                selectinload(EbayConsignmentItem.agreement)
                .selectinload(EbayConsignmentAgreement.consigner)
            )
            .join(EbayConsignmentAgreement, EbayConsignmentAgreement.id == EbayConsignmentItem.agreement_id)
        )
        if consigner_id:
            stmt = stmt.where(EbayConsignmentAgreement.consigner_id == consigner_id)
        if agreement_id:
            stmt = stmt.where(EbayConsignmentItem.agreement_id == agreement_id)
        if status:
            stmt = stmt.where(EbayConsignmentItem.status == status)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(EbayConsignmentItem.title.ilike(like))
        stmt = stmt.order_by(EbayConsignmentItem.created_at.desc()).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def update_item(self, item_id: UUID, **fields) -> Optional[EbayConsignmentItem]:
        res = await self.db.execute(select(EbayConsignmentItem).where(EbayConsignmentItem.id == item_id))
        item = res.scalar_one_or_none()
        if not item:
            return None
        for k, v in fields.items():
            setattr(item, k, v)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item_id: UUID) -> bool:
        res = await self.db.execute(select(EbayConsignmentItem).where(EbayConsignmentItem.id == item_id))
        item = res.scalar_one_or_none()
        if not item:
            return False
        if item.status == "sold" and item.payout_id is not None:
            raise ValueError("Cannot delete an item that has already been paid out")
        await self.db.delete(item)
        await self.db.commit()
        return True

    async def record_sale(
        self,
        item_id: UUID,
        *,
        sold_price: Decimal,
        sold_at: Optional[datetime] = None,
        ebay_fees: Decimal = Decimal("0"),
        payment_fees: Decimal = Decimal("0"),
        shipping_cost: Decimal = Decimal("0"),
        buyer_info: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[EbayConsignmentItem]:
        res = await self.db.execute(select(EbayConsignmentItem).where(EbayConsignmentItem.id == item_id))
        item = res.scalar_one_or_none()
        if not item:
            return None
        if item.payout_id is not None:
            raise ValueError("Item has already been included in a payout and cannot be edited")

        item.sold_price = sold_price
        item.sold_at = sold_at or datetime.now(timezone.utc)
        item.ebay_fees = ebay_fees
        item.payment_fees = payment_fees
        item.shipping_cost = shipping_cost
        if buyer_info is not None:
            item.buyer_info = buyer_info
        if notes is not None:
            item.notes = notes
        item.status = "sold"
        await self.db.commit()
        await self.db.refresh(item)
        return item

    # ==============================================================
    # PAYOUTS
    # ==============================================================

    async def _items_for_period(
        self,
        consigner_id: UUID,
        year: int,
        month: int,
        *,
        only_unclaimed: bool = True,
    ) -> Sequence[EbayConsignmentItem]:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        last_day = monthrange(year, month)[1]
        end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        stmt = (
            select(EbayConsignmentItem)
            .options(selectinload(EbayConsignmentItem.agreement))
            .join(EbayConsignmentAgreement,
                  EbayConsignmentAgreement.id == EbayConsignmentItem.agreement_id)
            .where(
                EbayConsignmentAgreement.consigner_id == consigner_id,
                EbayConsignmentItem.status == "sold",
                EbayConsignmentItem.sold_at >= start,
                EbayConsignmentItem.sold_at <= end,
            )
            .order_by(EbayConsignmentItem.sold_at)
        )
        if only_unclaimed:
            stmt = stmt.where(EbayConsignmentItem.payout_id.is_(None))
        res = await self.db.execute(stmt)
        return res.scalars().all()

    def _calc_totals(self, items: Sequence[EbayConsignmentItem]) -> dict:
        gross = Decimal(0)
        idgas_fee = Decimal(0)
        ebay_fees_total = Decimal(0)
        other_fees = Decimal(0)
        for it in items:
            price = Decimal(it.sold_price or 0)
            payout_pct = Decimal(it.agreement.payout_percent) if it.agreement else Decimal(100)
            commission_pct = Decimal(100) - payout_pct
            gross += price
            idgas_fee += (price * commission_pct / Decimal(100)).quantize(Decimal("0.01"))
            ebay_fees_total += Decimal(it.ebay_fees or 0)
            other_fees += Decimal(it.payment_fees or 0) + Decimal(it.shipping_cost or 0)
        net_payout = gross - idgas_fee - ebay_fees_total - other_fees
        return {
            "total_gross": gross,
            "total_idgas_fee": idgas_fee,
            "total_ebay_fees": ebay_fees_total,
            "total_other_fees": other_fees,
            "net_payout": net_payout,
            "item_count": len(items),
        }

    async def preview_payout(
        self,
        consigner_id: UUID,
        year: int,
        month: int,
    ) -> dict:
        items = await self._items_for_period(consigner_id, year, month, only_unclaimed=True)
        totals = self._calc_totals(items)
        return {
            "consigner_id": consigner_id,
            "period_year": year,
            "period_month": month,
            **totals,
            "items": list(items),
        }

    async def generate_payout(
        self,
        consigner_id: UUID,
        year: int,
        month: int,
        notes: Optional[str] = None,
    ) -> EbayConsignmentPayout:
        # Reject duplicates
        existing_stmt = select(EbayConsignmentPayout).where(
            and_(
                EbayConsignmentPayout.consigner_id == consigner_id,
                EbayConsignmentPayout.period_year == year,
                EbayConsignmentPayout.period_month == month,
            )
        )
        existing = (await self.db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            raise ValueError(
                f"A payout already exists for this consigner for {year}-{month:02d}"
            )

        items = await self._items_for_period(consigner_id, year, month, only_unclaimed=True)
        if not items:
            raise ValueError("No unclaimed sold items for this period")
        totals = self._calc_totals(items)

        payout = EbayConsignmentPayout(
            consigner_id=consigner_id,
            period_year=year,
            period_month=month,
            notes=notes,
            **{k: totals[k] for k in (
                "total_gross", "total_idgas_fee", "total_ebay_fees",
                "total_other_fees", "net_payout", "item_count",
            )},
        )
        self.db.add(payout)
        await self.db.flush()
        for it in items:
            it.payout_id = payout.id
        await self.db.commit()
        await self.db.refresh(payout)
        return payout

    async def get_payout(self, payout_id: UUID) -> Optional[EbayConsignmentPayout]:
        res = await self.db.execute(
            select(EbayConsignmentPayout)
            .options(
                selectinload(EbayConsignmentPayout.items).selectinload(EbayConsignmentItem.agreement),
                selectinload(EbayConsignmentPayout.consigner),
            )
            .where(EbayConsignmentPayout.id == payout_id)
        )
        return res.scalar_one_or_none()

    async def list_payouts(
        self,
        consigner_id: Optional[UUID] = None,
        year: Optional[int] = None,
        is_paid: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[EbayConsignmentPayout]:
        stmt = select(EbayConsignmentPayout).options(
            selectinload(EbayConsignmentPayout.consigner)
        )
        if consigner_id:
            stmt = stmt.where(EbayConsignmentPayout.consigner_id == consigner_id)
        if year:
            stmt = stmt.where(EbayConsignmentPayout.period_year == year)
        if is_paid is not None:
            stmt = stmt.where(EbayConsignmentPayout.is_paid == is_paid)
        stmt = stmt.order_by(
            EbayConsignmentPayout.period_year.desc(),
            EbayConsignmentPayout.period_month.desc(),
        ).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def mark_payout_paid(
        self,
        payout_id: UUID,
        *,
        paid_at: Optional[datetime] = None,
        paid_method: Optional[str] = None,
        paid_reference: Optional[str] = None,
    ) -> Optional[EbayConsignmentPayout]:
        payout = await self.get_payout(payout_id)
        if not payout:
            return None
        payout.is_paid = True
        payout.paid_at = paid_at or datetime.now(timezone.utc)
        payout.paid_method = paid_method
        payout.paid_reference = paid_reference
        await self.db.commit()
        return await self.get_payout(payout_id)

    async def delete_payout(self, payout_id: UUID) -> bool:
        """Undo a payout - releases items back to 'unclaimed'."""
        payout = await self.get_payout(payout_id)
        if not payout:
            return False
        if payout.is_paid:
            raise ValueError("Cannot delete a payout that has been marked paid")
        await self.db.delete(payout)
        await self.db.commit()
        return True
