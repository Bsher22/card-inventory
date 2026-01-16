# app/services/bulk_inventory_import.py
"""
Bulk Inventory Import Service

Imports legacy Excel purchase data into the IDGAS database system.
Handles the full chain: Brand → ProductLine → Checklist → Inventory → Purchase/PurchaseItem

Mapping Strategy:
- "Type" column maps to both base_type (card stock) and parallel (refractor variant)
- Synthetic card numbers generated from player name + year when no card # exists
- Auto-creates missing brands, product lines, and players
"""

import re
import uuid
from datetime import datetime, date, date
from decimal import Decimal
from typing import Optional, Dict, List, Tuple, Any
from dataclasses import dataclass, field
import pandas as pd

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.products import Brand, ProductLine
from app.models.players import Player
from app.models.checklists import Checklist, CardType
from app.models.card_types import CardBaseType, Parallel, ParallelCategory
from app.models.inventory import Inventory
from app.models.financial import Purchase, PurchaseItem


# ============================================
# TYPE MAPPING CONFIGURATION
# ============================================

# Maps Excel "Type" values to (base_type_name, parallel_name, is_autograph)
# base_type: Paper, Chrome, Mega, Sapphire
# parallel: Refractor, Shimmer, Diamond, Raywave, etc.
TYPE_MAPPING: Dict[str, Tuple[Optional[str], Optional[str], bool]] = {
    # Base types (no parallel)
    "Base": ("Paper", None, False),
    "base": ("Paper", None, False),
    "Paper": ("Paper", None, False),
    "Draft Paper": ("Paper", None, False),
    "Chrome": ("Chrome", None, False),
    "Mega": ("Mega", None, False),
    "Sapphire": ("Sapphire", None, False),
    "sapphire": ("Sapphire", None, False),
    
    # Chrome parallels
    "Refractor": ("Chrome", "Refractor", False),
    "Purple Refractor": ("Chrome", "Purple Refractor", False),
    "Aqua Ref": ("Chrome", "Aqua Refractor", False),
    "Aqua Refractor": ("Chrome", "Aqua Refractor", False),
    "Shimmer": ("Chrome", "Shimmer", False),
    "Green Shimmer": ("Chrome", "Green Shimmer", False),
    "Diamond": ("Chrome", "Mini Diamond", False),
    "Mini Diamond": ("Chrome", "Mini Diamond", False),
    "Raywave": ("Chrome", "Raywave", False),
    "Raywave/Chrome": ("Chrome", "Raywave", False),
    "Atomic": ("Chrome", "Atomic", False),
    "Speckle": ("Chrome", "Speckle", False),
    "Sparkle": ("Chrome", "Sparkle", False),
    "Lunar": ("Chrome", "Lunar", False),
    "Lunar Glow": ("Chrome", "Lunar Glow", False),
    "Sky Blue": ("Chrome", "Sky Blue", False),
    "SkyBlue": ("Chrome", "Sky Blue", False),
    "Lava": ("Chrome", "Lava", False),
    "Asia Mojo": ("Chrome", "Asia Mojo", False),
    "Camo Paper": ("Chrome", "Camo", False),
    
    # Sapphire parallels
    "Aqua Sapphire": ("Sapphire", "Aqua Sapphire", False),
    "Orange Sapphire": ("Sapphire", "Orange Sapphire", False),
    "Purple Sapphire": ("Sapphire", "Purple Sapphire", False),
    "Green Sapphire": ("Sapphire", "Green Sapphire", False),
    "Yellow Sapphire": ("Sapphire", "Yellow Sapphire", False),
    "Gold Sapphire": ("Sapphire", "Gold Sapphire", False),
    "Sapphire Image": ("Sapphire", "Image Variation", False),
    "Image-Sapphire": ("Sapphire", "Image Variation", False),
    "Image Variation-Sapphire": ("Sapphire", "Image Variation", False),
    "Image-Sapphire Orange": ("Sapphire", "Orange Sapphire Image Variation", False),
    "Orange Sapphire Image Variation": ("Sapphire", "Orange Sapphire Image Variation", False),
    "Aqua Sapphire + base sapphire": ("Sapphire", "Aqua Sapphire", False),
    "Aqua Sapphire Variation": ("Sapphire", "Aqua Sapphire Variation", False),
    
    # Mega parallels
    "Blue Mega": ("Mega", "Blue Mega", False),
    "Green Mega": ("Mega", "Green Mega", False),
    "Pink Mega": ("Mega", "Pink Mega", False),
    "Purple Mega": ("Mega", "Purple Mega", False),
    "Mega Image": ("Mega", "Image Variation", False),
    "Mega Image Variation": ("Mega", "Image Variation", False),
    "Image Variation-Mega": ("Mega", "Image Variation", False),
    "Mega Variation": ("Mega", "Variation", False),
    
    # Image Variations (default to Paper base)
    "Image Variation": ("Paper", "Image Variation", False),
    "Variation": ("Paper", "Variation", False),
    "Draft Image Variation": ("Paper", "Draft Image Variation", False),
    
    # Autographs
    "Auto": ("Chrome", None, True),
    
    # Special cases
    "*": ("Paper", None, False),  # Unknown/misc
    "***": ("Paper", None, False),
    "1 Base Chrome/1 Mini Diamond": ("Chrome", None, False),  # Mixed lot
    "Chrome (Green Shimmer /99)": ("Chrome", "Green Shimmer", False),
    "Paper (Light Blue /499) (Non 1st)": ("Paper", "Light Blue", False),
    "Paper (Pink /299)": ("Paper", "Pink", False),
}


