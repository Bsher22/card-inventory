"""
Schemas Package - Barrel Exports
================================

All Pydantic schemas exported from a single location.

Usage:
    from app.schemas import BrandCreate, ProductLineResponse, ChecklistFilters, Token
"""

from .base import BaseSchema, PaginatedResponse, MessageResponse

# Products
from .products import (
    BrandBase,
    BrandCreate,
    BrandUpdate,
    BrandResponse,
    BrandWithProducts,
    ProductLineBase,
    ProductLineCreate,
    ProductLineUpdate,
    ProductLineResponse,
    ProductLineWithBrand,
    ProductLineSummary,
)

# Players
from .players import (
    PlayerBase,
    PlayerCreate,
    PlayerUpdate,
    PlayerResponse,
    PlayerInventorySummary,
)

# Checklists
from .checklists import (
    ChecklistBase,
    ChecklistCreate,
    ChecklistUpdate,
    ChecklistResponse,
    ChecklistWithDetails,
    ChecklistFilters,
    ChecklistUploadPreview,
    ChecklistUploadResult,
    ChecklistImportPreview,
)

# Inventory
from .inventory import (
    InventoryBase,
    InventoryCreate,
    InventoryUpdate,
    InventoryResponse,
    InventoryWithDetails,
    InventoryWithCard,
    InventoryAdjust,
    InventoryFilter,
    InventoryBulkCreate,
    BulkInventoryResult,
    InventorySummary,
    InventoryAnalytics,
)

# Consignments
from .consignments import (
    ConsignerBase,
    ConsignerCreate,
    ConsignerUpdate,
    ConsignerResponse,
    ConsignerStats,
    ConsignmentItemBase,
    ConsignmentItemCreate,
    ConsignmentItemResponse,
    ConsignmentBase,
    ConsignmentCreate,
    ConsignmentResponse,
    ConsignmentReturn,
    PendingConsignmentsValue,
)

# Grading
from .grading import (
    GradingCompanyBase,
    GradingCompanyCreate,
    GradingCompanyResponse,
    GradingCompanyWithLevels,
    GradingServiceLevelBase,
    GradingServiceLevelCreate,
    GradingServiceLevelResponse,
    GradingSubmissionItemBase,
    GradingSubmissionItemCreate,
    GradingSubmissionItemResponse,
    GradingSubmissionItemUpdate,
    GradingSubmissionBase,
    GradingSubmissionCreate,
    SubmissionCreate,
    GradingSubmissionResponse,
    SubmissionGradeResults,
    GradingStats,
    PendingByCompany,
)

# Financial
from .financial import (
    PurchaseItemBase,
    PurchaseItemCreate,
    PurchaseItemResponse,
    PurchaseBase,
    PurchaseCreate,
    PurchaseResponse,
    SaleItemBase,
    SaleItemCreate,
    SaleItemResponse,
    SaleBase,
    SaleCreate,
    SaleResponse,
    DashboardStats,
    SalesAnalytics,
    PurchaseAnalytics,
    PlayerSummary,
)

# Beckett
from .beckett import (
    BeckettParsedCard,
    BeckettImportPreview,
    BeckettImportRequest,
    BeckettImportResponse,
    BeckettProductInfo,
    BeckettScrapeResult,
)

# Card Types
from .card_types import (
    CardBaseTypeCreate,
    CardBaseTypeUpdate,
    CardBaseTypeResponse,
    CardBaseTypeWithCounts,
    ParallelCategoryCreate,
    ParallelCategoryUpdate,
    ParallelCategoryResponse,
    ParallelCategoryWithParallels,
    ParallelCreate,
    ParallelUpdate,
    ParallelResponse,
    ParallelWithCategory,
    ParallelWithInventoryCount,
    CardPrefixMappingCreate,
    CardPrefixMappingResponse,
    ParallelFilter,
)

