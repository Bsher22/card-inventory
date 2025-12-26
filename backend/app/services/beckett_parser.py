"""
Beckett XLSX Checklist Parser
=============================

Parses Beckett checklist XLSX files (downloaded from beckett.com) and converts
them into a format suitable for importing into the card inventory database.

The Beckett XLSX files have a specific structure:
- Multiple sheets: Master, Base, Prospects, Autographs, Inserts, Teams
- Master sheet contains ALL cards in a consolidated format
- No header row - data starts at row 0

Master Sheet Columns:
- 0: Set name (e.g., "Base", "Bowman Prospects", "Chrome Prospect Autographs")
- 1: Card number (e.g., "1", "BP-31", "91B-AB") 
- 2: Player name
- 3: Team name
- 4: Notes (e.g., "RC", "/199", "Auto")
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from io import BytesIO

import pandas as pd


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ParsedCard:
    """Represents a single parsed card from a Beckett checklist."""
    set_name: str
    card_number: str
    card_prefix: Optional[str]
    card_suffix: Optional[str]
    player_name: str
    team: Optional[str]
    is_rookie_card: bool
    is_autograph: bool
    is_relic: bool
    is_first_bowman: bool  # True if this is a prospect card (1st Bowman candidate)
    serial_numbered: Optional[int]  # e.g., 199 for /199
    notes: Optional[str]
    raw_line: str  # Original data for debugging

    def to_dict(self) -> dict:
        """Convert to dictionary for database import."""
        return {
            'set_name': self.set_name,
            'card_number': self.card_number,
            'card_prefix': self.card_prefix,
            'card_suffix': self.card_suffix,
            'player_name': self.player_name,
            'team': self.team,
            'is_rookie_card': self.is_rookie_card,
            'is_autograph': self.is_autograph,
            'is_relic': self.is_relic,
            'is_first_bowman': self.is_first_bowman,
            'serial_numbered': self.serial_numbered,
            'notes': self.notes,
            'raw_line': self.raw_line,
        }


@dataclass
class BeckettParseResult:
    """Result of parsing a Beckett checklist file."""
    product_name: str
    year: int
    brand: str
    cards: list[ParsedCard] = field(default_factory=list)
    total_rows: int = 0
    parsed_count: int = 0
    error_count: int = 0
    errors: list[str] = field(default_factory=list)
    
    # Breakdown by set
    sets_found: dict[str, int] = field(default_factory=dict)


# =============================================================================
# PARSER CLASS
# =============================================================================

class BeckettParser:
    """
    Parser for Beckett XLSX checklist files.
    """
    
    # Patterns to detect autographs in set names
    AUTO_PATTERNS = [
        r'\bauto(?:graph)?s?\b',
        r'\bsignature\b',
        r'\bsigned\b',
        r'\bink\b',
    ]
    
    # Patterns to detect relics/memorabilia
    RELIC_PATTERNS = [
        r'\brelic\b',
        r'\bmemorabilia\b',
        r'\bpatch\b',
        r'\bjersey\b',
        r'\bbat\b',
        r'\bgame.?used\b',
    ]
    
    # Patterns to detect 1st Bowman eligible cards (prospect sets)
    # These are sets where a player's first appearance = their 1st Bowman
    FIRST_BOWMAN_PATTERNS = [
        r'\bprospects?\b',           # "Bowman Prospects", "Chrome Prospects"
        r'\bdraft\s*pick',           # "Draft Pick Autographs"
        r'\b1st\s*bowman\b',         # Explicit "1st Bowman"
        r'\bfirst\s*bowman\b',       # "First Bowman"
    ]
    
    # Card prefixes that indicate prospect cards
    PROSPECT_PREFIXES = [
        'BP',    # Bowman Prospects
        'BCP',   # Bowman Chrome Prospects
        'BD',    # Bowman Draft
        'BDC',   # Bowman Draft Chrome
        'BDCA',  # Bowman Draft Chrome Auto
        'CPA',   # Chrome Prospect Autographs
    ]
    
    # Card number prefix patterns (e.g., BP-1, BCP-25, RC-10)
    CARD_NUMBER_PATTERN = re.compile(r'^([A-Z]+)?-?(\d+)([A-Z])?$', re.IGNORECASE)
    
    # Serial number pattern (e.g., "/199", "/ 50", "#/25")
    SERIAL_PATTERN = re.compile(r'/?#?\s*/?\s*(\d+)\s*$')
    
    def __init__(self):
        self._auto_regex = re.compile('|'.join(self.AUTO_PATTERNS), re.IGNORECASE)
        self._relic_regex = re.compile('|'.join(self.RELIC_PATTERNS), re.IGNORECASE)
        self._first_bowman_regex = re.compile('|'.join(self.FIRST_BOWMAN_PATTERNS), re.IGNORECASE)
    
    def parse_file(self, file_path: str | Path) -> BeckettParseResult:
        """
        Parse a Beckett XLSX file.
        
        Args:
            file_path: Path to the XLSX file
            
        Returns:
            BeckettParseResult with parsed cards and metadata
        """
        file_path = Path(file_path)
        
        # Extract product info from filename
        product_info = self._extract_product_info(file_path.name)
        
        result = BeckettParseResult(
            product_name=product_info['product_name'],
            year=product_info['year'],
            brand=product_info['brand'],
        )
        
        # Read the Master sheet
        try:
            df = pd.read_excel(file_path, sheet_name='Master', header=None)
        except Exception as e:
            result.errors.append(f"Failed to read Master sheet: {e}")
            return result
        
        result.total_rows = len(df)
        
        # Parse each row
        for idx, row in df.iterrows():
            try:
                card = self._parse_row(row, idx)
                if card:
                    result.cards.append(card)
                    result.parsed_count += 1
                    
                    # Track sets
                    result.sets_found[card.set_name] = result.sets_found.get(card.set_name, 0) + 1
            except Exception as e:
                result.error_count += 1
                result.errors.append(f"Row {idx}: {e}")
        
        return result
    
    def parse_bytes(self, file_content: bytes, filename: str) -> BeckettParseResult:
        """
        Parse Beckett XLSX from bytes (for API uploads).
        
        Args:
            file_content: File content as bytes
            filename: Original filename for product info extraction
            
        Returns:
            BeckettParseResult with parsed cards and metadata
        """
        product_info = self._extract_product_info(filename)
        
        result = BeckettParseResult(
            product_name=product_info['product_name'],
            year=product_info['year'],
            brand=product_info['brand'],
        )
        
        try:
            df = pd.read_excel(BytesIO(file_content), sheet_name='Master', header=None)
        except Exception as e:
            result.errors.append(f"Failed to read Master sheet: {e}")
            return result
        
        result.total_rows = len(df)
        
        for idx, row in df.iterrows():
            try:
                card = self._parse_row(row, idx)
                if card:
                    result.cards.append(card)
                    result.parsed_count += 1
                    result.sets_found[card.set_name] = result.sets_found.get(card.set_name, 0) + 1
            except Exception as e:
                result.error_count += 1
                result.errors.append(f"Row {idx}: {e}")
        
        return result
    
    def _extract_product_info(self, filename: str) -> dict:
        """
        Extract year, brand, and product name from filename.
        
        Examples:
            "2020-bowman-draft-2020-Bowman-Draft-Baseball-Checklist.xlsx"
            "2021-bowman-baseball-2021-Bowman-Baseball-Checklist.xlsx"
            "2020-bowman-chrome-2020-Bowman-Chrome-Baseball-1.xlsx"
        """
        # Try to extract year from filename
        year_match = re.search(r'(20\d{2})', filename)
        year = int(year_match.group(1)) if year_match else 2024
        
        # Detect brand and product type
        filename_lower = filename.lower()
        
        if 'bowman-draft' in filename_lower:
            brand = 'Bowman'
            product_name = f'{year} Bowman Draft'
        elif 'bowman-chrome' in filename_lower:
            brand = 'Bowman'
            product_name = f'{year} Bowman Chrome'
        elif 'bowman' in filename_lower:
            brand = 'Bowman'
            product_name = f'{year} Bowman'
        elif 'topps-chrome' in filename_lower:
            brand = 'Topps'
            product_name = f'{year} Topps Chrome'
        elif 'topps' in filename_lower:
            brand = 'Topps'
            product_name = f'{year} Topps'
        else:
            brand = 'Unknown'
            product_name = filename.replace('.xlsx', '').replace('-', ' ').title()
        
        return {
            'year': year,
            'brand': brand,
            'product_name': product_name,
        }
    
    def _parse_row(self, row: pd.Series, row_idx: int) -> Optional[ParsedCard]:
        """
        Parse a single row from the Master sheet.
        
        Expected columns:
        - 0: Set name
        - 1: Card number  
        - 2: Player name
        - 3: Team
        - 4: Notes
        """
        # Get values, handling NaN
        set_name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None
        card_number = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else None
        player_name = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else None
        team = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else None
        notes = str(row.iloc[4]).strip() if len(row) > 4 and pd.notna(row.iloc[4]) else None
        
        # Skip rows without essential data
        if not set_name or not player_name:
            return None
        
        # Skip header-like rows
        if set_name.lower() in ['set', 'type', 'category'] or player_name.lower() in ['player', 'name']:
            return None
        
        # Parse card number components
        card_prefix, card_suffix = self._parse_card_number(card_number)
        
        # Detect card attributes
        is_rookie = self._is_rookie(notes, card_number)
        is_auto = self._is_autograph(set_name, notes)
        is_relic = self._is_relic(set_name, notes)
        is_first_bowman = self._is_first_bowman(set_name, card_number, card_prefix)
        serial = self._extract_serial(notes)
        
        # Build raw line for reference
        raw_line = f"{set_name} | {card_number} | {player_name} | {team} | {notes}"
        
        return ParsedCard(
            set_name=set_name,
            card_number=card_number or '',
            card_prefix=card_prefix,
            card_suffix=card_suffix,
            player_name=player_name,
            team=team,
            is_rookie_card=is_rookie,
            is_autograph=is_auto,
            is_relic=is_relic,
            is_first_bowman=is_first_bowman,
            serial_numbered=serial,
            notes=notes,
            raw_line=raw_line,
        )
    
    def _parse_card_number(self, card_number: Optional[str]) -> tuple[Optional[str], Optional[str]]:
        """
        Parse card number into prefix and suffix.
        
        Examples:
            "BP-31" -> ("BP", None)
            "91B-AB" -> ("91B", None)
            "25" -> (None, None)
            "RC-10A" -> ("RC", "A")
        """
        if not card_number:
            return None, None
        
        # Try to match pattern
        match = self.CARD_NUMBER_PATTERN.match(card_number)
        if match:
            prefix = match.group(1)
            suffix = match.group(3)
            return prefix, suffix
        
        # Check for dash-separated prefix
        if '-' in card_number:
            parts = card_number.split('-', 1)
            return parts[0], None
        
        return None, None
    
    def _is_rookie(self, notes: Optional[str], card_number: Optional[str]) -> bool:
        """Check if card is a rookie card."""
        if notes and 'RC' in notes.upper():
            return True
        if card_number and 'RC' in card_number.upper():
            return True
        return False
    
    def _is_autograph(self, set_name: str, notes: Optional[str]) -> bool:
        """Check if card is an autograph."""
        if self._auto_regex.search(set_name):
            return True
        if notes and self._auto_regex.search(notes):
            return True
        return False
    
    def _is_relic(self, set_name: str, notes: Optional[str]) -> bool:
        """Check if card is a relic/memorabilia."""
        if self._relic_regex.search(set_name):
            return True
        if notes and self._relic_regex.search(notes):
            return True
        return False
    
    def _is_first_bowman(self, set_name: str, card_number: Optional[str], card_prefix: Optional[str]) -> bool:
        """
        Check if card is eligible to be a 1st Bowman card.
        
        A card is 1st Bowman eligible if:
        1. It's in a prospect set (Bowman Prospects, Chrome Prospects, etc.)
        2. It's a Bowman Draft card
        3. The card prefix indicates a prospect card (BP-, BCP-, BD-, etc.)
        
        Note: This indicates the card COULD be a 1st Bowman - the actual determination
        of whether it's the player's first Bowman requires checking their history.
        """
        # Check set name for prospect indicators
        if self._first_bowman_regex.search(set_name):
            return True
        
        # Check card prefix
        if card_prefix and card_prefix.upper() in self.PROSPECT_PREFIXES:
            return True
        
        # Check if card number starts with a prospect prefix
        if card_number:
            for prefix in self.PROSPECT_PREFIXES:
                if card_number.upper().startswith(prefix):
                    return True
        
        return False
    
    def _extract_serial(self, notes: Optional[str]) -> Optional[int]:
        """
        Extract serial number from notes.
        
        Examples:
            "/199" -> 199
            "Auto /50" -> 50
            "RC" -> None
        """
        if not notes:
            return None
        
        match = self.SERIAL_PATTERN.search(notes)
        if match:
            return int(match.group(1))
        
        return None


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def parse_beckett_file(file_path: str | Path) -> BeckettParseResult:
    """Parse a Beckett XLSX file and return results."""
    parser = BeckettParser()
    return parser.parse_file(file_path)


def parse_beckett_bytes(file_content: bytes, filename: str) -> BeckettParseResult:
    """Parse Beckett XLSX from bytes."""
    parser = BeckettParser()
    return parser.parse_bytes(file_content, filename)


# =============================================================================
# DEMO / TEST
# =============================================================================

if __name__ == "__main__":
    import sys
    
    files = [
        "/mnt/user-data/uploads/2020-bowman-draft-2020-Bowman-Draft-Baseball-Checklist.xlsx",
        "/mnt/user-data/uploads/2021-bowman-baseball-2021-Bowman-Baseball-Checklist.xlsx",
        "/mnt/user-data/uploads/2020-bowman-chrome-2020-Bowman-Chrome-Baseball-1.xlsx",
    ]
    
    for f in files:
        print(f"\n{'='*70}")
        print(f"FILE: {Path(f).name}")
        print('='*70)
        
        result = parse_beckett_file(f)
        
        print(f"Product: {result.product_name}")
        print(f"Year: {result.year}")
        print(f"Brand: {result.brand}")
        print(f"\nTotal rows: {result.total_rows}")
        print(f"Parsed: {result.parsed_count}")
        print(f"Errors: {result.error_count}")
        
        # Count 1st Bowman eligible cards
        first_bowman_count = sum(1 for c in result.cards if c.is_first_bowman)
        auto_count = sum(1 for c in result.cards if c.is_autograph)
        rookie_count = sum(1 for c in result.cards if c.is_rookie_card)
        
        print(f"\n📊 Card Breakdown:")
        print(f"  • 1st Bowman: {first_bowman_count}")
        print(f"  • Autographs: {auto_count}")
        print(f"  • Rookies (RC): {rookie_count}")
        
        print(f"\nSets found:")
        for set_name, count in sorted(result.sets_found.items(), key=lambda x: -x[1]):
            print(f"  - {set_name}: {count} cards")
        
        print(f"\nSample 1st Bowman eligible cards:")
        first_bowman_cards = [c for c in result.cards if c.is_first_bowman][:5]
        for card in first_bowman_cards:
            flags = []
            if card.is_autograph:
                flags.append("AUTO")
            if card.is_rookie_card:
                flags.append("RC")
            if card.serial_numbered:
                flags.append(f"/{card.serial_numbered}")
            flag_str = f" [{', '.join(flags)}]" if flags else ""
            print(f"  {card.set_name} | {card.card_number} | {card.player_name}{flag_str}")
        
        if result.errors:
            print(f"\nFirst 5 errors:")
            for err in result.errors[:5]:
                print(f"  - {err}")