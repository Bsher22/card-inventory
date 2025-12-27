"""
Models Package - Barrel Exports
===============================

All SQLAlchemy models exported from a single location.

Usage:
    from app.models import Brand, ProductLine, Checklist, Inventory
"""

from .base import Base

# Products
from .products import Brand, ProductLine

# Players
from .players import Player

# Checklists
from .checklists import CardType, Checklist

# Inventory
from .inventory import Inventory

# Consignments
from .consignments import Consigner, Consignment, ConsignmentItem

# Grading
from .grading import (
    GradingCompany,
    GradingServiceLevel,
    GradingSubmission,
    GradingSubmissionItem,
)

# Financial
from .financial import Purchase, PurchaseItem, Sale, SaleItem

# Card Types
from .card_types import (
    CardBaseType,
    ParallelCategory,
    Parallel,
    CardPrefixMapping,
)


__all__ = [
    # Base
    "Base",
    # Products
    "Brand",
    "ProductLine",
    # Players
    "Player",
    # Checklists
    "CardType",
    "Checklist",
    # Inventory
    "Inventory",
    # Consignments
    "Consigner",
    "Consignment",
    "ConsignmentItem",
    # Grading
    "GradingCompany",
    "GradingServiceLevel",
    "GradingSubmission",
    "GradingSubmissionItem",
    # Financial
    "Purchase",
    "PurchaseItem",
    "Sale",
    "SaleItem",
    # Card Types
    "CardBaseType",
    "ParallelCategory",
    "Parallel",
    "CardPrefixMapping",
]