# Authentication
from .auth import (
    Token,
    TokenData,
    LoginRequest,
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
    SetupRequest,
)


__all__ = [
    # Base
    "BaseSchema",
    "PaginatedResponse",
    "MessageResponse",
    # Products
    "BrandBase",
    "BrandCreate",
    "BrandUpdate",
    "BrandResponse",
    "BrandWithProducts",
    "ProductLineBase",
    "ProductLineCreate",
    "ProductLineUpdate",
    "ProductLineResponse",
    "ProductLineWithBrand",
    "ProductLineSummary",
    # Players
    "PlayerBase",
    "PlayerCreate",
    "PlayerUpdate",
    "PlayerResponse",
    "PlayerInventorySummary",
    # Checklists
    "ChecklistBase",
    "ChecklistCreate",
    "ChecklistUpdate",
    "ChecklistResponse",
    "ChecklistWithDetails",
    "ChecklistFilters",
    "ChecklistUploadPreview",
    "ChecklistUploadResult",
    "ChecklistImportPreview",
    # Inventory
    "InventoryBase",
    "InventoryCreate",
    "InventoryUpdate",
    "InventoryResponse",
    "InventoryWithDetails",
    "InventoryWithCard",
    "InventoryAdjust",
    "InventoryFilter",
    "InventoryBulkCreate",
    "BulkInventoryResult",
    "InventorySummary",
    "InventoryAnalytics",
    # Consignments
    "ConsignerBase",
    "ConsignerCreate",
    "ConsignerUpdate",
    "ConsignerResponse",
    "ConsignerStats",
    "ConsignmentItemBase",
    "ConsignmentItemCreate",
    "ConsignmentItemResponse",
    "ConsignmentBase",
    "ConsignmentCreate",
    "ConsignmentResponse",
    "ConsignmentReturn",
    "PendingConsignmentsValue",
    # Grading
    "GradingCompanyBase",
    "GradingCompanyCreate",
    "GradingCompanyResponse",
    "GradingCompanyWithLevels",
    "GradingServiceLevelBase",
    "GradingServiceLevelCreate",
    "GradingServiceLevelResponse",
    "GradingSubmissionItemBase",
    "GradingSubmissionItemCreate",
    "GradingSubmissionItemResponse",
    "GradingSubmissionItemUpdate",
    "GradingSubmissionBase",
    "GradingSubmissionCreate",
    "SubmissionCreate",
    "GradingSubmissionResponse",
    "SubmissionGradeResults",
    "GradingStats",
    "PendingByCompany",
    # Financial
    "PurchaseItemBase",
    "PurchaseItemCreate",
    "PurchaseItemResponse",
    "PurchaseBase",
    "PurchaseCreate",
    "PurchaseResponse",
    "SaleItemBase",
    "SaleItemCreate",
    "SaleItemResponse",
    "SaleBase",
    "SaleCreate",
    "SaleResponse",
    "DashboardStats",
    "SalesAnalytics",
    "PurchaseAnalytics",
    "PlayerSummary",
    # Beckett
    "BeckettParsedCard",
    "BeckettImportPreview",
    "BeckettImportRequest",
    "BeckettImportResponse",
    "BeckettProductInfo",
    "BeckettScrapeResult",
    # Card Types
    "CardBaseTypeCreate",
    "CardBaseTypeUpdate",
    "CardBaseTypeResponse",
    "CardBaseTypeWithCounts",
    "ParallelCategoryCreate",
    "ParallelCategoryUpdate",
    "ParallelCategoryResponse",
    "ParallelCategoryWithParallels",
    "ParallelCreate",
    "ParallelUpdate",
    "ParallelResponse",
    "ParallelWithCategory",
    "ParallelWithInventoryCount",
    "CardPrefixMappingCreate",
    "CardPrefixMappingResponse",
    "ParallelFilter",
    # Authentication
    "Token",
    "TokenData",
    "LoginRequest",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    "SetupRequest",
]
