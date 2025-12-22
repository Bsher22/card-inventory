"""
Grading Submission Service

Handles grading submissions to PSA, BGS, SGC, etc:
- Managing grading companies and service levels
- Creating and tracking submissions
- Processing graded cards when returned
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
    GradingCompany, GradingServiceLevel, GradingSubmission, 
    GradingSubmissionItem, Inventory, Checklist
)


class GradingService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==========================================
    # GRADING COMPANY OPERATIONS
    # ==========================================
    
    async def get_grading_companies(
        self,
        active_only: bool = True,
    ) -> list[GradingCompany]:
        """Get all grading companies."""
        query = (
            select(GradingCompany)
            .options(selectinload(GradingCompany.service_levels))
        )
        
        if active_only:
            query = query.where(GradingCompany.is_active == True)
        
        query = query.order_by(GradingCompany.name)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_service_levels(
        self,
        grading_company_id: UUID,
        active_only: bool = True,
    ) -> list[GradingServiceLevel]:
        """Get service levels for a grading company."""
        query = select(GradingServiceLevel).where(
            GradingServiceLevel.grading_company_id == grading_company_id
        )
        
        if active_only:
            query = query.where(GradingServiceLevel.is_active == True)
        
        query = query.order_by(GradingServiceLevel.base_fee)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    # ==========================================
    # SUBMISSION OPERATIONS
    # ==========================================
    
    async def get_submissions(
        self,
        grading_company_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[GradingSubmission]:
        """Get submissions with optional filters."""
        query = (
            select(GradingSubmission)
            .options(
                selectinload(GradingSubmission.grading_company),
                selectinload(GradingSubmission.service_level),
                selectinload(GradingSubmission.items),
            )
        )
        
        if grading_company_id:
            query = query.where(GradingSubmission.grading_company_id == grading_company_id)
        
        if status:
            query = query.where(GradingSubmission.status == status)
        
        query = query.order_by(GradingSubmission.date_submitted.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_submission(self, submission_id: UUID) -> Optional[GradingSubmission]:
        """Get a single submission with items."""
        result = await self.db.execute(
            select(GradingSubmission)
            .options(
                selectinload(GradingSubmission.grading_company),
                selectinload(GradingSubmission.service_level),
                selectinload(GradingSubmission.items)
                .selectinload(GradingSubmissionItem.checklist)
                .selectinload(Checklist.player),
            )
            .where(GradingSubmission.id == submission_id)
        )
        return result.scalar_one_or_none()
    
    async def create_submission(
        self,
        grading_company_id: UUID,
        date_submitted: date,
        items: list[dict],  # [{checklist_id, declared_value, fee_per_card?, source_inventory_id?, was_signed?}]
        service_level_id: Optional[UUID] = None,
        submission_number: Optional[str] = None,
        reference_number: Optional[str] = None,
        shipping_to_cost: Decimal = Decimal("0"),
        shipping_to_tracking: Optional[str] = None,
        insurance_cost: Decimal = Decimal("0"),
        notes: Optional[str] = None,
    ) -> GradingSubmission:
        """
        Create a new grading submission and remove cards from inventory.
        
        Takes raw cards → out for grading status.
        """
        # Verify grading company exists
        grading_company = await self.db.get(GradingCompany, grading_company_id)
        if not grading_company:
            raise ValueError(f"Grading company not found: {grading_company_id}")
        
        # Get service level for fee calculation
        service_level = None
        if service_level_id:
            service_level = await self.db.get(GradingServiceLevel, service_level_id)
        
        # Calculate fees
        total_declared = Decimal("0")
        grading_fee = Decimal("0")
        
        for item in items:
            declared_value = Decimal(str(item.get("declared_value", 0)))
            total_declared += declared_value
            
            fee = item.get("fee_per_card")
            if fee is None and service_level:
                fee = service_level.base_fee
            grading_fee += Decimal(str(fee or 0))
        
        # Create submission
        submission = GradingSubmission(
            grading_company_id=grading_company_id,
            service_level_id=service_level_id,
            submission_number=submission_number,
            reference_number=reference_number,
            date_submitted=date_submitted,
            status="preparing",
            total_declared_value=total_declared,
            grading_fee=grading_fee,
            shipping_to_cost=shipping_to_cost,
            shipping_to_tracking=shipping_to_tracking,
            insurance_cost=insurance_cost,
            total_cards=len(items),
            notes=notes,
        )
        self.db.add(submission)
        await self.db.flush()
        
        # Create submission items and adjust inventory
        for idx, item_data in enumerate(items, start=1):
            checklist_id = item_data["checklist_id"]
            declared_value = Decimal(str(item_data.get("declared_value", 0)))
            was_signed = item_data.get("was_signed", False)
            source_inventory_id = item_data.get("source_inventory_id")
            
            fee = item_data.get("fee_per_card")
            if fee is None and service_level:
                fee = service_level.base_fee
            fee = Decimal(str(fee or 0))
            
            # Find source inventory (raw, potentially signed)
            if source_inventory_id:
                source_inv = await self.db.get(Inventory, source_inventory_id)
            else:
                # Find raw inventory matching signed status
                result = await self.db.execute(
                    select(Inventory).where(
                        and_(
                            Inventory.checklist_id == checklist_id,
                            Inventory.is_signed == was_signed,
                            Inventory.is_slabbed == False,
                            Inventory.quantity >= 1,
                        )
                    )
                )
                source_inv = result.scalar_one_or_none()
            
            if not source_inv or source_inv.quantity < 1:
                raise ValueError(
                    f"No raw inventory available for checklist {checklist_id}"
                )
            
            # Decrement source inventory
            source_inv.quantity -= 1
            
            # Create submission item
            item = GradingSubmissionItem(
                submission_id=submission.id,
                checklist_id=checklist_id,
                source_inventory_id=source_inv.id,
                line_number=idx,
                declared_value=declared_value,
                fee_per_card=fee,
                was_signed=was_signed or source_inv.is_signed,
                status="pending",
            )
            self.db.add(item)
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission
    
    async def update_submission_status(
        self,
        submission_id: UUID,
        status: str,
        date_received: Optional[date] = None,
        date_graded: Optional[date] = None,
        date_shipped_back: Optional[date] = None,
        shipping_return_tracking: Optional[str] = None,
    ) -> GradingSubmission:
        """Update submission tracking status."""
        submission = await self.db.get(GradingSubmission, submission_id)
        if not submission:
            raise ValueError(f"Submission not found: {submission_id}")
        
        submission.status = status
        
        if date_received:
            submission.date_received = date_received
        if date_graded:
            submission.date_graded = date_graded
        if date_shipped_back:
            submission.date_shipped_back = date_shipped_back
        if shipping_return_tracking:
            submission.shipping_return_tracking = shipping_return_tracking
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission
    
    async def process_graded_items(
        self,
        submission_id: UUID,
        item_results: list[dict],  # [{item_id, status, grade_value?, auto_grade?, cert_number?, label_type?}]
        date_returned: Optional[date] = None,
        shipping_return_cost: Decimal = Decimal("0"),
    ) -> GradingSubmission:
        """
        Process graded items when submission returns.
        
        For graded items: Creates new slabbed inventory, adds fee to cost.
        For ungradeable items: Returns to original raw inventory.
        """
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError(f"Submission not found: {submission_id}")
        
        grading_company = submission.grading_company
        cards_graded = 0
        
        for result in item_results:
            item_id = result["item_id"]
            status = result["status"]  # 'graded', 'authentic', 'altered', 'counterfeit', 'ungradeable', 'lost'
            
            # Find the item
            item = next((i for i in submission.items if str(i.id) == str(item_id)), None)
            if not item:
                continue
            
            item.status = status
            item.notes = result.get("notes")
            
            if status == "graded":
                grade_value = Decimal(str(result.get("grade_value", 0)))
                auto_grade = result.get("auto_grade")
                if auto_grade:
                    auto_grade = Decimal(str(auto_grade))
                
                item.grade_value = grade_value
                item.auto_grade = auto_grade
                item.cert_number = result.get("cert_number")
                item.label_type = result.get("label_type", "standard")
                
                cards_graded += 1
                
                # Create slabbed inventory
                target_inv = await self._get_or_create_inventory(
                    checklist_id=item.checklist_id,
                    is_signed=item.was_signed,
                    is_slabbed=True,
                    grade_company=grading_company.code,
                    grade_value=grade_value,
                    auto_grade=auto_grade,
                    cert_number=item.cert_number,
                )
                
                target_inv.quantity += 1
                
                # Add costs (original cost + grading fee)
                original_cost = item.source_inventory.total_cost if item.source_inventory else 0
                target_inv.total_cost += original_cost + (item.fee_per_card or 0)
                
                item.target_inventory_id = target_inv.id
                
            elif status == "authentic":
                # Authenticated but not graded numerically
                item.cert_number = result.get("cert_number")
                item.label_type = "authentic"
                
                # Still creates slabbed inventory but without numeric grade
                target_inv = await self._get_or_create_inventory(
                    checklist_id=item.checklist_id,
                    is_signed=item.was_signed,
                    is_slabbed=True,
                    grade_company=grading_company.code,
                    grade_value=None,  # Authentic only
                )
                
                target_inv.quantity += 1
                original_cost = item.source_inventory.total_cost if item.source_inventory else 0
                target_inv.total_cost += original_cost + (item.fee_per_card or 0)
                
                item.target_inventory_id = target_inv.id
                
            elif status == "ungradeable":
                # Return to source inventory
                if item.source_inventory:
                    item.source_inventory.quantity += 1
            
            # For 'altered', 'counterfeit', 'lost' - cards are effectively gone or worthless
        
        # Update submission
        submission.status = "complete"
        submission.date_returned = date_returned or date.today()
        submission.shipping_return_cost = shipping_return_cost
        submission.cards_graded = cards_graded
        
        await self.db.flush()
        await self.db.refresh(submission)
        return submission
    
    async def _get_or_create_inventory(
        self,
        checklist_id: UUID,
        is_signed: bool,
        is_slabbed: bool,
        grade_company: Optional[str] = None,
        grade_value: Optional[Decimal] = None,
        auto_grade: Optional[Decimal] = None,
        cert_number: Optional[str] = None,
        raw_condition: str = "NM",
    ) -> Inventory:
        """Get existing inventory or create new one."""
        query = select(Inventory).where(
            and_(
                Inventory.checklist_id == checklist_id,
                Inventory.is_signed == is_signed,
                Inventory.is_slabbed == is_slabbed,
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
                grade_company=grade_company,
                grade_value=grade_value,
                auto_grade=auto_grade,
                cert_number=cert_number,
                raw_condition=raw_condition,
                total_cost=Decimal("0"),
            )
            self.db.add(inventory)
            await self.db.flush()
        
        return inventory
    
    # ==========================================
    # ANALYTICS
    # ==========================================
    
    async def get_submission_stats(self) -> dict:
        """Get overall grading submission statistics."""
        # Pending submissions
        pending_query = (
            select(
                func.count(GradingSubmission.id).label("count"),
                func.sum(GradingSubmission.total_cards).label("cards"),
                func.sum(GradingSubmission.grading_fee).label("fees"),
            )
            .where(GradingSubmission.status.in_(["preparing", "shipped", "received", "grading"]))
        )
        
        # Grade distribution
        grade_query = (
            select(
                GradingSubmissionItem.grade_value,
                func.count(GradingSubmissionItem.id).label("count"),
            )
            .where(GradingSubmissionItem.status == "graded")
            .group_by(GradingSubmissionItem.grade_value)
        )
        
        pending_result = await self.db.execute(pending_query)
        grade_result = await self.db.execute(grade_query)
        
        pending = pending_result.one()
        grades = {str(row.grade_value): row.count for row in grade_result.all()}
        
        # Calculate gem rate (PSA 10 / total graded)
        total_graded = sum(grades.values())
        gem_count = grades.get("10", 0) + grades.get("10.0", 0)
        
        return {
            "pending_submissions": pending.count or 0,
            "cards_out_for_grading": pending.cards or 0,
            "pending_fees": pending.fees or Decimal("0"),
            "grade_distribution": grades,
            "total_graded": total_graded,
            "gem_rate": round((gem_count / total_graded * 100), 1) if total_graded > 0 else 0,
        }
    
    async def get_pending_by_company(self) -> list[dict]:
        """Get pending submissions grouped by grading company."""
        query = (
            select(
                GradingCompany.name,
                GradingCompany.code,
                func.count(GradingSubmission.id).label("submissions"),
                func.sum(GradingSubmission.total_cards).label("cards"),
            )
            .select_from(GradingSubmission)
            .join(GradingCompany)
            .where(GradingSubmission.status.in_(["preparing", "shipped", "received", "grading"]))
            .group_by(GradingCompany.name, GradingCompany.code)
        )
        
        result = await self.db.execute(query)
        return [
            {
                "company": row.name,
                "code": row.code,
                "pending_submissions": row.submissions,
                "cards_out": row.cards or 0,
            }
            for row in result.all()
        ]