@dataclass
class ImportRow:
    """Parsed row from Excel import"""
    purchase_date: date
    player_name: str
    year: int
    company: str
    card_type: str
    quantity: int
    price_total: Decimal
    notes: Optional[str] = None
    
    # Derived fields
    base_type_name: Optional[str] = None
    parallel_name: Optional[str] = None
    is_autograph: bool = False


@dataclass
class ImportResult:
    """Results from bulk import operation"""
    total_rows: int = 0
    successful: int = 0
    failed: int = 0
    errors: List[str] = field(default_factory=list)
    
    # Created entities
    brands_created: int = 0
    product_lines_created: int = 0
    players_created: int = 0
    checklists_created: int = 0
    inventory_created: int = 0
    purchases_created: int = 0
    purchase_items_created: int = 0
    
    # Lookup caches
    brand_cache: Dict[str, uuid.UUID] = field(default_factory=dict)
    product_line_cache: Dict[str, uuid.UUID] = field(default_factory=dict)
    player_cache: Dict[str, uuid.UUID] = field(default_factory=dict)
    checklist_cache: Dict[str, uuid.UUID] = field(default_factory=dict)
    base_type_cache: Dict[str, uuid.UUID] = field(default_factory=dict)
    parallel_cache: Dict[str, uuid.UUID] = field(default_factory=dict)


def normalize_player_name(name: str) -> str:
    """
    Normalize player name for matching.
    Handles "Last, First" and "First Last" formats.
    """
    name = name.strip()
    
    # Handle "Last, First" format
    if "," in name:
        parts = name.split(",")
        if len(parts) == 2:
            name = f"{parts[1].strip()} {parts[0].strip()}"
    
    # Normalize to lowercase, remove extra spaces
    name = " ".join(name.split()).lower()
    
    # Remove common suffixes
    name = re.sub(r'\s+(jr\.?|sr\.?|ii|iii|iv)$', '', name, flags=re.IGNORECASE)
    
    return name


def generate_synthetic_card_number(player_name: str, year: int) -> str:
    """
    Generate a synthetic card number for legacy imports.
    Format: IMP-{year}-{hash of player name}
    """
    name_hash = abs(hash(normalize_player_name(player_name))) % 100000
    return f"IMP-{year}-{name_hash:05d}"


