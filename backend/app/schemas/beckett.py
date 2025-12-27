"""
Beckett Import Schemas
"""

from typing import Optional, Dict, List

from pydantic import BaseModel


class BeckettParsedCard(BaseModel):
    """A single card parsed from a Beckett XLSX file"""
    set_name: str
    card_number: str
    card_prefix: Optional[str] = None
    card_suffix: Optional[str] = None
    player_name: str
    team: Optional[str] = None
    is_rookie_card: bool = False
    is_autograph: bool = False
    is_relic: bool = False
    is_first_bowman: bool = False
    serial_numbered: Optional[int] = None
    notes: Optional[str] = None
    raw_line: str


class BeckettImportPreview(BaseModel):
    """Preview of a Beckett file before import"""
    product_name: str
    year: int
    brand: str
    total_cards: int
    first_bowman_count: int
    auto_count: int
    rookie_count: int
    sets_found: Dict[str, int]
    sample_cards: List[BeckettParsedCard]
    product_line_exists: bool
    product_line_id: Optional[str] = None


class BeckettImportRequest(BaseModel):
    """Request to import a Beckett file"""
    create_product_line: bool = True


class BeckettImportResponse(BaseModel):
    """Response from Beckett import"""
    success: bool
    product_line_id: Optional[str] = None
    product_line_name: str
    year: int
    brand: str
    total_cards: int
    cards_created: int
    cards_updated: int
    cards_skipped: int
    players_created: int
    players_matched: int
    first_bowman_count: int
    sets_imported: Dict[str, int]
    errors: List[str]
    warnings: List[str]


class BeckettProductInfo(BaseModel):
    """Information about a Beckett product"""
    name: str
    year: int
    brand: str
    url: str


class BeckettScrapeResult(BaseModel):
    """Result of scraping Beckett for products"""
    products_found: int
    products: List[BeckettProductInfo]
    errors: List[str]
