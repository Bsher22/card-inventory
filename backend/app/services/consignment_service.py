"""
Consignment Service

Handles autograph consignment operations including:
- Managing consigners (graphers who get autographs)
- Creating and tracking consignments
- Processing returned cards (signed/refused)
- Cost tracking that flows into inventory
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Consigner, Consignment, ConsignmentItem, 
    Inventory, Checklist
)


class ConsignmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==========================================
    # CONSIGNER OPERATIONS
    # ==========================================
    
    async def get_consigners(
        self,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Consigner]:
        """Get all consigners."""
        query = select(Consigner)
        
        if active_only:
            query = query.where(Consigner.is_active == True)
        
        query = query.order_by(Consigner.name).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_consigner(self, consigner_id: UUID) -> Optional[Consigner]:
        """Get a single consigner with their consignment history."""
        result = await self.db.execute(
            select(Consigner)
            .options(selectinload(Consigner.consignments))
            .where(Consigner.id == consigner_id)
        )
        return result.scalar_one_or_none()
    
    async def create_consigner(
        self,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        location: Optional[str] = None,
        default_fee: Optional[Decimal] = None,
        payment_method: Optional[str] = None,
        payment_details: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Consigner:
        """Create a new consigner."""
        consigner = Consigner(
            name=name,
            email=email,
            phone=phone,
            location=location,
            default_fee=default_fee,
            payment_method=payment_method,
            payment_details=payment_details,
            notes=notes,
        )
        self.db.add(consigner)
        await self.db.flush()
        await self.db.refresh(consigner)
        return consigner
    
    async def update_consigner(
        self,
        consigner_id: UUID,
        **kwargs
    ) -> Optional[Consigner]:
        """Update a consigner."""
        consigner = await self.db.get(Consigner, consigner_id)
        if not consigner:
            return None
        
        for field, value in kwargs.items():
            if hasattr(consigner, field) and value is not None:
                setattr(consigner, field, value)
        
        await self.db.flush()
        await self.db.refresh(consigner)
        return consigner
    
    async def get_consigner_stats(self, consigner_id: UUID) -> dict:
        """Get statistics for a consigner."""
        # Total consignments
        consignment_query = select(func.count(Consignment.id)).where(
            Consignment.consigner_id == consigner_id
        )
        
        # Item stats
        item_query = (
            select(
                func.count(ConsignmentItem.id).label("total_cards"),
                func.sum(
                    func.case((ConsignmentItem.status == 'signed', ConsignmentItem.quantity), else_=0)
                ).label("signed"),
                func.sum(
                    func.case((ConsignmentItem.status == 'refused', ConsignmentItem.quantity), else_=0)
                ).label("refused"),
                func.sum(
                    func.case((ConsignmentItem.status == 'pending', ConsignmentItem.quantity), else_=0)
                ).label("pending"),
                func.sum(
                    func.case(
                        (ConsignmentItem.status == 'signed', ConsignmentItem.fee_per_card * ConsignmentItem.quantity),
                        else_=0
                    )
                ).label("total_fees"),
            )
            .select_from(ConsignmentItem)
            .join(Consignment)
            .where(Consignment.consigner_id == consigner_id)
        )
        
        consignment_result = await self.db.execute(consignment_query)
        item_result = await self.db.execute(item_query)
        
        total_consignments = consignment_result.scalar() or 0
        stats = item_result.one()
        
        total_cards = stats.total_cards or 0
        signed = stats.signed or 0
        
        return {
            "total_consignments": total_consignments,
            "total_cards_sent": total_cards,
            "cards_signed": signed,
            "cards_refused": stats.refused or 0,
            "cards_pending": stats.pending or 0,
            "total_fees_paid": stats.total_fees or Decimal("0"),
            "success_rate": round((signed / total_cards * 100), 1) if total_cards > 0 else 0,
        }
    
    # ==========================================
    # CONSIGNMENT OPERATIONS
    # ==========================================
    
    async def get_consignments(
        self,
        consigner_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Consignment]:
        """Get consignments with optional filters."""
        query = (
            select(Consignment)
            .options(
                selectinload(Consignment.consigner),
                selectinload(Consignment.items),
            )
        )
        
        if consigner_id:
            query = query.where(Consignment.consigner_id == consigner_id)
        
        if status:
            query = query.where(Consignment.status == status)
        
        query = query.order_by(Consignment.date_sent.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_consignment(self, consignment_id: UUID) -> Optional[Consignment]:
        """Get a single consignment with items."""
        result = await self.db.execute(
            select(Consignment)
            .options(
                selectinload(Consignment.consigner),
                selectinload(Consignment.items)
                .selectinload(ConsignmentItem.checklist)
                .selectinload(Checklist.player),
            )
            .where(Consignment.id == consignment_id)
        )
        return result.scalar_one_or_none()
    
    async def create_consignment(
        self,
        consigner_id: UUID,
        date_sent: date,
        items: list[dict],  # [{checklist_id, quantity, fee_per_card, source_inventory_id?}]
        reference_number: Optional[str] = None,
        expected_return_date: Optional[date] = None,
        shipping_out_cost: Decimal = Decimal("0"),
        shipping_out_tracking: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Consignment:
        """
        Create a new consignment and remove cards from inventory.
        
        This creates unsigned cards → out for signing status.
        """
        # Verify consigner exists
        consigner = await self.db.get(Consigner, consigner_id)
        if not consigner:
            raise ValueError(f"Consigner not found: {consigner_id}")
        
        # Calculate total fee
        total_fee = sum(
            Decimal(str(item.get("fee_per_card", consigner.default_fee or 0))) * 
            item.get("quantity", 1)
            for item in items
        )
        
        # Create consignment
        consignment = Consignment(
            consigner_id=consigner_id,
            reference_number=reference_number,
            date_sent=date_sent,
            expected_return_date=expected_return_date,
            status="pending",
            total_fee=total_fee,
            shipping_out_cost=shipping_out_cost,
            shipping_out_tracking=shipping_out_tracking,
            notes=notes,
        )
        self.db.add(consignment)
        await self.db.flush()
        
        # Create consignment items and adjust inventory
        for item_data in items:
            checklist_id = item_data["checklist_id"]
            quantity = item_data.get("quantity", 1)
            fee_per_card = Decimal(str(item_data.get("fee_per_card", consigner.default_fee or 0)))
            source_inventory_id = item_data.get("source_inventory_id")
            
            # Find source inventory (unsigned, raw cards)
            if source_inventory_id:
                source_inv = await self.db.get(Inventory, source_inventory_id)
            else:
                # Find default unsigned, raw inventory
                result = await self.db.execute(
                    select(Inventory).where(
                        and_(
                            Inventory.checklist_id == checklist_id,
                            Inventory.is_signed == False,
                            Inventory.is_slabbed == False,
                            Inventory.quantity >= quantity,
                        )
                    )
                )
                source_inv = result.scalar_one_or_none()
            
            if not source_inv or source_inv.quantity < quantity:
                raise ValueError(
                    f"Insufficient unsigned raw inventory for checklist {checklist_id}"
                )
            
            # Decrement source inventory
            source_inv.quantity -= quantity
            
            # Create consignment item
            item = ConsignmentItem(
                consignment_id=consignment.id,
                checklist_id=checklist_id,
                source_inventory_id=source_inv.id,
                quantity=quantity,
                fee_per_card=fee_per_card,
                status="pending",
            )
            self.db.add(item)
        
        await self.db.flush()
        await self.db.refresh(consignment)
        return consignment
    
    async def process_consignment_return(
        self,
        consignment_id: UUID,
        item_results: list[dict],  # [{item_id, status, inscription?, notes?}]
        date_returned: Optional[date] = None,
        shipping_return_cost: Decimal = Decimal("0"),
        shipping_return_tracking: Optional[str] = None,
    ) -> Consignment:
        """
        Process returned consignment items.
        
        For signed items: Creates new signed inventory, adds fee to cost.
        For refused items: Returns to original unsigned inventory.
        """
        consignment = await self.get_consignment(consignment_id)
        if not consignment:
            raise ValueError(f"Consignment not found: {consignment_id}")
        
        for result in item_results:
            item_id = result["item_id"]
            status = result["status"]  # 'signed', 'refused', 'lost', 'returned_unsigned'
            
            # Find the item
            item = next((i for i in consignment.items if str(i.id) == str(item_id)), None)
            if not item:
                continue
            
            item.status = status
            item.notes = result.get("notes")
            
            if status == "signed":
                item.inscription = result.get("inscription")
                item.date_signed = result.get("date_signed", date_returned)
                
                # Create or update signed inventory
                target_inv = await self._get_or_create_inventory(
                    checklist_id=item.checklist_id,
                    is_signed=True,
                    is_slabbed=False,
                    raw_condition=item.source_inventory.raw_condition if item.source_inventory else "NM",
                )
                
                target_inv.quantity += item.quantity
                
                # Add fee to cost (purchase cost + consignment fee)
                original_cost = item.source_inventory.total_cost / max(item.source_inventory.quantity + item.quantity, 1) if item.source_inventory else 0
                target_inv.total_cost += (original_cost + item.fee_per_card) * item.quantity
                
                item.target_inventory_id = target_inv.id
                
            elif status in ("refused", "returned_unsigned"):
                # Return to source inventory
                if item.source_inventory:
                    item.source_inventory.quantity += item.quantity
            
            # For 'lost' status, the cards are just gone
        
        # Update consignment status
        all_items_processed = all(i.status != "pending" for i in consignment.items)
        
        if all_items_processed:
            consignment.status = "complete"
        else:
            consignment.status = "partial"
        
        consignment.date_returned = date_returned or date.today()
        consignment.shipping_return_cost = shipping_return_cost
        consignment.shipping_return_tracking = shipping_return_tracking
        
        await self.db.flush()
        await self.db.refresh(consignment)
        return consignment
    
    async def mark_fee_paid(
        self,
        consignment_id: UUID,
        fee_paid_date: Optional[date] = None,
    ) -> Consignment:
        """Mark a consignment's fee as paid."""
        consignment = await self.db.get(Consignment, consignment_id)
        if not consignment:
            raise ValueError(f"Consignment not found: {consignment_id}")
        
        consignment.fee_paid = True
        consignment.fee_paid_date = fee_paid_date or date.today()
        
        await self.db.flush()
        await self.db.refresh(consignment)
        return consignment
    
    async def _get_or_create_inventory(
        self,
        checklist_id: UUID,
        is_signed: bool,
        is_slabbed: bool,
        raw_condition: str = "NM",
        grade_company: Optional[str] = None,
        grade_value: Optional[Decimal] = None,
    ) -> Inventory:
        """Get existing inventory or create new one."""
        query = select(Inventory).where(
            and_(
                Inventory.checklist_id == checklist_id,
                Inventory.is_signed == is_signed,
                Inventory.is_slabbed == is_slabbed,
                Inventory.raw_condition == raw_condition,
                Inventory.grade_company == grade_company,
                Inventory.grade_value == grade_value,
            )
        )
        result = await self.db.execute(query)
        inventory = result.scalar_one_or_none()
        
        if not inventory:
            inventory = Inventory(
                checklist_id=checklist_id,
                quantity=0,
                is_signed=is_signed,
                is_slabbed=is_slabbed,
                raw_condition=raw_condition,
                grade_company=grade_company,
                grade_value=grade_value,
                total_cost=Decimal("0"),
            )
            self.db.add(inventory)
            await self.db.flush()
        
        return inventory
    
    # ==========================================
    # ANALYTICS
    # ==========================================
    
    async def get_pending_consignments_value(self) -> dict:
        """Get total value of cards currently out for signing."""
        query = (
            select(
                func.count(ConsignmentItem.id).label("total_items"),
                func.sum(ConsignmentItem.quantity).label("total_cards"),
                func.sum(ConsignmentItem.fee_per_card * ConsignmentItem.quantity).label("pending_fees"),
            )
            .select_from(ConsignmentItem)
            .join(Consignment)
            .where(
                and_(
                    ConsignmentItem.status == "pending",
                    Consignment.status.in_(["pending", "partial"]),
                )
            )
        )
        
        result = await self.db.execute(query)
        stats = result.one()
        
        return {
            "items_out": stats.total_items or 0,
            "cards_out": stats.total_cards or 0,
            "pending_fees": stats.pending_fees or Decimal("0"),
        }
