from app.routes.products import router as products_router
from app.routes.checklists import router as checklists_router
from app.routes.inventory import router as inventory_router
from app.routes.financial import router as financial_router
from app.routes.consignments import router as consignments_router
from app.routes.grading import router as grading_router

__all__ = [
    "products_router",
    "checklists_router", 
    "inventory_router",
    "financial_router",
    "consignments_router",
    "grading_router",
]
