"""
Inventory Model Update - Add auth_company field

Add this field to your Inventory model in backend/app/models/inventory.py
"""

# Add this import if not already present:
# from typing import Optional

# Add this field to the Inventory class, near the other grading fields:

    # Autograph authentication (for signed cards)
    auth_company: Mapped[Optional[str]] = mapped_column(String(20))  # 'PSA/DNA' or 'Beckett'


# The full grading/signing section should look like:
"""
    # Card status
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_slabbed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Grading info (for slabbed cards)
    grade_company: Mapped[Optional[str]] = mapped_column(String(20))  # PSA, BGS, SGC
    grade_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))  # 10, 9.5, 9, etc.
    auto_grade: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))  # Auto grade if separate
    cert_number: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Autograph authentication (for signed cards)
    auth_company: Mapped[Optional[str]] = mapped_column(String(20))  # 'PSA/DNA' or 'Beckett'
"""
