"""
Inventory Schema Update - Add auth_company field

Add these fields to your inventory schemas in backend/app/schemas/inventory.py
"""

from typing import Literal, Optional

# Define the allowed values as a type
AuthCompany = Literal['PSA/DNA', 'Beckett']


# ============================================
# Add to InventoryCreate class:
# ============================================
    auth_company: Optional[AuthCompany] = None


# ============================================
# Add to InventoryUpdate class:
# ============================================
    auth_company: Optional[AuthCompany] = None


# ============================================
# Add to InventoryResponse class:
# ============================================
    auth_company: Optional[str] = None


# ============================================
# Full example of InventoryCreate with auth_company:
# ============================================
"""
class InventoryCreate(BaseModel):
    checklist_id: UUID
    base_type_id: Optional[UUID] = None
    parallel_id: Optional[UUID] = None
    quantity: int = Field(..., ge=0)
    serial_number: Optional[int] = Field(None, ge=1)
    is_signed: bool = False
    is_slabbed: bool = False
    grade_company: Optional[str] = None
    grade_value: Optional[Decimal] = Field(None, ge=0, le=10)
    auto_grade: Optional[Decimal] = Field(None, ge=0, le=10)
    cert_number: Optional[str] = None
    auth_company: Optional[Literal['PSA/DNA', 'Beckett']] = None  # <-- ADD THIS
    raw_condition: str = "NM"
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    total_cost: Decimal = Field(default=Decimal("0.00"))
"""
