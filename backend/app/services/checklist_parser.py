"""
Checklist Parser Service

Handles parsing and importing checklists from CSV/Excel files.
Supports common formats from Topps, Bowman, and other manufacturers.
"""

import re
from io import BytesIO
from typing import Optional
from uuid import UUID

import pandas as pd
from rapidfuzz import fuzz, process
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Player, Checklist, ProductLine, CardType
from app.schemas import ChecklistUploadResult, ChecklistUploadPreview


# Common column name mappings
COLUMN_MAPPINGS = {
    # Card number variations
    "card_number": ["card #", "card number", "number", "#", "card no", "no.", "card", "card#"],
    # Player name variations
    "player_name": ["player", "player name", "name", "subject", "card name", "player/subject"],
    # Team variations
    "team": ["team", "team name", "club", "franchise"],
    # Parallel variations
    "parallel": ["parallel", "version", "variation", "type", "card type", "insert"],
    # Serial number variations
    "serial": ["serial", "print run", "numbered", "/", "serial #", "print run"],
    # Auto indicator variations
    "auto": ["auto", "autograph", "autographed", "signature", "signed"],
    # Relic indicator variations
    "relic": ["relic", "memorabilia", "mem", "jersey", "patch", "game-used"],
    # Rookie indicator variations
    "rookie": ["rookie", "rc", "rookie card", "1st", "first"],
    # Notes variations
    "notes": ["notes", "comments", "description", "info"],
}


def normalize_column_name(col: str) -> str:
    """Normalize column name for matching."""
    return col.lower().strip().replace("_", " ").replace("-", " ")


def detect_columns(df: pd.DataFrame) -> dict[str, str]:
    """
    Detect and map DataFrame columns to our schema.
    Returns a dict of {our_field: original_column_name}
    """
    mapped = {}
    df_cols = {normalize_column_name(c): c for c in df.columns}
    
    for field, variations in COLUMN_MAPPINGS.items():
        for variation in variations:
            norm_var = normalize_column_name(variation)
            if norm_var in df_cols:
                mapped[field] = df_cols[norm_var]
                break
        
        # Try fuzzy matching if no exact match
        if field not in mapped:
            for col_norm, col_orig in df_cols.items():
                for variation in variations:
                    if fuzz.ratio(col_norm, normalize_column_name(variation)) > 85:
                        mapped[field] = col_orig
                        break
                if field in mapped:
                    break
    
    return mapped


def parse_serial_number(value: str) -> Optional[int]:
    """Extract serial number from strings like '/50', 'Gold /25', etc."""
    if pd.isna(value):
        return None
    
    value = str(value)
    
    # Look for /number pattern
    match = re.search(r'/(\d+)', value)
    if match:
        return int(match.group(1))
    
    # Look for standalone number that might be a print run
    if value.isdigit() and int(value) <= 1000:
        return int(value)
    
    return None


def parse_boolean_field(value) -> bool:
    """Parse various boolean representations."""
    if pd.isna(value):
        return False
    
    value = str(value).lower().strip()
    return value in ['yes', 'y', 'true', '1', 'x', '✓', '✔', 'auto', 'relic', 'rc']


def normalize_player_name(name: str) -> str:
    """Normalize player name for matching."""
    if pd.isna(name):
        return ""
    
    name = str(name).strip()
    
    # Remove common suffixes
    name = re.sub(r'\s+(jr\.?|sr\.?|ii|iii|iv)$', '', name, flags=re.IGNORECASE)
    
    # Normalize spaces
    name = re.sub(r'\s+', ' ', name)
    
    # Remove accents (basic)
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
        'ñ': 'n', 'ü': 'u',
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    
    return name.lower()


