"""
Routes barrel export.

Provides clean imports for main.py:
    from app.routes import products_router, checklists_router, auth_router, ...
"""

from app.routes.products import router as products_router
from app.routes.checklists import router as checklists_router
from app.routes.inventory import router as inventory_router
from app.routes.financial import router as financial_router
from app.routes.consignments import router as consignments_router
from app.routes.grading import router as grading_router
from app.routes.beckett import router as beckett_router
from app.routes.card_types import router as card_types_router
from app.routes.auth import router as auth_router

__all__ = [
    "products_router",
    "checklists_router", 
    "inventory_router",
    "financial_router",
    "consignments_router",
    "grading_router",
    "beckett_router",
    "card_types_router",
    "auth_router",
]
