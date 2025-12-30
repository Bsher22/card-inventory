"""
Models Package - Barrel Exports
===============================

All SQLAlchemy models exported from a single location.

Usage:
    from app.models import Brand, ProductLine, Checklist, Inventory, User
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

# Standalone Items (Memorabilia & Collectibles)
from .standalone_items import ItemCategory, StandaloneItem, Sport

# Consignments
from .consignments import Consigner, Consignment, ConsignmentItem

# Grading & Authentication
from .grading import (
    GradingCompany,
    GradingServiceLevel,
    # Card Grading (PSA/BGS/SGC numeric grades)
    CardGradingSubmission,
    CardGradingItem,
    # Signature Authentication (PSA/DNA, JSA)
    AuthSubmission,
    AuthSubmissionItem,
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

# eBay
from .ebay import EbayImportBatch, EbayListingSale

# Authentication
from .users import User


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
    # Standalone Items
    "ItemCategory",
    "StandaloneItem",
    "Sport",
    # Consignments
    "Consigner",
    "Consignment",
    "ConsignmentItem",
    # Grading & Authentication
    "GradingCompany",
    "GradingServiceLevel",
    "CardGradingSubmission",
    "CardGradingItem",
    "AuthSubmission",
    "AuthSubmissionItem",
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
    # eBay
    "EbayImportBatch",
    "EbayListingSale",
    # Authentication
    "User",
]