def map_card_type(type_str: str) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Map Excel "Type" value to (base_type, parallel, is_autograph).
    Returns (None, None, False) for unknown types.
    """
    type_str = type_str.strip()
    
    # Direct match
    if type_str in TYPE_MAPPING:
        return TYPE_MAPPING[type_str]
    
    # Case-insensitive match
    for key, value in TYPE_MAPPING.items():
        if key.lower() == type_str.lower():
            return value
    
    # Partial match for complex types
    type_lower = type_str.lower()
    
    if "sapphire" in type_lower:
        if "aqua" in type_lower:
            return ("Sapphire", "Aqua Sapphire", False)
        if "orange" in type_lower:
            return ("Sapphire", "Orange Sapphire", False)
        return ("Sapphire", None, False)
    
    if "chrome" in type_lower:
        return ("Chrome", None, False)
    
    if "mega" in type_lower:
        return ("Mega", None, False)
    
    if "refractor" in type_lower:
        return ("Chrome", "Refractor", False)
    
    if "auto" in type_lower:
        return ("Chrome", None, True)
    
    if "shimmer" in type_lower:
        return ("Chrome", "Shimmer", False)
    
    # Default to Paper base
    return ("Paper", None, False)


def get_product_line_name(year: int, base_type: str) -> str:
    """
    Determine product line name based on year and base type.
    Includes year prefix to match checklist upload naming convention.
    """
    # Map base types to product line names (with year prefix)
    if base_type == "Sapphire":
        return f"{year} Bowman Sapphire"
    elif base_type == "Mega":
        return f"{year} Bowman Mega Box"
    elif base_type == "Paper":
        return f"{year} Bowman"
    else:  # Chrome and others
        return f"{year} Bowman Chrome"


class BulkInventoryImporter:
    """
    Service for importing bulk inventory data from Excel.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.result = ImportResult()
    
    async def parse_excel(self, file_path: str) -> List[ImportRow]:
        """
        Parse Excel file and return list of ImportRow objects.
        Supports both cleaned format (with headers) and raw format (without headers).
        """
        # Try reading with headers first (cleaned format)
        df = pd.read_excel(file_path)
        
        # Check if this is the cleaned format (has proper column names)
        expected_cols = {'purchase_date', 'player_name', 'year', 'brand', 'card_type', 'quantity', 'price_total'}
        has_headers = expected_cols.issubset(set(df.columns.str.lower()))
        
        if has_headers:
            # Cleaned format - columns are named
            df.columns = df.columns.str.lower()
            return self._parse_cleaned_format(df)
        else:
            # Raw format - no headers, data starts at row 5
            df = pd.read_excel(file_path, header=None)
            return self._parse_raw_format(df)
    
    def _parse_cleaned_format(self, df: pd.DataFrame) -> List[ImportRow]:
        """Parse cleaned Excel format with proper headers."""
        rows = []
        
        for _, row in df.iterrows():
            # Skip invalid rows
            if pd.isna(row.get('player_name')) or pd.isna(row.get('purchase_date')):
                continue
            
            year = int(row['year']) if pd.notna(row.get('year')) else None
            if not year or year < 2015 or year > 2030:
                continue
            
            card_type = str(row.get('card_type', 'Paper')).strip()
            base_type_name, parallel_name, is_autograph = map_card_type(card_type)
            
            # Parse date
            date_val = row['purchase_date']
            if isinstance(date_val, (datetime, pd.Timestamp)):
                purchase_date = date_val.date()
            elif isinstance(date_val, date):
                purchase_date = date_val
            else:
                continue
            
            import_row = ImportRow(
                purchase_date=purchase_date,
                player_name=str(row['player_name']).strip(),
                year=year,
                company=str(row.get('brand', 'Bowman')).strip(),
                card_type=card_type,
                quantity=int(row.get('quantity', 1)),
                price_total=Decimal(str(row.get('price_total', 0))),
                notes=str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else None,
                base_type_name=base_type_name,
                parallel_name=parallel_name,
                is_autograph=is_autograph
            )
            rows.append(import_row)
        
        return rows
    
    def _parse_raw_format(self, df: pd.DataFrame) -> List[ImportRow]:
        """Parse raw Excel format without headers (original Book1.xlsx format)."""
        rows = []
        
        for i in range(5, len(df)):  # Start after header rows
            row_data = df.iloc[i, :8].tolist()
            
            # Validate row has required data
            if pd.isna(row_data[1]) or not isinstance(row_data[0], (datetime, pd.Timestamp)):
                continue
            
            # Parse year
            year_val = row_data[2]
            if isinstance(year_val, (datetime, pd.Timestamp)):
                year = year_val.year
            elif isinstance(year_val, (int, float)) and not pd.isna(year_val):
                year = int(year_val)
            else:
                continue
            
            if year < 2015 or year > 2030:
                continue
            
            # Parse card type mapping
            card_type = str(row_data[4]).strip() if pd.notna(row_data[4]) else "Base"
            base_type_name, parallel_name, is_autograph = map_card_type(card_type)
            
            # Parse notes from column 8 if present
            notes = str(row_data[7]).strip() if len(row_data) > 7 and pd.notna(row_data[7]) else None
            
            import_row = ImportRow(
                purchase_date=row_data[0].date() if isinstance(row_data[0], (datetime, pd.Timestamp)) else row_data[0],
                player_name=str(row_data[1]).strip(),
                year=year,
                company=str(row_data[3]).strip() if pd.notna(row_data[3]) else "Bowman",
                card_type=card_type,
                quantity=int(row_data[5]) if pd.notna(row_data[5]) and isinstance(row_data[5], (int, float)) else 1,
                price_total=Decimal(str(row_data[6])) if pd.notna(row_data[6]) and isinstance(row_data[6], (int, float)) else Decimal("0"),
                notes=notes,
                base_type_name=base_type_name,
                parallel_name=parallel_name,
                is_autograph=is_autograph
            )
            
            rows.append(import_row)
        
        return rows
    
    async def get_or_create_brand(self, name: str) -> uuid.UUID:
        """Get existing brand or create new one."""
        cache_key = name.lower()
        
        if cache_key in self.result.brand_cache:
            return self.result.brand_cache[cache_key]
        
        # Try to find existing
        stmt = select(Brand).where(func.lower(Brand.name) == cache_key)
        result = await self.db.execute(stmt)
        brand = result.scalar_one_or_none()
        
        if brand:
            self.result.brand_cache[cache_key] = brand.id
            return brand.id
        
        # Create new
        brand = Brand(
            name=name,
            slug=name.lower().replace(" ", "-")
        )
        self.db.add(brand)
        await self.db.flush()
        
        self.result.brand_cache[cache_key] = brand.id
        self.result.brands_created += 1
        return brand.id
    
    async def get_or_create_product_line(
        self, 
        brand_id: uuid.UUID, 
        name: str, 
        year: int
    ) -> uuid.UUID:
        """Get existing product line or create new one."""
        cache_key = f"{brand_id}:{name}:{year}"
        
        if cache_key in self.result.product_line_cache:
            return self.result.product_line_cache[cache_key]
        
        # Try to find existing
        stmt = select(ProductLine).where(
            ProductLine.brand_id == brand_id,
            ProductLine.name == name,
            ProductLine.year == year
        )
        result = await self.db.execute(stmt)
        product_line = result.scalar_one_or_none()
        
        if product_line:
            self.result.product_line_cache[cache_key] = product_line.id
            return product_line.id
        
        # Create new
        product_line = ProductLine(
            brand_id=brand_id,
            name=name,
            year=year,
            sport="Baseball"
        )
        self.db.add(product_line)
        await self.db.flush()
        
        self.result.product_line_cache[cache_key] = product_line.id
        self.result.product_lines_created += 1
        return product_line.id
    
    async def get_or_create_player(self, name: str) -> uuid.UUID:
        """Get existing player or create new one."""
        normalized = normalize_player_name(name)
        
        if normalized in self.result.player_cache:
            return self.result.player_cache[normalized]
        
        # Try to find existing
        stmt = select(Player).where(Player.name_normalized == normalized)
        result = await self.db.execute(stmt)
        player = result.scalar_one_or_none()
        
        if player:
            self.result.player_cache[normalized] = player.id
            return player.id
        
        # Create new - handle "Last, First" format
        display_name = name.strip()
        if "," in display_name:
            parts = display_name.split(",")
            if len(parts) == 2:
                display_name = f"{parts[1].strip()} {parts[0].strip()}"
        
        player = Player(
            name=display_name,
            name_normalized=normalized,
            is_prospect=True  # Most Bowman cards are prospects
        )
        self.db.add(player)
        await self.db.flush()
        
        self.result.player_cache[normalized] = player.id
        self.result.players_created += 1
        return player.id
    
    async def get_or_create_base_type(self, name: Optional[str]) -> Optional[uuid.UUID]:
        """Get existing base type or create new one."""
        if not name:
            return None
        
        cache_key = name.lower()
        
        if cache_key in self.result.base_type_cache:
            return self.result.base_type_cache[cache_key]
        
        # Try to find existing
        stmt = select(CardBaseType).where(func.lower(CardBaseType.name) == cache_key)
        result = await self.db.execute(stmt)
        base_type = result.scalar_one_or_none()
        
        if base_type:
            self.result.base_type_cache[cache_key] = base_type.id
            return base_type.id
        
        # Create new
        base_type = CardBaseType(name=name)
        self.db.add(base_type)
        await self.db.flush()
        
        self.result.base_type_cache[cache_key] = base_type.id
        return base_type.id
    
    async def get_or_create_parallel(self, name: Optional[str]) -> Optional[uuid.UUID]:
        """Get existing parallel or create new one."""
        if not name:
            return None
        
        cache_key = name.lower()
        
        if cache_key in self.result.parallel_cache:
            return self.result.parallel_cache[cache_key]
        
        # Try to find existing
        stmt = select(Parallel).where(func.lower(Parallel.name) == cache_key)
        result = await self.db.execute(stmt)
        parallel = result.scalar_one_or_none()
        
        if parallel:
            self.result.parallel_cache[cache_key] = parallel.id
            return parallel.id
        
        # Create new
        parallel = Parallel(
            name=name,
            short_name=name,
            is_numbered=False
        )
        self.db.add(parallel)
        await self.db.flush()
        
        self.result.parallel_cache[cache_key] = parallel.id
        return parallel.id
    
    async def get_or_create_checklist(
        self,
        product_line_id: uuid.UUID,
        player_name: str,
        player_id: uuid.UUID,
        year: int,
        card_type: str,
        is_autograph: bool,
        base_type_id: Optional[uuid.UUID]
    ) -> uuid.UUID:
        """Get existing checklist entry or create new one."""
        card_number = generate_synthetic_card_number(player_name, year)
        set_name = "Import" if not is_autograph else "Import - Autographs"
        
        cache_key = f"{product_line_id}:{card_number}:{set_name}"
        
        if cache_key in self.result.checklist_cache:
            return self.result.checklist_cache[cache_key]
        
        # Try to find existing
        stmt = select(Checklist).where(
            Checklist.product_line_id == product_line_id,
            Checklist.card_number == card_number,
            Checklist.set_name == set_name
        )
        result = await self.db.execute(stmt)
        checklist = result.scalar_one_or_none()
        
        if checklist:
            self.result.checklist_cache[cache_key] = checklist.id
            return checklist.id
        
        # Create new
        # Normalize display name
        display_name = player_name.strip()
        if "," in display_name:
            parts = display_name.split(",")
            if len(parts) == 2:
                display_name = f"{parts[1].strip()} {parts[0].strip()}"
        
        checklist = Checklist(
            product_line_id=product_line_id,
            card_number=card_number,
            player_name_raw=display_name,
            player_id=player_id,
            base_type_id=base_type_id,
            set_name=set_name,
            is_autograph=is_autograph,
            is_first_bowman=True,  # Default for Bowman prospects
            raw_checklist_line=f"IMPORT: {player_name} | {card_type}"
        )
        self.db.add(checklist)
        await self.db.flush()
        
        self.result.checklist_cache[cache_key] = checklist.id
        self.result.checklists_created += 1
        return checklist.id
    
    async def create_inventory(
        self,
        checklist_id: uuid.UUID,
        base_type_id: Optional[uuid.UUID],
        parallel_id: Optional[uuid.UUID],
        quantity: int,
        is_signed: bool,
        total_cost: Decimal
    ) -> uuid.UUID:
        """Create inventory entry."""
        # Try to find existing inventory with same attributes
        stmt = select(Inventory).where(
            Inventory.checklist_id == checklist_id,
            Inventory.is_signed == is_signed,
            Inventory.is_slabbed == False,
            Inventory.base_type_id == base_type_id,
            Inventory.parallel_id == parallel_id
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing inventory
            existing.quantity += quantity
            existing.total_cost += total_cost
            return existing.id
        
        # Create new
        inventory = Inventory(
            item_type="card",
            checklist_id=checklist_id,
            base_type_id=base_type_id,
            parallel_id=parallel_id,
            quantity=quantity,
            is_signed=is_signed,
            is_slabbed=False,
            total_cost=total_cost
        )
        self.db.add(inventory)
        await self.db.flush()
        
        self.result.inventory_created += 1
        return inventory.id
    
    async def create_purchase_with_item(
        self,
        purchase_date: date,
        checklist_id: uuid.UUID,
        quantity: int,
        total_price: Decimal,
        notes: Optional[str] = None
    ) -> Tuple[uuid.UUID, uuid.UUID]:
        """Create purchase and purchase item."""
        unit_price = total_price / quantity if quantity > 0 else total_price
        
        # Create purchase
        purchase = Purchase(
            purchase_date=purchase_date,
            platform="Import",
            vendor="Legacy Import",
            subtotal=total_price,
            total=total_price,
            notes=notes
        )
        self.db.add(purchase)
        await self.db.flush()
        
        self.result.purchases_created += 1
        
        # Create purchase item
        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            checklist_id=checklist_id,
            quantity=quantity,
            unit_price=unit_price,
            condition="Raw",
            notes=notes
        )
        self.db.add(purchase_item)
        await self.db.flush()
        
        self.result.purchase_items_created += 1
        
        return purchase.id, purchase_item.id
    
    async def import_row(self, row: ImportRow) -> bool:
        """Import a single row. Returns True on success."""
        try:
            # 1. Get or create brand
            brand_id = await self.get_or_create_brand(row.company)
            
            # 2. Get or create product line
            product_line_name = get_product_line_name(row.year, row.base_type_name or "Chrome")
            product_line_id = await self.get_or_create_product_line(
                brand_id, product_line_name, row.year
            )
            
            # 3. Get or create player
            player_id = await self.get_or_create_player(row.player_name)
            
            # 4. Get or create base type and parallel
            base_type_id = await self.get_or_create_base_type(row.base_type_name)
            parallel_id = await self.get_or_create_parallel(row.parallel_name)
            
            # 5. Get or create checklist entry
            checklist_id = await self.get_or_create_checklist(
                product_line_id=product_line_id,
                player_name=row.player_name,
                player_id=player_id,
                year=row.year,
                card_type=row.card_type,
                is_autograph=row.is_autograph,
                base_type_id=base_type_id
            )
            
            # 6. Create inventory entry
            await self.create_inventory(
                checklist_id=checklist_id,
                base_type_id=base_type_id,
                parallel_id=parallel_id,
                quantity=row.quantity,
                is_signed=row.is_autograph,
                total_cost=row.price_total
            )
            
            # 7. Create purchase records
            await self.create_purchase_with_item(
                purchase_date=row.purchase_date,
                checklist_id=checklist_id,
                quantity=row.quantity,
                total_price=row.price_total,
                notes=row.notes
            )
            
            self.result.successful += 1
            return True
            
        except Exception as e:
            self.result.failed += 1
            self.result.errors.append(f"Row {self.result.total_rows}: {str(e)}")
            return False
    
    async def import_all(self, file_path: str, batch_size: int = 100) -> ImportResult:
        """
        Import all rows from Excel file.
        Uses batched commits for performance.
        """
        rows = await self.parse_excel(file_path)
        self.result.total_rows = len(rows)
        
        for i, row in enumerate(rows):
            await self.import_row(row)
            
            # Batch commit
            if (i + 1) % batch_size == 0:
                await self.db.commit()
        
        # Final commit
        await self.db.commit()
        
        return self.result


