"""
Card Grading Service

Handles business logic for PSA/BGS/SGC card grading submissions.
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
    CardGradingSubmission, CardGradingItem
)
from app.models.inventory import Inventory
from app.models.checklists import Checklist


class CardGradingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # COMPANY & SERVICE LEVEL METHODS
    # ============================================

    async def get_grading_companies(
        self,
        active_only: bool = True,
        service_type: Optional[str] = None,
    ) -> List[GradingCompany]:
        """Get grading companies with their service levels."""
        query = select(GradingCompany).options(
            selectinload(GradingCompany.service_levels)
        )
        
        if active_only:
            query = query.where(GradingCompany.is_active == True)
        
        if service_type:
            query = query.where(
                (GradingCompany.service_type == service_type) |
                (GradingCompany.service_type == "both")
            )
        else:
            # Default to grading companies
            query = query.where(
                (GradingCompany.service_type == "grading") |
                (GradingCompany.service_type == "both")
            )
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_service_levels(
        self,
        company_id: UUID,
        active_only: bool = True,
    ) -> List[GradingServiceLevel]:
        """Get service levels for a company."""
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
        skip: int = 0,
        limit: int = 50,
    ) -> List[CardGradingSubmission]:
        """Get grading submissions with optional filters."""
        query = (
            select(CardGradingSubmission)
            .options(
                selectinload(CardGradingSubmission.company),
                selectinload(CardGradingSubmission.service_level),
                selectinload(CardGradingSubmission.submitter),
                selectinload(CardGradingSubmission.items)
                .selectinload(CardGradingItem.checklist),
            )
        )
        
        if company_id:
            query = query.where(CardGradingSubmission.company_id == company_id)
        
        if status:
            query = query.where(CardGradingSubmission.status == status)
        
        query = query.order_by(CardGradingSubmission.date_submitted.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_submission(self, submission_id: UUID) -> Optional[CardGradingSubmission]:
        """Get a single submission with all details."""
        query = (
            select(CardGradingSubmission)
            .options(
                selectinload(CardGradingSubmission.company),
                selectinload(CardGradingSubmission.service_level),
                selectinload(CardGradingSubmission.submitter),
                selectinload(CardGradingSubmission.items)
                .selectinload(CardGradingItem.checklist)
                .selectinload(Checklist.player),
                selectinload(CardGradingSubmission.items)
                .selectinload(CardGradingItem.checklist)
                .selectinload(Checklist.product_line),
            )
            .where(CardGradingSubmission.id == submission_id)
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_submission(
        self,
        company_id: UUID,
        date_submitted: date,
        items: List[Dict],
        service_level_id: Optional[UUID] = None,
        submitter_id: Optional[UUID] = None,
        submission_number: Optional[str] = None,
        reference_number: Optional[str] = None,
        shipping_to_cost: Decimal = Decimal("0"),
        shipping_to_tracking: Optional[str] = None,
        insurance_cost: Decimal = Decimal("0"),
        notes: Optional[str] = None,
    ) -> CardGradingSubmission:
        """Create a new grading submission."""
        
        # Calculate totals
        total_declared = sum(Decimal(str(i.get("declared_value", 0))) for i in items)
        total_fees = sum(Decimal(str(i.get("fee_per_card", 0) or 0)) for i in items)
        
        # Create submission
        submission = CardGradingSubmission(
            company_id=company_id,
            service_level_id=service_level_id,
            submitter_id=submitter_id,
            submission_number=submission_number,
            reference_number=reference_number,
            date_submitted=date_submitted,
            status="pending",
            grading_fee=total_fees,
            shipping_to_cost=shipping_to_cost,
            shipping_to_tracking=shipping_to_tracking,
            insurance_cost=insurance_cost,
            total_cards=len(items),
            total_declared_value=total_declared,
            notes=notes,
        )
        self.db.add(submission)
        await self.db.flush()
        
        # Create items
        for idx, item_data in enumerate(items, 1):
            item = CardGradingItem(
                submission_id=submission.id,
                inventory_id=item_data.get("inventory_id"),
                checklist_id=item_data.get("checklist_id"),
                line_number=idx,
                declared_value=Decimal(str(item_data.get("declared_value", 0))),
                fee_per_card=item_data.get("fee_per_card"),
                was_signed=item_data.get("was_signed", False),
                status="pending",
            )
            self.db.add(item)
            
            # Remove from inventory if inventory_id provided
            if item_data.get("inventory_id"):
                inventory = await self.db.get(Inventory, item_data["inventory_id"])
                if inventory and inventory.quantity > 0:
                    inventory.quantity -= 1
        
        await self.db.flush()
        
        # Reload with relationships
        return await self.get_submission(submission.id)

    async def update_status(
        self,
        submission_id: UUID,
        status: str,
        date_shipped: Optional[date] = None,
        date_received: Optional[date] = None,
        date_graded: Optional[date] = None,
        date_shipped_back: Optional[date] = None,
        date_returned: Optional[date] = None,
        shipping_to_tracking: Optional[str] = None,
        shipping_return_tracking: Optional[str] = None,
    ) -> CardGradingSubmission:
        """Update submission status and tracking info."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        
        submission.status = status
        
        if date_shipped is not None:
            submission.date_shipped = date_shipped
        if date_received is not None:
            submission.date_received = date_received
        if date_graded is not None:
            submission.date_graded = date_graded
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
    ) -> CardGradingSubmission:
        """Process grading results when submission returns."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        
        cards_graded = 0
        
        for result in item_results:
            item_id = result.get("item_id")
            item = next((i for i in submission.items if str(i.id) == str(item_id)), None)
            
            if not item:
                continue
            
            item.status = result.get("status", "graded")
            item.grade_value = result.get("grade_value")
            item.auto_grade = result.get("auto_grade")
            item.cert_number = result.get("cert_number")
            item.label_type = result.get("label_type")
            item.notes = result.get("notes")
            
            if item.status == "graded":
                cards_graded += 1
                
                # Update inventory - mark as slabbed
                if item.inventory_id:
                    # Create new slabbed inventory record
                    inventory = await self.db.get(Inventory, item.inventory_id)
                    if inventory:
                        new_inv = Inventory(
                            checklist_id=inventory.checklist_id,
                            quantity=1,
                            condition="slabbed",
                            is_slabbed=True,
                            grade_company=submission.company.code if submission.company else None,
                            grade_value=item.grade_value,
                            cert_number=item.cert_number,
                        )
                        self.db.add(new_inv)
        
        submission.cards_graded = cards_graded
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
        
        # Restore inventory for items
        for item in submission.items:
            if item.inventory_id:
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
        """Get grading statistics."""
        # Pending submissions
        pending_query = select(func.count(CardGradingSubmission.id)).where(
            CardGradingSubmission.status.in_(["pending", "shipped", "received", "grading"])
        )
        pending_result = await self.db.execute(pending_query)
        pending_count = pending_result.scalar() or 0
        
        # Cards out for grading
        cards_out_query = select(func.sum(CardGradingSubmission.total_cards)).where(
            CardGradingSubmission.status.in_(["pending", "shipped", "received", "grading"])
        )
        cards_out_result = await self.db.execute(cards_out_query)
        cards_out = cards_out_result.scalar() or 0
        
        # Pending fees
        fees_query = select(
            func.sum(
                CardGradingSubmission.grading_fee + 
                CardGradingSubmission.shipping_to_cost + 
                CardGradingSubmission.insurance_cost
            )
        ).where(
            CardGradingSubmission.status.in_(["pending", "shipped", "received", "grading"])
        )
        fees_result = await self.db.execute(fees_query)
        pending_fees = fees_result.scalar() or Decimal("0")
        
        # Total graded
        graded_query = select(func.sum(CardGradingSubmission.cards_graded))
        graded_result = await self.db.execute(graded_query)
        total_graded = graded_result.scalar() or 0
        
        # Grade distribution
        grade_dist_query = (
            select(CardGradingItem.grade_value, func.count(CardGradingItem.id))
            .where(CardGradingItem.status == "graded")
            .where(CardGradingItem.grade_value.isnot(None))
            .group_by(CardGradingItem.grade_value)
        )
        grade_dist_result = await self.db.execute(grade_dist_query)
        grade_distribution = {str(float(row[0])): row[1] for row in grade_dist_result.all()}
        
        # Calculate gem rate (10s / total graded)
        tens_count = grade_distribution.get("10.0", 0) + grade_distribution.get("10", 0)
        gem_rate = (tens_count / total_graded * 100) if total_graded > 0 else 0.0
        
        # By company breakdown
        by_company_query = (
            select(
                GradingCompany.code,
                func.sum(CardGradingSubmission.cards_graded)
            )
            .join(CardGradingSubmission, CardGradingSubmission.company_id == GradingCompany.id)
            .where(CardGradingSubmission.cards_graded > 0)
            .group_by(GradingCompany.code)
        )
        by_company_result = await self.db.execute(by_company_query)
        by_company = {row[0]: int(row[1] or 0) for row in by_company_result.all()}
        
        return {
            "pending_submissions": pending_count,
            "cards_out_for_grading": cards_out,
            "pending_fees": pending_fees,
            "total_graded": total_graded,
            "grade_distribution": grade_distribution,
            "gem_rate": round(gem_rate, 1),
            "by_company": by_company,
        }

    async def get_pending_by_company(self) -> List[Dict]:
        """Get pending submissions grouped by company."""
        query = (
            select(
                GradingCompany.id,
                GradingCompany.name,
                GradingCompany.code,
                func.count(CardGradingSubmission.id).label("pending_count"),
                func.sum(CardGradingSubmission.total_declared_value).label("pending_value"),
                func.min(CardGradingSubmission.date_submitted).label("oldest_date"),
            )
            .join(CardGradingSubmission, CardGradingSubmission.company_id == GradingCompany.id)
            .where(CardGradingSubmission.status.in_(["pending", "shipped", "received", "grading"]))
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