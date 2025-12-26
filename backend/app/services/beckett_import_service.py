"""
Beckett Checklist Import Service
=================================

Imports parsed Beckett checklists into the card inventory database.
Handles brand/product line creation, player matching, and checklist upserts.

Place in: backend/app/services/beckett_import_service.py
"""

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Brand, ProductLine, Checklist, Player
from app.services.beckett_parser import parse_beckett_bytes, ParsedCard


# ============================================
# RESULT DATA CLASS
# ============================================

@dataclass
class ImportResult:
    """Result of importing a Beckett checklist."""
    success: bool = False
    product_line_id: Optional[UUID] = None
    product_line_name: str = ""
    year: int = 0
    brand: str = ""
    
    # Card counts
    total_cards: int = 0
    cards_created: int = 0
    cards_updated: int = 0
    cards_skipped: int = 0
    
    # Player matching
    players_matched: int = 0
    players_created: int = 0
    
    # 1st Bowman count
    first_bowman_count: int = 0
    
    # Sets breakdown
    sets_imported: dict[str, int] = field(default_factory=dict)
    
    # Errors and warnings
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ============================================
# IMPORT SERVICE
# ============================================

class BeckettImportService:
    """
    Service for importing Beckett checklists into the database.
    """
    
    # Brand slugs for lookup/creation
    BRAND_MAPPING = {
        'bowman': 'bowman',
        'topps': 'topps',
        'panini': 'panini',
        'upper deck': 'upper-deck',
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self._player_cache: dict[str, UUID] = {}  # normalized_name -> player_id
        self._brand_cache: dict[str, UUID] = {}   # slug -> brand_id
    
    async def import_from_bytes(
        self,
        file_content: bytes,
        filename: str,
        create_product_line: bool = True,
    ) -> ImportResult:
        """
        Import a Beckett XLSX file from bytes.
        
        Args:
            file_content: The XLSX file content
            filename: Original filename (used to detect product info)
            create_product_line: If True, create product line if not exists
            
        Returns:
            ImportResult with counts and any errors
        """
        result = ImportResult()
        
        # Parse the file
        parse_result = parse_beckett_bytes(file_content, filename)
        
        if not parse_result.cards:
            result.errors.append("No cards found in file")
            return result
        
        result.total_cards = len(parse_result.cards)
        result.product_line_name = parse_result.product_name
        result.year = parse_result.year
        result.brand = parse_result.brand
        
        # Count 1st Bowman cards
        result.first_bowman_count = sum(1 for c in parse_result.cards if c.is_first_bowman)
        
        # Get or create brand
        brand_id = await self._get_or_create_brand(parse_result.brand)
        if not brand_id:
            result.errors.append(f"Failed to get/create brand: {parse_result.brand}")
            return result
        
        # Get or create product line
        product_line_id = await self._get_or_create_product_line(
            brand_id=brand_id,
            name=parse_result.product_name,
            year=parse_result.year,
            create_if_missing=create_product_line,
        )
        
        if not product_line_id:
            result.errors.append(f"Product line not found: {parse_result.product_name}")
            return result
        
        result.product_line_id = product_line_id
        
        # Load player cache for fuzzy matching
        await self._load_player_cache()
        
        # Import each card
        for card in parse_result.cards:
            try:
                created, updated, player_created = await self._import_card(product_line_id, card)
                
                if created:
                    result.cards_created += 1
                elif updated:
                    result.cards_updated += 1
                else:
                    result.cards_skipped += 1
                
                if player_created:
                    result.players_created += 1
                else:
                    result.players_matched += 1
                
                # Track set counts
                result.sets_imported[card.set_name] = result.sets_imported.get(card.set_name, 0) + 1
                
            except Exception as e:
                result.errors.append(f"Error importing {card.card_number}: {e}")
        
        # Commit all changes
        try:
            await self.db.commit()
            result.success = True
        except Exception as e:
            await self.db.rollback()
            result.errors.append(f"Database commit failed: {e}")
            result.success = False
        
        return result
    
    async def import_from_file(
        self,
        file_path: str,
        create_product_line: bool = True,
    ) -> ImportResult:
        """
        Import a Beckett XLSX file from disk.
        """
        from pathlib import Path
        
        path = Path(file_path)
        with open(path, 'rb') as f:
            content = f.read()
        
        return await self.import_from_bytes(content, path.name, create_product_line)
    
    async def _get_or_create_brand(self, brand_name: str) -> Optional[UUID]:
        """Get existing brand or create new one."""
        slug = self.BRAND_MAPPING.get(brand_name.lower(), brand_name.lower().replace(' ', '-'))
        
        # Check cache first
        if slug in self._brand_cache:
            return self._brand_cache[slug]
        
        # Query database
        result = await self.db.execute(
            select(Brand).where(Brand.slug == slug)
        )
        brand = result.scalar_one_or_none()
        
        if brand:
            self._brand_cache[slug] = brand.id
            return brand.id
        
        # Create new brand
        brand = Brand(
            name=brand_name.title(),
            slug=slug,
        )
        self.db.add(brand)
        await self.db.flush()
        
        self._brand_cache[slug] = brand.id
        return brand.id
    
    async def _get_or_create_product_line(
        self,
        brand_id: UUID,
        name: str,
        year: int,
        create_if_missing: bool = True,
    ) -> Optional[UUID]:
        """Get existing product line or create new one."""
        # Query for existing
        result = await self.db.execute(
            select(ProductLine).where(
                ProductLine.brand_id == brand_id,
                ProductLine.name == name,
                ProductLine.year == year,
            )
        )
        product_line = result.scalar_one_or_none()
        
        if product_line:
            return product_line.id
        
        if not create_if_missing:
            return None
        
        # Create new product line
        product_line = ProductLine(
            brand_id=brand_id,
            name=name,
            year=year,
            sport='Baseball',
        )
        self.db.add(product_line)
        await self.db.flush()
        
        return product_line.id
    
    async def _load_player_cache(self):
        """Load all players into cache for fuzzy matching."""
        if self._player_cache:
            return
        
        result = await self.db.execute(
            select(Player.id, Player.name_normalized)
        )
        
        for row in result.all():
            self._player_cache[row.name_normalized] = row.id
    
    async def _match_or_create_player(
        self,
        player_name: str,
        team: Optional[str] = None,
        is_rookie: bool = False,
        is_prospect: bool = False,
    ) -> tuple[Optional[UUID], bool]:
        """
        Match player to existing record or create new one.
        
        Returns:
            (player_id, was_created)
        """
        if not player_name:
            return None, False
        
        normalized = self._normalize_name(player_name)
        
        # Check cache
        if normalized in self._player_cache:
            return self._player_cache[normalized], False
        
        # Try to find existing player
        result = await self.db.execute(
            select(Player).where(Player.name_normalized == normalized)
        )
        player = result.scalar_one_or_none()
        
        if player:
            self._player_cache[normalized] = player.id
            return player.id, False
        
        # Create new player
        player = Player(
            name=player_name,
            name_normalized=normalized,
            team=team,
            is_rookie=is_rookie,
            is_prospect=is_prospect or not is_rookie,
        )
        self.db.add(player)
        await self.db.flush()
        
        self._player_cache[normalized] = player.id
        return player.id, True
    
    async def _import_card(
        self, 
        product_line_id: UUID, 
        card: ParsedCard
    ) -> tuple[bool, bool, bool]:
        """
        Import a single card into the checklists table.
        
        Returns:
            (card_created, card_updated, player_created)
        """
        # Check if card already exists
        result = await self.db.execute(
            select(Checklist).where(
                Checklist.product_line_id == product_line_id,
                Checklist.card_number == card.card_number,
                Checklist.set_name == card.set_name,
            )
        )
        existing = result.scalar_one_or_none()
        
        # Match or create player
        player_id, player_created = await self._match_or_create_player(
            card.player_name,
            card.team,
            card.is_rookie_card,
            card.is_first_bowman,  # 1st Bowman cards are prospects
        )
        
        if existing:
            # Update existing card if needed
            updated = False
            
            if existing.player_id is None and player_id:
                existing.player_id = player_id
                updated = True
            
            if existing.team is None and card.team:
                existing.team = card.team
                updated = True
            
            # Update 1st Bowman flag if not set
            if not existing.is_first_bowman and card.is_first_bowman:
                existing.is_first_bowman = True
                updated = True
            
            return False, updated, player_created
        
        # Create new checklist entry
        checklist = Checklist(
            product_line_id=product_line_id,
            card_number=card.card_number,
            card_prefix=card.card_prefix,
            card_suffix=card.card_suffix,
            player_name_raw=card.player_name,
            player_id=player_id,
            team=card.team,
            set_name=card.set_name,
            is_autograph=card.is_autograph,
            is_relic=card.is_relic,
            is_rookie_card=card.is_rookie_card,
            is_first_bowman=card.is_first_bowman,
            serial_numbered=card.serial_numbered,
            raw_checklist_line=card.raw_line,
        )
        self.db.add(checklist)
        
        return True, False, player_created
    
    @staticmethod
    def _normalize_name(name: str) -> str:
        """
        Normalize player name for matching.
        - Lowercase
        - Remove accents
        - Remove punctuation
        - Collapse whitespace
        """
        # Lowercase
        name = name.lower()
        
        # Remove accents
        name = unicodedata.normalize('NFKD', name)
        name = ''.join(c for c in name if not unicodedata.combining(c))
        
        # Remove punctuation except spaces
        name = re.sub(r'[^\w\s]', '', name)
        
        # Collapse whitespace
        name = ' '.join(name.split())
        
        return name