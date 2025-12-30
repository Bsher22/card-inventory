"""
Signature Authentication Service

Handles business logic for PSA/DNA and JSA signature authentication.
Supports cards, memorabilia, and collectibles.
"""

from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.grading import (
    GradingCompany, GradingServiceLevel,
    AuthSubmission, AuthSubmissionItem
)
from app.models.inventory import Inventory
from app.models.checklists import Checklist
from app.models.standalone_items import StandaloneItem


class SignatureAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # COMPANY & SERVICE LEVEL METHODS
    # ============================================

    async def get_auth_companies(
        self,
        active_only: bool = True,
    ) -> List[GradingCompany]:
        """Get authentication companies (PSA/DNA, JSA) with service levels."""
        query = select(GradingCompany).options(
            selectinload(GradingCompany.service_levels)
        ).where(
            (GradingCompany.service_type == "authentication") |
            (GradingCompany.service_type == "both")
        )
        
        if active_only:
            query = query.where(GradingCompany.is_active == True)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_service_levels(
        self,
        company_id: UUID,
        active_only: bool = True,
    ) -> List[GradingServiceLevel]:
        """Get service levels for an auth company."""
        query = select(GradingServiceLevel).where(
            GradingServiceLevel.company_id == company_id
        )
        
        if active_only:
            query = query.where(GradingServiceLevel.is_active == True)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    # ============================================
    # SUBMISSION CRUD
    # ============================================

    async def get_submissions(
        self,
        company_id: Optional[UUID] = None,
        status: Optional[str] = None,
        item_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AuthSubmission]:
        """Get auth submissions with optional filters."""
        query = (
            select(AuthSubmission)
            .options(
                selectinload(AuthSubmission.company),
                selectinload(AuthSubmission.service_level),
                selectinload(AuthSubmission.items),
            )
        )
        
        if company_id:
            query = query.where(AuthSubmission.company_id == company_id)
        
        if status:
            query = query.where(AuthSubmission.status == status)
        
        if item_type:
            # Filter submissions that have at least one item of this type
            query = query.where(
                AuthSubmission.id.in_(
                    select(AuthSubmissionItem.submission_id)
                    .where(AuthSubmissionItem.item_type == item_type)
                )
            )
        
        query = query.order_by(AuthSubmission.date_submitted.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_submission(self, submission_id: UUID) -> Optional[AuthSubmission]:
        """Get a single submission with all details."""
        query = (
            select(AuthSubmission)
            .options(
                selectinload(AuthSubmission.company),
                selectinload(AuthSubmission.service_level),
                selectinload(AuthSubmission.items)
                .selectinload(AuthSubmissionItem.inventory)
                .selectinload(Inventory.checklist)
                .selectinload(Checklist.player),
                selectinload(AuthSubmission.items)
                .selectinload(AuthSubmissionItem.standalone_item),
            )
            .where(AuthSubmission.id == submission_id)
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_submission(
        self,
        company_id: UUID,
        date_submitted: date,
        items: List[Dict],
        service_level_id: Optional[UUID] = None,
        submission_number: Optional[str] = None,
        reference_number: Optional[str] = None,
        shipping_to_cost: Decimal = Decimal("0"),
        shipping_to_tracking: Optional[str] = None,
        insurance_cost: Decimal = Decimal("0"),
        notes: Optional[str] = None,
    ) -> AuthSubmission:
        """Create a new authentication submission."""
        
        # Calculate totals
        total_declared = sum(Decimal(str(i.get("declared_value", 0))) for i in items)
        total_fees = sum(Decimal(str(i.get("fee_per_item", 0) or 0)) for i in items)
        
        # Create submission
        submission = AuthSubmission(
            company_id=company_id,
            service_level_id=service_level_id,
            submission_number=submission_number,
            reference_number=reference_number,
            date_submitted=date_submitted,
            status="pending",
            authentication_fee=total_fees,
            shipping_to_cost=shipping_to_cost,
            shipping_to_tracking=shipping_to_tracking,
            insurance_cost=insurance_cost,
            total_items=len(items),
            total_declared_value=total_declared,
            notes=notes,
        )
        self.db.add(submission)
        await self.db.flush()
        
        # Create items
        for idx, item_data in enumerate(items, 1):
            item_type = item_data.get("item_type", "card")
            
            item = AuthSubmissionItem(
                submission_id=submission.id,
                item_type=item_type,
                inventory_id=item_data.get("inventory_id") if item_type == "card" else None,
                standalone_item_id=item_data.get("standalone_item_id") if item_type in ("memorabilia", "collectible") else None,
                line_number=idx,
                description=item_data.get("description"),
                signer_name=item_data.get("signer_name"),
                declared_value=Decimal(str(item_data.get("declared_value", 0))),
                fee_per_item=item_data.get("fee_per_item"),
                status="pending",
            )
            self.db.add(item)
            
            # For cards, remove from inventory
            if item_type == "card" and item_data.get("inventory_id"):
                inventory = await self.db.get(Inventory, item_data["inventory_id"])
                if inventory and inventory.quantity > 0:
                    inventory.quantity -= 1
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission

    async def update_status(
        self,
        submission_id: UUID,
        status: str,
        date_shipped: Optional[date] = None,
        date_received: Optional[date] = None,
        date_completed: Optional[date] = None,
        date_shipped_back: Optional[date] = None,
        date_returned: Optional[date] = None,
        shipping_to_tracking: Optional[str] = None,
        shipping_return_tracking: Optional[str] = None,
    ) -> AuthSubmission:
        """Update submission status and tracking info."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        
        submission.status = status
        
        if date_shipped is not None:
            submission.date_shipped = date_shipped
        if date_received is not None:
            submission.date_received = date_received
        if date_completed is not None:
            submission.date_completed = date_completed
        if date_shipped_back is not None:
            submission.date_shipped_back = date_shipped_back
        if date_returned is not None:
            submission.date_returned = date_returned
        if shipping_to_tracking is not None:
            submission.shipping_to_tracking = shipping_to_tracking
        if shipping_return_tracking is not None:
            submission.shipping_return_tracking = shipping_return_tracking
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission

    async def process_results(
        self,
        submission_id: UUID,
        item_results: List[Dict],
        date_returned: Optional[date] = None,
        shipping_return_cost: Decimal = Decimal("0"),
    ) -> AuthSubmission:
        """Process authentication results when submission returns."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        
        items_authenticated = 0
        
        for result in item_results:
            item_id = result.get("item_id")
            item = next((i for i in submission.items if str(i.id) == str(item_id)), None)
            
            if not item:
                continue
            
            item.status = result.get("status", "authentic")
            item.cert_number = result.get("cert_number")
            item.sticker_number = result.get("sticker_number")
            item.letter_number = result.get("letter_number")
            item.notes = result.get("notes")
            
            if item.status == "authentic":
                items_authenticated += 1
                
                # For cards, update inventory to mark as authenticated
                if item.item_type == "card" and item.inventory_id:
                    inventory = await self.db.get(Inventory, item.inventory_id)
                    if inventory:
                        # Create authenticated inventory record
                        new_inv = Inventory(
                            checklist_id=inventory.checklist_id,
                            quantity=1,
                            condition=inventory.condition,
                            is_signed=True,
                            auth_company=submission.company.code if submission.company else None,
                            auth_cert_number=item.cert_number or item.sticker_number,
                        )
                        self.db.add(new_inv)
                
                # For standalone items, update authentication fields
                if item.standalone_item_id:
                    standalone = await self.db.get(StandaloneItem, item.standalone_item_id)
                    if standalone:
                        standalone.is_authenticated = True
                        standalone.authenticator = submission.company.code if submission.company else None
                        standalone.auth_cert_number = item.cert_number or item.sticker_number
        
        submission.items_authenticated = items_authenticated
        submission.status = "returned"
        submission.date_returned = date_returned
        submission.shipping_return_cost = shipping_return_cost
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission

    async def delete_submission(self, submission_id: UUID) -> bool:
        """Delete a submission (only if pending)."""
        submission = await self.get_submission(submission_id)
        if not submission:
            return False
        
        if submission.status != "pending":
            raise ValueError("Can only delete pending submissions")
        
        # Restore inventory for card items
        for item in submission.items:
            if item.item_type == "card" and item.inventory_id:
                inventory = await self.db.get(Inventory, item.inventory_id)
                if inventory:
                    inventory.quantity += 1
        
        await self.db.delete(submission)
        await self.db.flush()
        return True

    # ============================================
    # STATISTICS
    # ============================================

    async def get_stats(self) -> Dict:
        """Get authentication statistics."""
        # Pending submissions
        pending_query = select(func.count(AuthSubmission.id)).where(
            AuthSubmission.status.in_(["pending", "shipped", "received", "processing"])
        )
        pending_result = await self.db.execute(pending_query)
        pending_count = pending_result.scalar() or 0
        
        # Items out for auth
        items_out_query = select(func.sum(AuthSubmission.total_items)).where(
            AuthSubmission.status.in_(["pending", "shipped", "received", "processing"])
        )
        items_out_result = await self.db.execute(items_out_query)
        items_out = items_out_result.scalar() or 0
        
        # Pending fees
        fees_query = select(
            func.sum(
                AuthSubmission.authentication_fee + 
                AuthSubmission.shipping_to_cost + 
                AuthSubmission.insurance_cost
            )
        ).where(
            AuthSubmission.status.in_(["pending", "shipped", "received", "processing"])
        )
        fees_result = await self.db.execute(fees_query)
        pending_fees = fees_result.scalar() or Decimal("0")
        
        # Total authenticated
        auth_query = select(func.sum(AuthSubmission.items_authenticated))
        auth_result = await self.db.execute(auth_query)
        total_authenticated = auth_result.scalar() or 0
        
        # Items by type
        type_query = (
            select(AuthSubmissionItem.item_type, func.count(AuthSubmissionItem.id))
            .where(AuthSubmissionItem.status == "authentic")
            .group_by(AuthSubmissionItem.item_type)
        )
        type_result = await self.db.execute(type_query)
        by_item_type = {row[0]: row[1] for row in type_result.all()}
        
        # By company
        company_query = (
            select(GradingCompany.code, func.count(AuthSubmissionItem.id))
            .join(AuthSubmission, AuthSubmission.id == AuthSubmissionItem.submission_id)
            .join(GradingCompany, GradingCompany.id == AuthSubmission.company_id)
            .where(AuthSubmissionItem.status == "authentic")
            .group_by(GradingCompany.code)
        )
        company_result = await self.db.execute(company_query)
        by_company = {row[0]: row[1] for row in company_result.all()}
        
        # Calculate pass rate
        total_processed_query = select(func.count(AuthSubmissionItem.id)).where(
            AuthSubmissionItem.status.in_(["authentic", "not_authentic", "inconclusive"])
        )
        total_processed_result = await self.db.execute(total_processed_query)
        total_processed = total_processed_result.scalar() or 0
        
        pass_rate = (total_authenticated / total_processed * 100) if total_processed > 0 else 0.0
        
        return {
            "pending_submissions": pending_count,
            "items_out_for_auth": items_out,
            "pending_fees": pending_fees,
            "total_authenticated": total_authenticated,
            "pass_rate": round(pass_rate, 1),
            "by_item_type": by_item_type,
            "by_company": by_company,
        }

    async def get_pending_by_company(self) -> List[Dict]:
        """Get pending auth submissions grouped by company."""
        query = (
            select(
                GradingCompany.id,
                GradingCompany.name,
                GradingCompany.code,
                func.count(AuthSubmission.id).label("pending_count"),
                func.sum(AuthSubmission.total_declared_value).label("pending_value"),
                func.min(AuthSubmission.date_submitted).label("oldest_date"),
            )
            .join(AuthSubmission, AuthSubmission.company_id == GradingCompany.id)
            .where(AuthSubmission.status.in_(["pending", "shipped", "received", "processing"]))
            .group_by(GradingCompany.id, GradingCompany.name, GradingCompany.code)
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        return [
            {
                "company_id": row.id,
                "company_name": row.name,
                "company_code": row.code,
                "pending_count": row.pending_count,
                "pending_value": row.pending_value or Decimal("0"),
                "oldest_submission_date": row.oldest_date,
            }
            for row in rows
        ]

    async def get_items_by_type(
        self,
        item_type: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AuthSubmissionItem]:
        """Get auth items filtered by type (for tabs)."""
        query = (
            select(AuthSubmissionItem)
            .options(
                selectinload(AuthSubmissionItem.submission)
                .selectinload(AuthSubmission.company),
                selectinload(AuthSubmissionItem.inventory)
                .selectinload(Inventory.checklist)
                .selectinload(Checklist.player),
                selectinload(AuthSubmissionItem.standalone_item),
            )
            .where(AuthSubmissionItem.item_type == item_type)
        )
        
        if status:
            query = query.where(AuthSubmissionItem.status == status)
        
        query = query.order_by(AuthSubmissionItem.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()