class ChecklistParser:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._player_cache: dict[str, UUID] = {}
        self._card_type_cache: dict[str, UUID] = {}
    
    async def _load_player_cache(self):
        """Load existing players into cache for matching."""
        result = await self.db.execute(select(Player))
        players = result.scalars().all()
        
        for player in players:
            self._player_cache[player.name_normalized] = player.id
    
    async def _load_card_type_cache(self):
        """Load card types into cache."""
        result = await self.db.execute(select(CardType))
        card_types = result.scalars().all()
        
        for ct in card_types:
            self._card_type_cache[ct.name.lower()] = ct.id
    
    async def _find_or_create_player(
        self, 
        name: str, 
        team: Optional[str] = None
    ) -> tuple[UUID, bool]:
        """
        Find existing player or create new one.
        Returns (player_id, was_created)
        """
        if not name or pd.isna(name):
            return None, False
        
        name = str(name).strip()
        normalized = normalize_player_name(name)
        
        # Check cache first
        if normalized in self._player_cache:
            return self._player_cache[normalized], False
        
        # Try fuzzy matching
        if self._player_cache:
            matches = process.extractOne(
                normalized,
                self._player_cache.keys(),
                scorer=fuzz.ratio
            )
            if matches and matches[1] >= 90:
                return self._player_cache[matches[0]], False
        
        # Create new player
        new_player = Player(
            name=name,
            name_normalized=normalized,
            team=team if not pd.isna(team) else None,
        )
        self.db.add(new_player)
        await self.db.flush()
        
        self._player_cache[normalized] = new_player.id
        return new_player.id, True
    
    def _detect_card_type(self, parallel_name: Optional[str]) -> Optional[UUID]:
        """Detect card type from parallel name."""
        if not parallel_name:
            return self._card_type_cache.get("base")
        
        parallel_lower = parallel_name.lower()
        
        # Check for exact matches first
        if parallel_lower in self._card_type_cache:
            return self._card_type_cache[parallel_lower]
        
        # Check for partial matches
        for type_name, type_id in self._card_type_cache.items():
            if type_name in parallel_lower or parallel_lower in type_name:
                return type_id
        
        return self._card_type_cache.get("base")
    
    async def preview_upload(
        self, 
        file_content: bytes, 
        filename: str
    ) -> ChecklistUploadPreview:
        """
        Preview a checklist file before importing.
        Returns detected columns and sample data.
        """
        # Parse file based on extension
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file_content))
        elif filename.endswith(('.xlsx', '.xls')):
            # Try to use "Master" sheet if it exists, otherwise first sheet
            xl = pd.ExcelFile(BytesIO(file_content))
            if 'Master' in xl.sheet_names:
                df = pd.read_excel(xl, sheet_name='Master')
            else:
                df = pd.read_excel(xl, sheet_name=0)
        else:
            raise ValueError(f"Unsupported file type: {filename}")
        
        # Detect columns
        mapped_columns = detect_columns(df)
        unmapped = [c for c in df.columns if c not in mapped_columns.values()]
        
        # Get sample rows
        sample_df = df.head(10).fillna("")
        sample_rows = sample_df.to_dict('records')
        
        return ChecklistUploadPreview(
            filename=filename,
            total_rows=len(df),
            sample_rows=sample_rows,
            detected_columns=mapped_columns,
            unmapped_columns=unmapped,
        )
    
    async def import_checklist(
        self,
        file_content: bytes,
        filename: str,
        product_line_id: UUID,
        column_mapping: Optional[dict[str, str]] = None,
    ) -> ChecklistUploadResult:
        """
        Import a checklist file into the database.
        """
        # Parse file
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file_content))
        elif filename.endswith(('.xlsx', '.xls')):
            # Try to use "Master" sheet if it exists, otherwise first sheet
            xl = pd.ExcelFile(BytesIO(file_content))
            if 'Master' in xl.sheet_names:
                df = pd.read_excel(xl, sheet_name='Master')
            else:
                df = pd.read_excel(xl, sheet_name=0)
        else:
            raise ValueError(f"Unsupported file type: {filename}")
        
        # Load caches
        await self._load_player_cache()
        await self._load_card_type_cache()
        
        # Use provided mapping or detect
        col_map = column_mapping or detect_columns(df)
        
        # Verify product line exists
        pl = await self.db.get(ProductLine, product_line_id)
        if not pl:
            raise ValueError(f"Product line not found: {product_line_id}")
        
        # Track results
        result = ChecklistUploadResult(
            product_line_id=product_line_id,
            total_rows=len(df),
            cards_created=0,
            cards_updated=0,
            players_created=0,
            players_matched=0,
            errors=[],
        )
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                # Get card number (required)
                card_number_col = col_map.get("card_number")
                if not card_number_col or pd.isna(row.get(card_number_col)):
                    result.errors.append(f"Row {idx + 1}: Missing card number")
                    continue
                
                card_number = str(row[card_number_col]).strip()
                
                # Get player name
                player_name_col = col_map.get("player_name")
                player_name = row.get(player_name_col) if player_name_col else None
                
                # Get team
                team_col = col_map.get("team")
                team = row.get(team_col) if team_col else None
                
                # Get parallel
                parallel_col = col_map.get("parallel")
                parallel_name = str(row.get(parallel_col, "Base")).strip() if parallel_col else "Base"
                if pd.isna(row.get(parallel_col)) if parallel_col else True:
                    parallel_name = "Base"
                
                # Get serial number
                serial_col = col_map.get("serial")
                serial_numbered = parse_serial_number(row.get(serial_col)) if serial_col else None
                
                # Also check parallel name for serial number
                if not serial_numbered and parallel_name:
                    serial_numbered = parse_serial_number(parallel_name)
                
                # Get boolean fields
                auto_col = col_map.get("auto")
                is_auto = parse_boolean_field(row.get(auto_col)) if auto_col else False
                
                relic_col = col_map.get("relic")
                is_relic = parse_boolean_field(row.get(relic_col)) if relic_col else False
                
                rookie_col = col_map.get("rookie")
                is_rookie = parse_boolean_field(row.get(rookie_col)) if rookie_col else False
                
                # Also check card number for RC indicator
                if not is_rookie and "rc" in card_number.lower():
                    is_rookie = True
                
                # Get notes
                notes_col = col_map.get("notes")
                notes = str(row.get(notes_col)).strip() if notes_col and not pd.isna(row.get(notes_col)) else None
                
                # Find or create player
                player_id = None
                if player_name and not pd.isna(player_name):
                    player_id, was_created = await self._find_or_create_player(
                        player_name, team
                    )
                    if was_created:
                        result.players_created += 1
                    else:
                        result.players_matched += 1
                
                # Detect card type
                card_type_id = self._detect_card_type(parallel_name)
                
                # Check if card already exists
                existing = await self.db.execute(
                    select(Checklist).where(
                        Checklist.product_line_id == product_line_id,
                        Checklist.card_number == card_number,
                        Checklist.parallel_name == parallel_name,
                    )
                )
                existing_card = existing.scalar_one_or_none()
                
                if existing_card:
                    # Update existing
                    existing_card.player_id = player_id
                    existing_card.player_name_raw = str(player_name) if player_name else None
                    existing_card.card_type_id = card_type_id
                    existing_card.serial_numbered = serial_numbered
                    existing_card.is_autograph = is_auto
                    existing_card.is_relic = is_relic
                    existing_card.is_rookie_card = is_rookie
                    existing_card.team = str(team) if team and not pd.isna(team) else None
                    existing_card.notes = notes
                    result.cards_updated += 1
                else:
                    # Create new
                    new_card = Checklist(
                        product_line_id=product_line_id,
                        card_number=card_number,
                        player_id=player_id,
                        player_name_raw=str(player_name) if player_name else None,
                        card_type_id=card_type_id,
                        parallel_name=parallel_name,
                        serial_numbered=serial_numbered,
                        is_autograph=is_auto,
                        is_relic=is_relic,
                        is_rookie_card=is_rookie,
                        team=str(team) if team and not pd.isna(team) else None,
                        notes=notes,
                    )
                    self.db.add(new_card)
                    result.cards_created += 1
                
            except Exception as e:
                result.errors.append(f"Row {idx + 1}: {str(e)}")
        
        await self.db.flush()
        return result