# ============================================
# PREVIEW/VALIDATION FUNCTIONS
# ============================================

async def preview_import(file_path: str) -> Dict[str, Any]:
    """
    Preview what would be imported without making changes.
    Returns summary statistics and sample data.
    Supports both cleaned format (with headers) and raw format.
    """
    # Try reading with headers first
    df = pd.read_excel(file_path)
    expected_cols = {'purchase_date', 'player_name', 'year', 'brand', 'card_type', 'quantity', 'price_total'}
    has_headers = expected_cols.issubset(set(df.columns.str.lower()))
    
    if has_headers:
        df.columns = df.columns.str.lower()
        rows = []
        for _, row in df.iterrows():
            if pd.isna(row.get('player_name')) or pd.isna(row.get('purchase_date')):
                continue
            
            year = int(row['year']) if pd.notna(row.get('year')) else None
            if not year or year < 2015 or year > 2030:
                continue
            
            card_type = str(row.get('card_type', 'Paper')).strip()
            base_type_name, parallel_name, is_auto = map_card_type(card_type)
            
            date_val = row['purchase_date']
            if hasattr(date_val, 'isoformat'):
                date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
            else:
                date_str = str(date_val)
            
            rows.append({
                "date": date_str,
                "player": str(row['player_name']).strip(),
                "year": year,
                "card_type": card_type,
                "base_type": base_type_name,
                "parallel": parallel_name,
                "is_auto": is_auto,
                "quantity": int(row.get('quantity', 1)),
                "price": float(row.get('price_total', 0))
            })
    else:
        # Raw format
        df = pd.read_excel(file_path, header=None)
        rows = []
        for i in range(5, len(df)):
            row_data = df.iloc[i, :7].tolist()
            
            if pd.isna(row_data[1]) or not isinstance(row_data[0], (datetime, pd.Timestamp)):
                continue
            
            year_val = row_data[2]
            if isinstance(year_val, (datetime, pd.Timestamp)):
                year = year_val.year
            elif isinstance(year_val, (int, float)) and not pd.isna(year_val):
                year = int(year_val)
            else:
                continue
            
            if year < 2015 or year > 2030:
                continue
            
            card_type = str(row_data[4]).strip() if pd.notna(row_data[4]) else "Base"
            base_type_name, parallel_name, is_auto = map_card_type(card_type)
            
            rows.append({
                "date": row_data[0].isoformat() if hasattr(row_data[0], 'isoformat') else str(row_data[0]),
                "player": str(row_data[1]).strip(),
                "year": year,
                "card_type": card_type,
                "base_type": base_type_name,
                "parallel": parallel_name,
                "is_auto": is_auto,
                "quantity": int(row_data[5]) if pd.notna(row_data[5]) else 1,
                "price": float(row_data[6]) if pd.notna(row_data[6]) else 0.0
            })
    
    # Calculate statistics
    total_cards = sum(r["quantity"] for r in rows)
    total_value = sum(r["price"] for r in rows)
    
    # Group by type mapping
    type_breakdown = {}
    for r in rows:
        key = f"{r['base_type']}" + (f" - {r['parallel']}" if r['parallel'] else "")
        if key not in type_breakdown:
            type_breakdown[key] = {"count": 0, "value": 0}
        type_breakdown[key]["count"] += r["quantity"]
        type_breakdown[key]["value"] += r["price"]
    
    # Year breakdown
    year_breakdown = {}
    for r in rows:
        y = r["year"]
        if y not in year_breakdown:
            year_breakdown[y] = {"count": 0, "value": 0}
        year_breakdown[y]["count"] += r["quantity"]
        year_breakdown[y]["value"] += r["price"]
    
    return {
        "total_rows": len(rows),
        "total_cards": total_cards,
        "total_value": total_value,
        "type_breakdown": dict(sorted(type_breakdown.items(), key=lambda x: -x[1]["count"])),
        "year_breakdown": dict(sorted(year_breakdown.items())),
        "sample_rows": rows[:10],
        "unique_players": len(set(r["player"] for r in rows))
    }
