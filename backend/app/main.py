"""
Card Inventory Management System - Main Application

FastAPI backend for managing baseball card inventory, checklists,
purchases, and sales with analytics and authentication.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import (
    auth_router,
    products_router,
    checklists_router,
    inventory_router,
    financial_router,
    consignments_router,
    beckett_router,
    card_types_router,
    standalone_items_router,
)
# Grading & Authentication routes
from app.routes.card_grading import router as card_grading_router
from app.routes.signature_auth import router as signature_auth_router

# Submitters route
from app.routes.submitters import router as submitters_router

# eBay routes - two separate routers for different functionality
from app.routes.ebay_routes import router as ebay_import_router  # Sales import
from app.routes.ebay import router as ebay_listing_router  # Listing generation

# Consigner Player Pricing
from app.routes.consigner_player_price import router as consigner_pricing_router

# Bulk Import
from app.routes.bulk_import import router as bulk_import_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="Baseball card inventory management system with checklist uploads, "
                "inventory tracking, sales analytics, and user authentication.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Auth router FIRST (for /api/auth/* endpoints)
app.include_router(auth_router, prefix="/api", tags=["User Authentication"])

# Business routers
app.include_router(products_router, prefix="/api", tags=["Brands & Product Lines"])
app.include_router(checklists_router, prefix="/api", tags=["Checklists & Players"])
app.include_router(inventory_router, prefix="/api", tags=["Inventory"])
app.include_router(standalone_items_router, prefix="/api", tags=["Standalone Items"])
app.include_router(financial_router, prefix="/api", tags=["Purchases & Sales"])
app.include_router(consignments_router, prefix="/api", tags=["Consignments"])
app.include_router(consigner_pricing_router, prefix="/api", tags=["Consigner Pricing"])

# Submitters router (third-party grading/auth services)
app.include_router(submitters_router, prefix="/api", tags=["Submitters"])

# Grading & Authentication routers
app.include_router(card_grading_router, prefix="/api", tags=["Card Grading (PSA/BGS/SGC)"])
app.include_router(signature_auth_router, prefix="/api", tags=["Signature Authentication (PSA-DNA/JSA)"])

# eBay routers
app.include_router(ebay_import_router, prefix="/api", tags=["eBay Sales Import"])
app.include_router(ebay_listing_router, prefix="/api", tags=["eBay Listing Generation"])

app.include_router(beckett_router)  # Beckett Import (has own /api/beckett prefix)
app.include_router(card_types_router)  # Card Types, Parallels & PDF Parsing
app.include_router(bulk_import_router, prefix="/api", tags=["Bulk Import"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )