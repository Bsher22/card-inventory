"""
eBay Listing Generation Service

Generates eBay-ready listing data from inventory items.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Inventory, Checklist, ProductLine, Player, CardBaseType, Parallel
from app.schemas.ebay import EbayListingData, EbayItemSpecifics


# Authentication company display names for eBay
AUTH_COMPANY_DISPLAY = {
    "PSA/DNA": "Professional Sports Authenticator (PSA)",
    "Beckett": "Beckett Authentication Services",
}

# Base type to manufacturer mapping
BASE_TYPE_MANUFACTURER = {
    "Paper": "Topps",
    "Chrome": "Bowman",
    "Mega": "Bowman",
    "Sapphire": "Bowman",
}


class EbayListingService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def generate_listings(self, inventory_ids: list[UUID]) -> list[EbayListingData]:
        """Generate eBay listing data for the given inventory IDs"""
        
        # Fetch inventory items with all related data
        query = (
            select(Inventory)
            .options(
                selectinload(Inventory.checklist).selectinload(Checklist.product_line).selectinload(ProductLine.brand),
                selectinload(Inventory.checklist).selectinload(Checklist.player),
                selectinload(Inventory.base_type),
                selectinload(Inventory.parallel),
            )
            .where(Inventory.id.in_(inventory_ids))
        )
        
        result = await self.db.execute(query)
        items = result.scalars().all()
        
        listings = []
        for item in items:
            listing = self._generate_listing(item)
            if listing:
                listings.append(listing)
        
        return listings
    
    def _generate_listing(self, item: Inventory) -> Optional[EbayListingData]:
        """Generate listing data for a single inventory item"""
        
        checklist = item.checklist
        if not checklist:
            return None
        
        product_line = checklist.product_line
        if not product_line:
            return None
        
        player = checklist.player
        player_name = player.name if player else checklist.player_name_raw or "Unknown"
        team = checklist.team or (player.team if player else None)
        
        # Get base type and parallel info
        base_type = item.base_type
        parallel = item.parallel
        
        base_type_name = base_type.name if base_type else "Chrome"
        parallel_name = parallel.name if parallel else None
        
        # Calculate pricing
        per_unit_cost = (item.total_cost / item.quantity) if item.quantity > 0 else Decimal("0")
        min_price = per_unit_cost * 2  # 2x markup
        
        # Build the title
        title = self._build_title(
            player_name=player_name,
            year=product_line.year,
            product_name=product_line.name,
            base_type=base_type_name,
            parallel_name=parallel_name,
            card_number=checklist.card_number,
            team=team,
            is_signed=item.is_signed,
            is_first_bowman=getattr(checklist, 'is_first_bowman', False),
            is_slabbed=item.is_slabbed,
            grade_company=item.grade_company,
            grade_value=item.grade_value,
            serial_numbered=parallel.serial_numbered if parallel else checklist.serial_numbered,
            auth_company=getattr(item, 'auth_company', 'PSA/DNA') if item.is_signed else None,
        )
        
        # Build item specifics
        item_specifics = self._build_item_specifics(
            player_name=player_name,
            year=product_line.year,
            product_name=product_line.name,
            base_type=base_type_name,
            parallel_name=parallel_name,
            card_number=checklist.card_number,
            team=team,
            is_signed=item.is_signed,
            is_first_bowman=getattr(checklist, 'is_first_bowman', False),
            is_rookie=checklist.is_rookie_card,
            serial_numbered=parallel.serial_numbered if parallel else checklist.serial_numbered,
            auth_company=getattr(item, 'auth_company', 'PSA/DNA') if item.is_signed else None,
        )
        
        return EbayListingData(
            inventory_id=item.id,
            title=title,
            min_price=min_price,
            cost_basis=item.total_cost,
            quantity=item.quantity,
            per_unit_cost=per_unit_cost,
            item_specifics=item_specifics,
            player_name=player_name,
            card_number=checklist.card_number,
            year=product_line.year,
            product_name=product_line.name,
            parallel_name=parallel_name,
            serial_numbered=parallel.serial_numbered if parallel else checklist.serial_numbered,
            serial_number=item.serial_number,
            is_signed=item.is_signed,
            is_slabbed=item.is_slabbed,
            is_first_bowman=getattr(checklist, 'is_first_bowman', False),
            is_rookie=checklist.is_rookie_card,
            grade_company=item.grade_company,
            grade_value=item.grade_value,
            auth_company=getattr(item, 'auth_company', 'PSA/DNA') if item.is_signed else None,
        )
    
    def _build_title(
        self,
        player_name: str,
        year: int,
        product_name: str,
        base_type: str,
        parallel_name: Optional[str],
        card_number: str,
        team: Optional[str],
        is_signed: bool,
        is_first_bowman: bool,
        is_slabbed: bool,
        grade_company: Optional[str],
        grade_value: Optional[Decimal],
        serial_numbered: Optional[int],
        auth_company: Optional[str],
    ) -> str:
        """
        Build an eBay title (max 80 characters).
        
        Format patterns based on your actual listings:
        - Signed: [PLAYER] SIGNED [YEAR] [Product] [Parallel?] [1st?] Auto [Team] [Auth] [Card#]
        - Unsigned: [YEAR] [Product] [Parallel] #[Card#] [Player] [Team]
        - Slabbed: [YEAR] [Product] [Parallel?] #[Card#] [Player] [Grade] [Team]
        """
        parts = []
        
        # Get team abbreviation
        team_abbrev = self._get_team_abbrev(team) if team else None
        
        if is_signed:
            # Signed card format: PLAYER SIGNED YEAR Product Parallel 1st Auto Team Auth Card#
            parts.append(player_name.upper())
            parts.append("SIGNED")
            parts.append(str(year))
            
            # Product name (simplified)
            product_short = self._simplify_product_name(product_name, base_type)
            parts.append(product_short)
            
            # Parallel (if not base)
            if parallel_name and parallel_name.lower() not in ['base', 'refractor']:
                parts.append(parallel_name)
            
            # 1st Bowman indicator
            if is_first_bowman:
                parts.append("1st")
            
            # Autograph indicators
            parts.append("Autograph Auto")
            
            # Team
            if team_abbrev:
                parts.append(team_abbrev)
            
            # Auth company
            if auth_company:
                parts.append(auth_company)
            
            # Card number
            parts.append(card_number)
            
        elif is_slabbed:
            # Slabbed card format: YEAR Product Parallel #Card# Player Grade Team
            parts.append(str(year))
            
            product_short = self._simplify_product_name(product_name, base_type)
            parts.append(product_short)
            
            if parallel_name and parallel_name.lower() not in ['base', 'refractor']:
                parts.append(parallel_name)
            
            parts.append(f"#{card_number}")
            parts.append(player_name)
            
            # Grade
            if grade_company and grade_value:
                parts.append(f"{grade_company} {grade_value}")
            
            if team_abbrev:
                parts.append(team_abbrev)
                
        else:
            # Unsigned raw card format: YEAR Product Parallel #Card# Player Team
            parts.append(str(year))
            
            product_short = self._simplify_product_name(product_name, base_type)
            parts.append(product_short)
            
            if parallel_name and parallel_name.lower() not in ['base', 'refractor']:
                parts.append(parallel_name)
            
            # Serial numbering
            if serial_numbered:
                parts.append(f"/{serial_numbered}")
            
            parts.append(f"#{card_number}")
            parts.append(player_name)
            
            if team_abbrev:
                parts.append(team_abbrev)
        
        # Join and truncate to 80 chars
        title = " ".join(parts)
        if len(title) > 80:
            title = title[:77] + "..."
        
        return title
    
    def _simplify_product_name(self, product_name: str, base_type: str) -> str:
        """Simplify product name for title"""
        # Common patterns: "Bowman Chrome", "Bowman Draft", "Bowman"
        name = product_name.lower()
        
        if "sapphire" in name:
            return "Bowman Chrome Sapphire"
        elif "chrome" in name and "draft" in name:
            return "Bowman Draft Chrome"
        elif "draft" in name:
            return "Bowman Draft"
        elif "chrome" in name:
            return "Bowman Chrome"
        elif base_type.lower() == "sapphire":
            return "Bowman Chrome Sapphire"
        elif base_type.lower() == "chrome":
            return "Bowman Chrome"
        else:
            return "Bowman"
    
    def _get_team_abbrev(self, team: str) -> Optional[str]:
        """Convert team name to abbreviation"""
        TEAM_ABBREVS = {
            "Arizona Diamondbacks": "D-backs",
            "Atlanta Braves": "Braves",
            "Baltimore Orioles": "Orioles",
            "Boston Red Sox": "Red Sox",
            "Chicago Cubs": "Cubs",
            "Chicago White Sox": "White Sox",
            "Cincinnati Reds": "Reds",
            "Cleveland Guardians": "Guardians",
            "Colorado Rockies": "Rockies",
            "Detroit Tigers": "Tigers",
            "Houston Astros": "Astros",
            "Kansas City Royals": "Royals",
            "Los Angeles Angels": "Angels",
            "Los Angeles Dodgers": "Dodgers",
            "Miami Marlins": "Marlins",
            "Milwaukee Brewers": "Brewers",
            "Minnesota Twins": "Twins",
            "New York Mets": "Mets",
            "New York Yankees": "Yankees",
            "Oakland Athletics": "A's",
            "Philadelphia Phillies": "Phillies",
            "Pittsburgh Pirates": "Pirates",
            "San Diego Padres": "Padres",
            "San Francisco Giants": "Giants",
            "Seattle Mariners": "Mariners",
            "St. Louis Cardinals": "Cardinals",
            "Tampa Bay Rays": "Rays",
            "Texas Rangers": "Rangers",
            "Toronto Blue Jays": "Blue Jays",
            "Washington Nationals": "Nationals",
        }
        
        # Direct lookup
        if team in TEAM_ABBREVS:
            return TEAM_ABBREVS[team]
        
        # Partial match
        team_lower = team.lower()
        for full_name, abbrev in TEAM_ABBREVS.items():
            if abbrev.lower() in team_lower or full_name.lower() in team_lower:
                return abbrev
        
        # Return last word if no match (usually the team name)
        return team.split()[-1] if team else None
    
    def _build_item_specifics(
        self,
        player_name: str,
        year: int,
        product_name: str,
        base_type: str,
        parallel_name: Optional[str],
        card_number: str,
        team: Optional[str],
        is_signed: bool,
        is_first_bowman: bool,
        is_rookie: bool,
        serial_numbered: Optional[int],
        auth_company: Optional[str],
    ) -> EbayItemSpecifics:
        """Build eBay item specifics"""
        
        # Determine manufacturer
        manufacturer = "Bowman"
        if base_type.lower() == "paper":
            manufacturer = "Topps"
        
        # Build set name
        set_name = f"{year} {self._simplify_product_name(product_name, base_type)}"
        
        # Determine features
        features = []
        if is_rookie or is_first_bowman:
            features.append("Rookie")
        if parallel_name and parallel_name.lower() not in ['base', 'refractor']:
            features.append("Parallel/Variety")
        
        specifics = EbayItemSpecifics(
            set=set_name,
            season=str(year),
            player_athlete=player_name,
            team=team,
            card_number=card_number,
            manufacturer=manufacturer,
            parallel_variety=parallel_name if parallel_name and parallel_name.lower() not in ['base'] else None,
            features=", ".join(features) if features else None,
            serial_numbered=f"/{serial_numbered}" if serial_numbered else None,
        )
        
        # Add autograph specifics if signed
        if is_signed:
            specifics.autographed = "Yes"
            specifics.autograph_format = "Hard Signed"
            specifics.signed_by = player_name.lower()
            
            if auth_company:
                display_auth = AUTH_COMPANY_DISPLAY.get(auth_company.upper(), auth_company)
                specifics.autograph_authentication = display_auth
        
        return specifics
