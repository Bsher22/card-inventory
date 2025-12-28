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
    grading_router,
    beckett_router,
    card_types_router,
)
from app.routes.ebay_routes import router as ebay_router

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
app.include_router(auth_router, prefix="/api", tags=["Authentication"])

# Business routers
app.include_router(products_router, prefix="/api", tags=["Brands & Product Lines"])
app.include_router(checklists_router, prefix="/api", tags=["Checklists & Players"])
app.include_router(inventory_router, prefix="/api", tags=["Inventory"])
app.include_router(financial_router, prefix="/api", tags=["Purchases & Sales"])
app.include_router(consignments_router, prefix="/api", tags=["Consignments"])
app.include_router(grading_router, prefix="/api", tags=["Grading Submissions"])
app.include_router(ebay_router, prefix="/api", tags=["eBay Sales Import"])
app.include_router(beckett_router)  # Beckett Import (has own /api/beckett prefix)
app.include_router(card_types_router)  # Card Types, Parallels & PDF Parsing


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
