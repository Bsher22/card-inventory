"""
Routes barrel export.

Provides clean imports for main.py:
    from app.routes import products_router, checklists_router, auth_router, ...

Note: card_grading and signature_auth routers are imported directly in main.py
      because they have specialized response formatting.
"""

from app.routes.products import router as products_router
from app.routes.checklists import router as checklists_router
from app.routes.inventory import router as inventory_router
from app.routes.financial import router as financial_router
from app.routes.consignments import router as consignments_router
from app.routes.beckett import router as beckett_router
from app.routes.card_types import router as card_types_router
from app.routes.auth import router as auth_router
from app.routes.standalone_items import router as standalone_items_router

__all__ = [
    "products_router",
    "checklists_router", 
    "inventory_router",
    "financial_router",
    "consignments_router",
    "beckett_router",
    "card_types_router",
    "auth_router",
    "standalone_items_router",
]