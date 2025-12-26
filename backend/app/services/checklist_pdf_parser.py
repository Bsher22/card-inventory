"""
Bowman Checklist PDF Parser Service
Parses Bowman, Bowman Chrome, and Bowman Draft checklists from PDF files
Filters to only prospect cards and prospect autographs
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple, Tuple
from pathlib import Path
from enum import Enum

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


# ============================================
# ENUMS AND CONSTANTS
# ============================================

class ProductType(Enum):
    BOWMAN = "Bowman"
    BOWMAN_CHROME = "Bowman Chrome"
    BOWMAN_DRAFT = "Bowman Draft"
    BOWMAN_SAPPHIRE = "Bowman Sapphire"


# Card prefixes we care about (prospects and prospect autos only)
PROSPECT_PREFIXES = {
    # Paper Prospects
    'BP': {'type': 'Paper Prospects', 'is_auto': False, 'base_type': 'Paper'},
    
    # Chrome Prospects
    'BCP': {'type': 'Chrome Prospects', 'is_auto': False, 'base_type': 'Chrome'},
    'BCPD': {'type': 'Chrome Prospects Die Cut', 'is_auto': False, 'base_type': 'Chrome'},
    
    # Draft Base/Chrome
    'BD': {'type': 'Draft Base Prospects', 'is_auto': False, 'base_type': 'Paper'},
    'BDC': {'type': 'Draft Chrome Prospects', 'is_auto': False, 'base_type': 'Chrome'},
    
    # Autographs
    'CPA': {'type': 'Chrome Prospect Autographs', 'is_auto': True, 'base_type': 'Chrome'},
    'BPA': {'type': 'Paper Prospect Autographs', 'is_auto': True, 'base_type': 'Paper'},
    'PPRA': {'type': 'Paper Prospect Retail Autographs', 'is_auto': True, 'base_type': 'Paper'},
    'PDA': {'type': 'Prospect Dual Autographs', 'is_auto': True, 'base_type': 'Chrome'},
    'DBPA': {'type': 'Dual Bowman Prospect Autographs', 'is_auto': True, 'base_type': 'Chrome'},
    'DPPA': {'type': 'Draft Portrait Autographs', 'is_auto': True, 'base_type': 'Chrome'},
    'PCS': {'type': 'Prime Chrome Signatures', 'is_auto': True, 'base_type': 'Chrome'},
    
    # Insert sets (prospects)
    'FD': {'type': 'Final Draft', 'is_auto': False, 'base_type': 'Chrome'},
    'IT': {'type': 'In Tune', 'is_auto': False, 'base_type': 'Chrome'},
    'PP': {'type': 'Plasma Power', 'is_auto': False, 'base_type': 'Chrome'},
    'BIA': {'type': 'Bowman In Action', 'is_auto': False, 'base_type': 'Chrome'},
    'BS': {'type': 'Bowman Spotlights', 'is_auto': False, 'base_type': 'Chrome'},
    'BDN': {'type': 'Bowman Draft Night', 'is_auto': False, 'base_type': 'Chrome'},
    'BA': {'type': 'Bowman Ascensions', 'is_auto': False, 'base_type': 'Chrome'},
    'BGP': {'type': 'Bowman GPK', 'is_auto': False, 'base_type': 'Chrome'},
}

# Section headers that indicate autograph sections
AUTO_SECTION_HEADERS = [
    'AUTOGRAPH',
    'CHROME PROSPECT AUTOGRAPH',
    'PAPER PROSPECT AUTOGRAPH',
    'DUAL AUTOGRAPH',
    'BOWMAN IN ACTION AUTOGRAPH',
    'PRIME CHROME SIGNATURES',
]

# Section headers to skip (not prospects)
SKIP_SECTIONS = [
    'BASE CARDS',  # Main set veterans/rookies, not prospects
    'CHROME ROOKIE AUTOGRAPHS',  # Rookies, not prospects
    'BOWMAN BUYBACK',
    'ALL AMERICA GAME AUTOGRAPHS',  # Usually just player names, no card numbers
    'UNDER ARMOUR GAME',
]

# Teams to clean up
TEAM_SUFFIXES = ['®', '™']


# ============================================
# DATA CLASSES
# ============================================

@dataclass
class ParsedCard:
    """Represents a single parsed card from the checklist"""
    card_number: str
    card_prefix: str
    card_suffix: str
    player_name: str
    team: str
    is_autograph: bool
    is_rookie: bool
    set_name: str
    base_type: str
    raw_line: str
    
    def to_dict(self) -> dict:
        return {
            'card_number': self.card_number,
            'card_prefix': self.card_prefix,
            'card_suffix': self.card_suffix,
            'player_name': self.player_name,
            'team': self.team,
            'is_autograph': self.is_autograph,
            'is_rookie': self.is_rookie,
            'set_name': self.set_name,
            'base_type': self.base_type,
            'raw_line': self.raw_line,
        }


@dataclass
class ChecklistParseResult:
    """Result of parsing a checklist PDF"""
    product_name: str
    year: int
    product_type: ProductType
    cards: List[ParsedCard] = field(default_factory=list)
    total_lines_processed: int = 0
    prospect_cards_found: int = 0
    skipped_non_prospect: int = 0
    parse_errors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            'product_name': self.product_name,
            'year': self.year,
            'product_type': self.product_type.value,
            'cards': [c.to_dict() for c in self.cards],
            'stats': {
                'total_lines_processed': self.total_lines_processed,
                'prospect_cards_found': self.prospect_cards_found,
                'skipped_non_prospect': self.skipped_non_prospect,
                'parse_errors': len(self.parse_errors),
            }
        }


# ============================================
# PARSER CLASS
# ============================================

class BowmanChecklistParser:
    """
    Parser for Bowman family checklist PDFs
    Extracts only prospect cards and prospect autographs
    """
    
    def __init__(self):
        self.current_section: Optional[str] = None
        self.is_autograph_section: bool = False
        self.skip_section: bool = False
        
    def parse_pdf(self, pdf_path: str) -> ChecklistParseResult:
        """
        Parse a Bowman checklist PDF file
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            ChecklistParseResult with all parsed prospect cards
        """
        path = Path(pdf_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        
        # Detect product info from filename
        product_name, year, product_type = self._detect_product_info(path.name)
        
        result = ChecklistParseResult(
            product_name=product_name,
            year=year,
            product_type=product_type,
        )
        
        # Reset parser state
        self.current_section = None
        self.is_autograph_section = False
        self.skip_section = False
        
        try:
            doc = fitz.open(pdf_path)
            
            # Collect all lines from all pages
            all_lines = []
            for page in doc:
                text = page.get_text()
                lines = [l.strip() for l in text.split('\n') if l.strip()]
                all_lines.extend(lines)
            
            doc.close()
            
            # Process lines with lookahead for multi-line card entries
            i = 0
            while i < len(all_lines):
                line = all_lines[i]
                result.total_lines_processed += 1
                
                # Check for section headers
                if self._is_section_header(line):
                    self._update_section(line)
                    i += 1
                    continue
                
                # Skip if in a non-prospect section
                if self.skip_section:
                    result.skipped_non_prospect += 1
                    i += 1
                    continue
                
                # Try to parse as a card line (with lookahead)
                parsed, lines_consumed = self._parse_card_multiline(
                    all_lines, i, result.product_type
                )
                if parsed:
                    result.cards.append(parsed)
                    result.prospect_cards_found += 1
                    i += lines_consumed
                else:
                    i += 1
            
        except Exception as e:
            result.parse_errors.append(f"PDF parsing error: {str(e)}")
            logger.error(f"Error parsing {pdf_path}: {e}")
        
        return result
    
    def _detect_product_info(self, filename: str) -> Tuple[str, int, ProductType]:
        """Detect product name, year, and type from filename"""
        filename_lower = filename.lower()
        
        # Extract year (look for 4-digit year or 2-digit)
        year_match = re.search(r'(20\d{2})', filename)
        if year_match:
            year = int(year_match.group(1))
        else:
            # Try 2-digit year
            year_match = re.search(r'(\d{2})(?:bowman|mlb)', filename_lower)
            if year_match:
                yr = int(year_match.group(1))
                year = 2000 + yr if yr < 50 else 1900 + yr
            else:
                year = 2024  # Default
        
        # Detect product type
        if 'draft' in filename_lower:
            product_type = ProductType.BOWMAN_DRAFT
            product_name = f"{year} Bowman Draft"
        elif 'sapphire' in filename_lower:
            product_type = ProductType.BOWMAN_SAPPHIRE
            product_name = f"{year} Bowman Sapphire"
        elif 'chrome' in filename_lower:
            product_type = ProductType.BOWMAN_CHROME
            product_name = f"{year} Bowman Chrome"
        else:
            product_type = ProductType.BOWMAN
            product_name = f"{year} Bowman"
        
        return product_name, year, product_type
    
    def _is_section_header(self, line: str) -> bool:
        """Check if line is a section header"""
        line_upper = line.upper().strip()
        
        # Exact matches for known headers
        exact_headers = [
            'BASE', 'BASE CARDS', 'INSERT', 'AUTOGRAPH',
            'PAPER PROSPECTS', 'PAPER PROSPECTS I', 'PAPER PROSPECTS II',
            'CHROME PROSPECTS', 'CHROME PROSPECTS I', 'CHROME PROSPECTS II',
            'CHROME PROSPECT AUTOGRAPHS', 'BOWMAN SPOTLIGHTS',
            'BOWMAN ASCENSIONS', 'FINAL DRAFT', 'PLASMA POWER', 'IN TUNE',
            'BOWMAN IN ACTION', 'BOWMAN DRAFT NIGHT', 'IMAGE VARIATION',
            'ETCHED IN GLASS', 'ROY FAVORITES', 'PROSPECT DUAL',
            'PRIME CHROME', 'ALL AMERICA', 'BOWMAN BUYBACK', 'RETROFRACTOR',
            'INTERNATIONAL', 'ANIME', 'BOWMAN GPK', 'HOBBY STARS',
            'VERY IMPORTANT PROSPECTS', 'ROCKSTAR ROOKIES', 'CRYSTALIZED',
            'GREATNESS LOADING', 'BOWMAN SCOUTS TOP 100', 'MELT MASHERS',
            'MAX VOLUME', 'ADIOS', 'METEORIC RISE', 'IT CAME TO THE LEAGUE',
        ]
        
        for header in exact_headers:
            if line_upper == header or line_upper.startswith(header + ' '):
                return True
        
        # Pattern-based headers
        header_patterns = [
            r'^BASE\s*CARDS',
            r'^CHROME\s+PROSPECTS?\s*(I{1,3}|[IVX]+)?$',
            r'^PAPER\s+PROSPECTS?\s*(I{1,3}|[IVX]+)?$',
            r'^CHROME\s+PROSPECT\s+AUTOGRAPH',
            r'^PAPER\s+PROSPECT\s+AUTOGRAPH',
            r'^BOWMAN\s+SPOTLIGHTS',
            r'^BOWMAN\s+ASCENSIONS',
            r'^BOWMAN\s+SCOUTS',
            r'^BOWMAN\s+GPK',
            r'^PRIME\s+CHROME',
            r'^VERY\s+IMPORTANT',
            r'^ROCKSTAR',
            r'^ROY\s+FAVORITES',
            r'VARIATION$',
            r'AUTOGRAPH\s+VARIATION$',
        ]
        
        for pattern in header_patterns:
            if re.search(pattern, line_upper):
                return True
        
        return False
    
    def _update_section(self, header: str):
        """Update current section based on header"""
        header_upper = header.upper().strip()
        self.current_section = header_upper
        
        # Check if this is an autograph section
        self.is_autograph_section = any(
            auto_header in header_upper 
            for auto_header in AUTO_SECTION_HEADERS
        )
        
        # Determine if we should skip this section
        # By default, skip unless it's a prospect section
        self.skip_section = True
        
        # Sections we WANT to process (prospects)
        prospect_sections = [
            'CHROME PROSPECT',
            'PAPER PROSPECT',
            'BOWMAN SPOTLIGHTS',
            'BOWMAN ASCENSIONS',
            'FINAL DRAFT',
            'PLASMA POWER',
            'IN TUNE',
            'BOWMAN IN ACTION',
            'BOWMAN DRAFT NIGHT',
            'PRIME CHROME SIGNATURE',
            'PROSPECT DUAL',
            'VERY IMPORTANT PROSPECT',
            'GREATNESS LOADING',
            'ROCKSTAR ROOKIES',
            'CRYSTALIZED',
            'ROY FAVORITES',
            'HOBBY STARS',
            'MELT MASHERS',
            'MAX VOLUME',
            'ADIOS',
            'METEORIC RISE',
            'IT CAME TO THE LEAGUE',
            'BOWMAN GPK',
            'BOWMAN SCOUTS TOP',
            'ANIME',
        ]
        
        for section in prospect_sections:
            if section in header_upper:
                self.skip_section = False
                break
        
        # Also check for autograph variations of insert sets
        if 'AUTOGRAPH' in header_upper and not self.skip_section:
            self.is_autograph_section = True
        
        logger.debug(f"Section: {header_upper}, Skip: {self.skip_section}, Auto: {self.is_autograph_section}")
    
    def _parse_card_multiline(
        self, lines: List[str], start_idx: int, product_type: ProductType
    ) -> Tuple[Optional[ParsedCard], int]:
        """
        Parse a card entry that may span multiple lines
        
        Format patterns:
        1. "BCP-167" + "Roman Anthony" + "Boston Red Sox®" [+ "Rookie"]
        2. "BCP-167 Roman Anthony" + "Boston Red Sox®" [+ "Rookie"]
        3. "167 Roman Anthony" + "Boston Red Sox®" [+ "Rookie"]
        4. "CPA-RA" + "Roman Anthony" + "Boston Red Sox®"
        
        Returns:
            Tuple of (ParsedCard or None, number of lines consumed)
        """
        if start_idx >= len(lines):
            return None, 1
        
        line1 = lines[start_idx]
        
        # Pattern 1: Just a card number alone (e.g., "BCP-167" or "CPA-RA")
        just_number_match = re.match(r'^([A-Z]+)-?(\d+[A-Z]*|[A-Z]+\d*)$', line1)
        
        if just_number_match:
            prefix = just_number_match.group(1).upper()
            suffix = just_number_match.group(2)
            card_number = f"{prefix}-{suffix}"
            
            # Check if this is a prefix we care about
            if prefix not in PROSPECT_PREFIXES:
                return None, 1
            
            # Player name should be on next line
            if start_idx + 1 >= len(lines):
                return None, 1
            
            player_name = lines[start_idx + 1].strip()
            
            # Team should be on line after that
            if start_idx + 2 >= len(lines):
                return None, 1
            
            team_line = lines[start_idx + 2].strip()
            if not self._is_team_line(team_line):
                return None, 1
            
            team = self._clean_team_name(team_line)
            lines_consumed = 3
            
            # Check for "Rookie" on following line
            is_rookie = False
            if start_idx + 3 < len(lines):
                rookie_line = lines[start_idx + 3].strip()
                if rookie_line.lower() == 'rookie':
                    is_rookie = True
                    lines_consumed = 4
            
            prefix_info = PROSPECT_PREFIXES[prefix]
            is_auto = prefix_info.get('is_auto', False) or self.is_autograph_section
            
            raw_line = ' | '.join(lines[start_idx:start_idx + lines_consumed])
            
            return ParsedCard(
                card_number=card_number,
                card_prefix=prefix,
                card_suffix=suffix,
                player_name=player_name,
                team=team,
                is_autograph=is_auto,
                is_rookie=is_rookie,
                set_name=prefix_info.get('type', 'Unknown'),
                base_type=prefix_info.get('base_type', 'Chrome'),
                raw_line=raw_line,
            ), lines_consumed
        
        # Pattern 2: PREFIX-SUFFIX Player Name (e.g., "BCP-167 Roman Anthony")
        prefix_with_name_match = re.match(r'^([A-Z]+)-?(\d+[A-Z]*|[A-Z]+\d*)\s+(.+)$', line1)
        
        if prefix_with_name_match:
            prefix = prefix_with_name_match.group(1).upper()
            suffix = prefix_with_name_match.group(2)
            player_name = prefix_with_name_match.group(3).strip()
            card_number = f"{prefix}-{suffix}"
            
            if prefix not in PROSPECT_PREFIXES:
                return None, 1
            
            # Look for team on next line
            team = None
            is_rookie = False
            lines_consumed = 1
            
            if start_idx + 1 < len(lines):
                next_line = lines[start_idx + 1]
                if self._is_team_line(next_line):
                    team = self._clean_team_name(next_line)
                    lines_consumed = 2
                    
                    if start_idx + 2 < len(lines):
                        rookie_line = lines[start_idx + 2].strip()
                        if rookie_line.lower() == 'rookie':
                            is_rookie = True
                            lines_consumed = 3
            
            if not team:
                return None, 1
            
            prefix_info = PROSPECT_PREFIXES[prefix]
            is_auto = prefix_info.get('is_auto', False) or self.is_autograph_section
            
            raw_line = ' | '.join(lines[start_idx:start_idx + lines_consumed])
            
            return ParsedCard(
                card_number=card_number,
                card_prefix=prefix,
                card_suffix=suffix,
                player_name=player_name,
                team=team,
                is_autograph=is_auto,
                is_rookie=is_rookie,
                set_name=prefix_info.get('type', 'Unknown'),
                base_type=prefix_info.get('base_type', 'Chrome'),
                raw_line=raw_line,
            ), lines_consumed
        
        # Pattern 3: Just number + name (e.g., "167 Roman Anthony") - for sections with implicit prefix
        number_match = re.match(r'^(\d+)\s+(.+)$', line1)
        
        if number_match and self.current_section and 'PROSPECT' in self.current_section.upper():
            prefix = self._infer_prefix_from_section()
            suffix = number_match.group(1)
            player_name = number_match.group(2).strip()
            card_number = f"{prefix}-{suffix}" if prefix else suffix
            
            # Look for team on next line
            if start_idx + 1 < len(lines) and self._is_team_line(lines[start_idx + 1]):
                team = self._clean_team_name(lines[start_idx + 1])
                lines_consumed = 2
                is_rookie = False
                
                if start_idx + 2 < len(lines):
                    rookie_line = lines[start_idx + 2].strip()
                    if rookie_line.lower() == 'rookie':
                        is_rookie = True
                        lines_consumed = 3
                
                prefix_info = PROSPECT_PREFIXES.get(prefix, {
                    'type': self.current_section or 'Unknown',
                    'is_auto': self.is_autograph_section,
                    'base_type': 'Chrome'
                })
                is_auto = prefix_info.get('is_auto', False) or self.is_autograph_section
                
                raw_line = ' | '.join(lines[start_idx:start_idx + lines_consumed])
                
                return ParsedCard(
                    card_number=card_number,
                    card_prefix=prefix,
                    card_suffix=suffix,
                    player_name=player_name,
                    team=team,
                    is_autograph=is_auto,
                    is_rookie=is_rookie,
                    set_name=prefix_info.get('type', 'Unknown'),
                    base_type=prefix_info.get('base_type', 'Chrome'),
                    raw_line=raw_line,
                ), lines_consumed
        
        return None, 1
    
    def _is_team_line(self, line: str) -> bool:
        """Check if a line is likely a team name"""
        line = line.strip()
        teams = [
            'Angels', 'Athletics', 'Astros', 'Blue Jays', 'Braves', 'Brewers',
            'Cardinals', 'Cubs', 'Diamondbacks', 'Dodgers', 'Giants', 'Guardians',
            'Indians', 'Mariners', 'Marlins', 'Mets', 'Nationals', 'Orioles',
            'Padres', 'Phillies', 'Pirates', 'Rays', 'Red Sox', 'Reds', 'Rangers',
            'Rockies', 'Royals', 'Tigers', 'Twins', 'White Sox', 'Yankees'
        ]
        # Clean the line
        clean = re.sub(r'[®™]', '', line).strip()
        
        # Check for city + team or just team
        for team in teams:
            if team.lower() in clean.lower():
                return True
        return False
    
    def _clean_team_name(self, team_line: str) -> str:
        """Clean up team name"""
        team = team_line.strip()
        for char in TEAM_SUFFIXES:
            team = team.replace(char, '')
        return team.strip()
    
    def _infer_prefix_from_section(self) -> str:
        """Infer card prefix from current section name"""
        section = (self.current_section or '').upper()
        
        if 'CHROME PROSPECT' in section and 'AUTO' in section:
            return 'CPA'
        elif 'PAPER PROSPECT' in section and 'AUTO' in section:
            return 'BPA'
        elif 'CHROME PROSPECT' in section:
            return 'BCP'
        elif 'PAPER PROSPECT' in section:
            return 'BP'
        elif 'BOWMAN SPOTLIGHTS' in section:
            return 'BS'
        elif 'BOWMAN ASCENSIONS' in section:
            return 'BA'
        elif 'FINAL DRAFT' in section:
            return 'FD'
        elif 'PLASMA POWER' in section:
            return 'PP'
        elif 'IN TUNE' in section:
            return 'IT'
        elif 'BOWMAN IN ACTION' in section:
            return 'BIA'
        elif 'BOWMAN DRAFT NIGHT' in section:
            return 'BDN'
        elif 'PRIME CHROME' in section:
            return 'PCS'
        
        return 'BCP'  # Default to Chrome Prospects
    
    def _parse_card_line(self, line: str, product_type: ProductType) -> Optional[ParsedCard]:
        """
        Parse a single card line
        
        Expected formats:
        - "BCP-167 Roman Anthony Boston Red Sox®"
        - "CPA-RA Roman Anthony Boston Red Sox®"
        - "BD-19 Roman Anthony Boston Red Sox® Rookie"
        """
        line = line.strip()
        if not line:
            return None
        
        # Pattern: PREFIX-SUFFIX Player Name Team [Rookie]
        # More flexible pattern to handle various formats
        patterns = [
            # Standard format: BCP-123 Player Name Team
            r'^([A-Z]+)-?(\d+[A-Z]*|[A-Z]+\d*)\s+(.+?)\s+((?:Angels|Athletics|Astros|Blue Jays|Braves|Brewers|Cardinals|Cubs|Diamondbacks|Dodgers|Giants|Guardians|Indians|Mariners|Marlins|Mets|Nationals|Orioles|Padres|Phillies|Pirates|Rays|Red Sox|Reds|Rangers|Rockies|Royals|Tigers|Twins|White Sox|Yankees)[®™]?)(\s+Rookie)?$',
            
            # Format with full team name: BCP-123 Player Name City Team
            r'^([A-Z]+)-?(\d+[A-Z]*|[A-Z]+\d*)\s+(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Angels|Athletics|Astros|Blue Jays|Braves|Brewers|Cardinals|Cubs|Diamondbacks|Dodgers|Giants|Guardians|Indians|Mariners|Marlins|Mets|Nationals|Orioles|Padres|Phillies|Pirates|Rays|Red Sox|Reds|Rangers|Rockies|Royals|Tigers|Twins|White Sox|Yankees)[®™]?)(\s+Rookie)?$',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                prefix = match.group(1).upper()
                suffix = match.group(2)
                player_name = match.group(3).strip()
                team = match.group(4).strip()
                is_rookie = bool(match.group(5))
                
                # Check if this is a prospect prefix we care about
                if prefix not in PROSPECT_PREFIXES:
                    return None
                
                prefix_info = PROSPECT_PREFIXES[prefix]
                
                # Clean up team name
                for suffix_char in TEAM_SUFFIXES:
                    team = team.replace(suffix_char, '')
                team = team.strip()
                
                # Determine if autograph (from section or prefix)
                is_auto = prefix_info['is_auto'] or self.is_autograph_section
                
                return ParsedCard(
                    card_number=f"{prefix}-{suffix}",
                    card_prefix=prefix,
                    card_suffix=suffix,
                    player_name=player_name,
                    team=team,
                    is_autograph=is_auto,
                    is_rookie=is_rookie,
                    set_name=prefix_info['type'],
                    base_type=prefix_info['base_type'],
                    raw_line=line,
                )
        
        # Try simpler pattern for lines that might just have number and name
        simple_match = re.match(r'^(\d+)\s+(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*[®™]?)(\s+Rookie)?$', line)
        if simple_match and self.current_section:
            # This is likely a base card in a prospects section
            # Only include if we're in a Chrome Prospects section
            if 'CHROME PROSPECT' in (self.current_section or '').upper():
                suffix = simple_match.group(1)
                player_name = simple_match.group(2).strip()
                team = simple_match.group(3).strip()
                is_rookie = bool(simple_match.group(4))
                
                for suffix_char in TEAM_SUFFIXES:
                    team = team.replace(suffix_char, '')
                
                return ParsedCard(
                    card_number=f"BCP-{suffix}",
                    card_prefix="BCP",
                    card_suffix=suffix,
                    player_name=player_name,
                    team=team.strip(),
                    is_autograph=self.is_autograph_section,
                    is_rookie=is_rookie,
                    set_name="Chrome Prospects",
                    base_type="Chrome",
                    raw_line=line,
                )
        
        return None
    
    def parse_multiple_pdfs(self, pdf_paths: List[str]) -> List[ChecklistParseResult]:
        """Parse multiple PDF files"""
        results = []
        for path in pdf_paths:
            try:
                result = self.parse_pdf(path)
                results.append(result)
                logger.info(
                    f"Parsed {path}: {result.prospect_cards_found} prospect cards found"
                )
            except Exception as e:
                logger.error(f"Failed to parse {path}: {e}")
        return results


# ============================================
# CONVENIENCE FUNCTIONS
# ============================================

def parse_bowman_checklist(pdf_path: str) -> ChecklistParseResult:
    """Parse a single Bowman checklist PDF"""
    parser = BowmanChecklistParser()
    return parser.parse_pdf(pdf_path)


def parse_all_bowman_checklists(directory: str) -> List[ChecklistParseResult]:
    """Parse all Bowman checklist PDFs in a directory"""
    parser = BowmanChecklistParser()
    pdf_files = list(Path(directory).glob("*.pdf"))
    return parser.parse_multiple_pdfs([str(p) for p in pdf_files])


# ============================================
# CLI FOR TESTING
# ============================================

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python checklist_pdf_parser.py <pdf_path> [output.json]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    parser = BowmanChecklistParser()
    result = parser.parse_pdf(pdf_path)
    
    print(f"\n{'='*60}")
    print(f"Parsed: {result.product_name}")
    print(f"Year: {result.year}")
    print(f"Product Type: {result.product_type.value}")
    print(f"{'='*60}")
    print(f"Total lines processed: {result.total_lines_processed}")
    print(f"Prospect cards found: {result.prospect_cards_found}")
    print(f"Skipped non-prospect: {result.skipped_non_prospect}")
    print(f"Parse errors: {len(result.parse_errors)}")
    print(f"{'='*60}")
    
    # Sample output
    print("\nSample cards (first 10):")
    for card in result.cards[:10]:
        auto_marker = " [AUTO]" if card.is_autograph else ""
        rookie_marker = " [RC]" if card.is_rookie else ""
        print(f"  {card.card_number}: {card.player_name} - {card.team}{auto_marker}{rookie_marker}")
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)
        print(f"\nFull results saved to: {output_path}")