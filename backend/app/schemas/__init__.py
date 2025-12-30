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

# Standalone Items (Memorabilia & Collectibles)
from .standalone_items import (
    ItemCategoryCreate,
    ItemCategoryUpdate,
    ItemCategoryResponse,
    StandaloneItemCreate,
    StandaloneItemUpdate,
    StandaloneItemResponse,
    StandaloneItemSummary,
    StandaloneItemFilters,
    SportResponse,
    UnifiedInventoryResponse,
    ITEM_TYPES,
    SPORTS,
    AUTHENTICATORS,
    MEMORABILIA_TYPES,
    COLLECTIBLE_TYPES,
    CONDITIONS,
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

# Grading & Authentication
from .grading import (
    # Shared
    ServiceLevelResponse,
    GradingCompanyResponse,
    GradingCompanyWithLevels,
    # Card Grading (PSA/BGS/SGC)
    CardGradingItemCreate,
    CardGradingItemResponse,
    CardGradingSubmissionCreate,
    CardGradingSubmissionResponse,
    CardGradingStatusUpdate,
    CardGradeResult,
    CardGradingResultsSubmit,
    CardGradingStats,
    PendingByCompany,
    # Signature Authentication (PSA/DNA, JSA)
    AuthItemCreate,
    AuthItemResponse,
    AuthSubmissionCreate,
    AuthSubmissionResponse,
    AuthStatusUpdate,
    AuthResult,
    AuthResultsSubmit,
    AuthStats,
    AuthPendingByCompany,
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

# eBay
from .ebay import (
    # Listing Generation
    EbayItemSpecifics,
    EbayListingData,
    EbayListingRequest,
    EbayListingResponse,
    # Sales Import
    EbayListingPreview,
    EbayUploadPreviewResponse,
    EbayListingCreate,
    EbayImportRequest,
    EbayImportResponse,
    EbayListingSaleRead,
    EbayImportBatchRead,
    EbayImportBatchDetail,
    EbaySalesAnalytics,
)

# Authentication (User Auth - JWT/Passwords)
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
    # Standalone Items
    "ItemCategoryCreate",
    "ItemCategoryUpdate",
    "ItemCategoryResponse",
    "StandaloneItemCreate",
    "StandaloneItemUpdate",
    "StandaloneItemResponse",
    "StandaloneItemSummary",
    "StandaloneItemFilters",
    "SportResponse",
    "UnifiedInventoryResponse",
    "ITEM_TYPES",
    "SPORTS",
    "AUTHENTICATORS",
    "MEMORABILIA_TYPES",
    "COLLECTIBLE_TYPES",
    "CONDITIONS",
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
    # Grading & Authentication - Shared
    "ServiceLevelResponse",
    "GradingCompanyResponse",
    "GradingCompanyWithLevels",
    # Grading - Card Grading (PSA/BGS/SGC)
    "CardGradingItemCreate",
    "CardGradingItemResponse",
    "CardGradingSubmissionCreate",
    "CardGradingSubmissionResponse",
    "CardGradingStatusUpdate",
    "CardGradeResult",
    "CardGradingResultsSubmit",
    "CardGradingStats",
    "PendingByCompany",
    # Grading - Signature Auth (PSA/DNA, JSA)
    "AuthItemCreate",
    "AuthItemResponse",
    "AuthSubmissionCreate",
    "AuthSubmissionResponse",
    "AuthStatusUpdate",
    "AuthResult",
    "AuthResultsSubmit",
    "AuthStats",
    "AuthPendingByCompany",
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
    # eBay - Listing Generation
    "EbayItemSpecifics",
    "EbayListingData",
    "EbayListingRequest",
    "EbayListingResponse",
    # eBay - Sales Import
    "EbayListingPreview",
    "EbayUploadPreviewResponse",
    "EbayListingCreate",
    "EbayImportRequest",
    "EbayImportResponse",
    "EbayListingSaleRead",
    "EbayImportBatchRead",
    "EbayImportBatchDetail",
    "EbaySalesAnalytics",
    # User Authentication
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