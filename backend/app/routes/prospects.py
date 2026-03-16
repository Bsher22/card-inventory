"""
Top Prospects Routes

Scrapes MLB Pipeline and FanGraphs Top 100 prospect lists,
caches results, and cross-references against inventory.
"""

import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Inventory, Checklist, Player

router = APIRouter(prefix="/prospects", tags=["prospects"])

# Cache for 6 hours — these lists don't change often
_pipeline_cache: TTLCache = TTLCache(maxsize=5, ttl=21600)
_fangraphs_cache: TTLCache = TTLCache(maxsize=5, ttl=21600)
_team_prospects_cache: TTLCache = TTLCache(maxsize=60, ttl=21600)
_mlb_orgs_cache: TTLCache = TTLCache(maxsize=5, ttl=86400)  # 24h for org list

MLB_PIPELINE_URL = "https://www.mlb.com/prospects/top100"
FANGRAPHS_URL = "https://www.fangraphs.com/prospects/the-board/2026-prospect-list/summary?sort=-1,1&type=0&team=&pos=&pg=1"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


# ============================================
# RESPONSE SCHEMAS
# ============================================

class ProspectEntry(BaseModel):
    rank: int
    name: str
    team: str = ""
    position: str = ""
    age: Optional[int] = None
    source: str  # "pipeline" or "fangraphs"
    # Inventory cross-reference
    has_inventory: bool = False
    inventory_count: int = 0
    unsigned_count: int = 0
    signed_count: int = 0


class ProspectsResponse(BaseModel):
    pipeline: list[ProspectEntry] = []
    fangraphs: list[ProspectEntry] = []
    last_updated: Optional[str] = None


class MlbOrg(BaseModel):
    id: int
    name: str
    abbreviation: str


class TeamProspectsResponse(BaseModel):
    team_id: int
    team_name: str
    prospects: list[ProspectEntry] = []


# ============================================
# SCRAPING HELPERS
# ============================================

async def _scrape_pipeline() -> list[dict]:
    """Scrape MLB Pipeline Top 100 prospects."""
    cache_key = "pipeline_top100"
    if cache_key in _pipeline_cache:
        return _pipeline_cache[cache_key]

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(MLB_PIPELINE_URL, headers=HEADERS)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"MLB Pipeline returned {resp.status_code}",
            )

    soup = BeautifulSoup(resp.text, "html.parser")
    prospects = []

    # MLB Pipeline uses prospect cards with rank, name, team, position
    # Try multiple selectors for resilience
    rows = soup.select(".prospects-table__row, .top100__row, tr[data-idx]")

    if not rows:
        # Fallback: try to find any list of prospects
        # Look for numbered entries with player names
        items = soup.select(".prospect-item, .player-list__item, [class*='prospect']")
        for i, item in enumerate(items[:100], 1):
            name_el = item.select_one(".prospect-item__name, .player-name, a")
            team_el = item.select_one(".prospect-item__team, .team-name")
            pos_el = item.select_one(".prospect-item__position, .position")
            age_el = item.select_one(".prospect-item__age, .age")

            if name_el:
                prospects.append({
                    "rank": i,
                    "name": name_el.get_text(strip=True),
                    "team": team_el.get_text(strip=True) if team_el else "",
                    "position": pos_el.get_text(strip=True) if pos_el else "",
                    "age": _parse_age(age_el.get_text(strip=True)) if age_el else None,
                })

    if not prospects:
        # Final fallback: parse any table on the page
        tables = soup.select("table")
        for table in tables:
            headers = [th.get_text(strip=True).lower() for th in table.select("th")]
            if not headers:
                continue
            for row in table.select("tbody tr"):
                cells = [td.get_text(strip=True) for td in row.select("td")]
                if len(cells) >= 2:
                    entry = {"rank": len(prospects) + 1, "name": "", "team": "", "position": "", "age": None}
                    for j, h in enumerate(headers):
                        if j >= len(cells):
                            break
                        if "rank" in h or "#" in h:
                            try:
                                entry["rank"] = int(cells[j])
                            except ValueError:
                                pass
                        elif "name" in h or "player" in h:
                            entry["name"] = cells[j]
                        elif "team" in h or "org" in h:
                            entry["team"] = cells[j]
                        elif "pos" in h:
                            entry["position"] = cells[j]
                        elif "age" in h:
                            entry["age"] = _parse_age(cells[j])
                    if entry["name"]:
                        prospects.append(entry)

    # Also try JSON-LD or script data
    if not prospects:
        for script in soup.select("script"):
            text = script.string or ""
            if "prospects" in text.lower() and "rank" in text.lower():
                # Try to extract JSON data from script tags
                import json
                try:
                    # Look for JSON arrays in script content
                    matches = re.findall(r'\[{.*?"rank".*?}\]', text, re.DOTALL)
                    for match in matches:
                        data = json.loads(match)
                        for item in data[:100]:
                            prospects.append({
                                "rank": item.get("rank", len(prospects) + 1),
                                "name": item.get("name", item.get("playerName", item.get("fullName", ""))),
                                "team": item.get("team", item.get("orgName", "")),
                                "position": item.get("position", item.get("pos", "")),
                                "age": item.get("age"),
                            })
                        if prospects:
                            break
                except (json.JSONDecodeError, TypeError):
                    continue

    _pipeline_cache[cache_key] = prospects[:100]
    return prospects[:100]


async def _scrape_fangraphs() -> list[dict]:
    """Scrape FanGraphs Top 100 prospects from The Board."""
    cache_key = "fangraphs_top100"
    if cache_key in _fangraphs_cache:
        return _fangraphs_cache[cache_key]

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(FANGRAPHS_URL, headers=HEADERS)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"FanGraphs returned {resp.status_code}",
            )

    soup = BeautifulSoup(resp.text, "html.parser")
    prospects = []

    # FanGraphs "The Board" uses a table structure
    table = soup.select_one("table.prospect-table, .prospects-board table, table")

    if table:
        rows = table.select("tbody tr")
        for row in rows:
            cells = row.select("td")
            if len(cells) < 2:
                continue

            # Try to identify columns by header
            name_cell = None
            for cell in cells:
                link = cell.select_one("a")
                if link and "/players/" in (link.get("href") or ""):
                    name_cell = cell
                    break

            if not name_cell:
                # Fallback: second cell is usually the name
                name_cell = cells[1] if len(cells) > 1 else cells[0]

            name = name_cell.get_text(strip=True)
            if not name or name.lower() in ("name", "player"):
                continue

            entry = {
                "rank": len(prospects) + 1,
                "name": name,
                "team": "",
                "position": "",
                "age": None,
            }

            # Try to extract rank from first cell
            try:
                entry["rank"] = int(cells[0].get_text(strip=True))
            except (ValueError, IndexError):
                pass

            # Look for team/position/age in remaining cells
            for cell in cells:
                text = cell.get_text(strip=True)
                if len(text) <= 4 and text.upper() in (
                    "SS", "2B", "3B", "1B", "C", "OF", "CF", "RF", "LF",
                    "RHP", "LHP", "SP", "RP", "DH", "P", "IF", "UTIL"
                ):
                    entry["position"] = text
                elif _parse_age(text) and not entry["age"]:
                    entry["age"] = _parse_age(text)

            prospects.append(entry)

    # If table parsing failed, try an alternative API approach
    if not prospects:
        # FanGraphs sometimes loads data via AJAX
        api_url = "https://www.fangraphs.com/api/prospects/board/prospects-list?type=0&team=&pos=&pg=1"
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(api_url, headers=HEADERS)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data if isinstance(data, list) else data.get("data", data.get("prospects", []))
                    for i, item in enumerate(items[:100], 1):
                        prospects.append({
                            "rank": item.get("rank", item.get("Rank", i)),
                            "name": item.get("PlayerName", item.get("name", item.get("minorMasterName", ""))),
                            "team": item.get("Team", item.get("team", item.get("Org", ""))),
                            "position": item.get("Position", item.get("position", item.get("Pos", ""))),
                            "age": item.get("Age", item.get("age")),
                        })
        except Exception:
            pass

    _fangraphs_cache[cache_key] = prospects[:100]
    return prospects[:100]


def _parse_age(text: str) -> Optional[int]:
    """Parse age from text, returning None if not a valid age."""
    if not text:
        return None
    try:
        val = int(text)
        if 15 <= val <= 40:
            return val
    except ValueError:
        pass
    return None


def _normalize_name(name: str) -> str:
    """Normalize a player name for matching."""
    return name.strip().lower().replace(".", "").replace(",", "").replace("'", "")


async def _batch_inventory_lookup(
    db: AsyncSession,
    player_names: list[str],
) -> dict[str, dict]:
    """Look up inventory counts for a list of player names."""
    if not player_names:
        return {}

    normalized_names = [_normalize_name(n) for n in player_names]

    query = (
        select(
            func.coalesce(Player.name_normalized, func.lower(Checklist.player_name_raw)).label("player_name"),
            func.sum(Inventory.quantity).label("total_qty"),
            func.sum(
                func.case((Inventory.is_signed == False, Inventory.quantity), else_=0)
            ).label("unsigned_qty"),
            func.sum(
                func.case((Inventory.is_signed == True, Inventory.quantity), else_=0)
            ).label("signed_qty"),
        )
        .select_from(Inventory)
        .join(Checklist, Inventory.checklist_id == Checklist.id)
        .outerjoin(Player, Checklist.player_id == Player.id)
        .where(
            or_(
                func.lower(Player.name_normalized).in_(normalized_names),
                func.lower(Checklist.player_name_raw).in_(normalized_names),
            )
        )
        .where(Inventory.quantity > 0)
        .group_by(
            func.coalesce(Player.name_normalized, func.lower(Checklist.player_name_raw))
        )
    )

    result = await db.execute(query)
    rows = result.all()

    inventory_map = {}
    for row in rows:
        inventory_map[row.player_name] = {
            "total": row.total_qty or 0,
            "unsigned": row.unsigned_qty or 0,
            "signed": row.signed_qty or 0,
        }

    return inventory_map


async def _get_mlb_orgs() -> list[dict]:
    """Get all 30 MLB organizations."""
    cache_key = "mlb_orgs"
    if cache_key in _mlb_orgs_cache:
        return _mlb_orgs_cache[cache_key]

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(
            "https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2026",
            headers=HEADERS,
        )
        if resp.status_code != 200:
            return []

    data = resp.json()
    orgs = [
        {
            "id": t["id"],
            "name": t["name"],
            "abbreviation": t.get("abbreviation", ""),
        }
        for t in data.get("teams", [])
        if t.get("sport", {}).get("id") == 1
    ]
    orgs.sort(key=lambda o: o["name"])
    _mlb_orgs_cache[cache_key] = orgs
    return orgs


async def _scrape_team_prospects(team_id: int) -> tuple[str, list[dict]]:
    """
    Get top 30 prospects for an MLB organization.
    Uses the MLB Stats API draft prospects endpoint and FanGraphs Board API.
    Returns (team_name, prospects_list).
    """
    cache_key = f"team_{team_id}"
    if cache_key in _team_prospects_cache:
        return _team_prospects_cache[cache_key]

    # Get team name from orgs
    orgs = await _get_mlb_orgs()
    team_name = ""
    team_abbrev = ""
    for org in orgs:
        if org["id"] == team_id:
            team_name = org["name"]
            team_abbrev = org["abbreviation"]
            break

    prospects = []

    # Try MLB Stats API prospect rankings endpoint
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(
                f"https://statsapi.mlb.com/api/v1/teams/{team_id}/prospects?season=2026",
                headers=HEADERS,
            )
            if resp.status_code == 200:
                data = resp.json()
                for i, p in enumerate(data.get("prospects", [])[:30], 1):
                    person = p.get("person", {})
                    prospects.append({
                        "rank": p.get("rank", i),
                        "name": person.get("fullName", ""),
                        "team": team_name,
                        "position": person.get("primaryPosition", {}).get("abbreviation", ""),
                        "age": person.get("currentAge"),
                    })
    except Exception:
        pass

    # If MLB API didn't return prospects, try Pipeline team page
    if not prospects:
        try:
            # MLB Pipeline team prospect pages
            slug_map = _get_team_slug(team_id)
            if slug_map:
                url = f"https://www.mlb.com/{slug_map}/prospects"
                async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                    resp = await client.get(url, headers=HEADERS)
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        # Try to find prospect entries
                        items = soup.select("[class*='prospect'], .player-list__item, tr[data-idx]")
                        for i, item in enumerate(items[:30], 1):
                            name_el = item.select_one("a, .player-name, [class*='name']")
                            pos_el = item.select_one("[class*='position'], .position")
                            if name_el:
                                name_text = name_el.get_text(strip=True)
                                if name_text and name_text.lower() not in ("name", "player"):
                                    prospects.append({
                                        "rank": i,
                                        "name": name_text,
                                        "team": team_name,
                                        "position": pos_el.get_text(strip=True) if pos_el else "",
                                        "age": None,
                                    })
        except Exception:
            pass

    # If still no prospects, try FanGraphs Board API with team filter
    if not prospects and team_abbrev:
        try:
            fg_url = (
                f"https://www.fangraphs.com/api/prospects/board/prospects-list"
                f"?type=0&team={team_abbrev}&pos=&pg=1"
            )
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(fg_url, headers=HEADERS)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data if isinstance(data, list) else data.get("data", data.get("prospects", []))
                    for i, item in enumerate(items[:30], 1):
                        prospects.append({
                            "rank": item.get("rank", item.get("Rank", i)),
                            "name": item.get("PlayerName", item.get("name", item.get("minorMasterName", ""))),
                            "team": team_name,
                            "position": item.get("Position", item.get("position", item.get("Pos", ""))),
                            "age": item.get("Age", item.get("age")),
                        })
        except Exception:
            pass

    result = (team_name, prospects[:30])
    _team_prospects_cache[cache_key] = result
    return result


def _get_team_slug(team_id: int) -> Optional[str]:
    """Map MLB team ID to URL slug for Pipeline pages."""
    slugs = {
        108: "angels", 109: "diamondbacks", 110: "orioles", 111: "redsox",
        112: "cubs", 113: "reds", 114: "guardians", 115: "rockies",
        116: "tigers", 117: "astros", 118: "royals", 119: "dodgers",
        120: "nationals", 121: "mets", 133: "athletics", 134: "pirates",
        135: "padres", 136: "mariners", 137: "giants", 138: "cardinals",
        139: "rays", 140: "rangers", 141: "bluejays", 142: "twins",
        143: "phillies", 144: "braves", 145: "whitesox", 146: "marlins",
        147: "yankees", 158: "brewers",
    }
    return slugs.get(team_id)


# ============================================
# ROUTES
# ============================================

@router.get("/top100", response_model=ProspectsResponse)
async def get_top_prospects(
    db: AsyncSession = Depends(get_db),
):
    """
    Get Top 100 prospects from MLB Pipeline and FanGraphs,
    cross-referenced against inventory.
    """
    # Scrape both sources
    pipeline_raw = []
    fangraphs_raw = []

    try:
        pipeline_raw = await _scrape_pipeline()
    except Exception as e:
        print(f"Pipeline scrape failed: {e}")

    try:
        fangraphs_raw = await _scrape_fangraphs()
    except Exception as e:
        print(f"FanGraphs scrape failed: {e}")

    # Collect all unique player names for batch inventory lookup
    all_names = set()
    for p in pipeline_raw:
        if p.get("name"):
            all_names.add(p["name"])
    for p in fangraphs_raw:
        if p.get("name"):
            all_names.add(p["name"])

    # Batch inventory lookup
    inventory_map = await _batch_inventory_lookup(db, list(all_names))

    # Build response
    def _enrich(raw: list[dict], source: str) -> list[ProspectEntry]:
        entries = []
        for p in raw:
            name = p.get("name", "")
            normalized = _normalize_name(name)
            inv = inventory_map.get(normalized)

            entries.append(ProspectEntry(
                rank=p.get("rank", 0),
                name=name,
                team=p.get("team", ""),
                position=p.get("position", ""),
                age=p.get("age"),
                source=source,
                has_inventory=inv is not None and inv["total"] > 0,
                inventory_count=inv["total"] if inv else 0,
                unsigned_count=inv["unsigned"] if inv else 0,
                signed_count=inv["signed"] if inv else 0,
            ))
        return entries

    return ProspectsResponse(
        pipeline=_enrich(pipeline_raw, "pipeline"),
        fangraphs=_enrich(fangraphs_raw, "fangraphs"),
    )


@router.get("/orgs", response_model=list[MlbOrg])
async def get_mlb_orgs():
    """Get all 30 MLB organizations for the team picker."""
    orgs = await _get_mlb_orgs()
    return [MlbOrg(**o) for o in orgs]


@router.get("/team/{team_id}", response_model=TeamProspectsResponse)
async def get_team_prospects(
    team_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get top 30 prospects for an MLB organization,
    cross-referenced against inventory.
    """
    team_name, raw_prospects = await _scrape_team_prospects(team_id)

    # Inventory cross-reference
    all_names = [p["name"] for p in raw_prospects if p.get("name")]
    inventory_map = await _batch_inventory_lookup(db, all_names)

    entries = []
    for p in raw_prospects:
        name = p.get("name", "")
        normalized = _normalize_name(name)
        inv = inventory_map.get(normalized)

        entries.append(ProspectEntry(
            rank=p.get("rank", 0),
            name=name,
            team=p.get("team", team_name),
            position=p.get("position", ""),
            age=p.get("age"),
            source="team",
            has_inventory=inv is not None and inv["total"] > 0,
            inventory_count=inv["total"] if inv else 0,
            unsigned_count=inv["unsigned"] if inv else 0,
            signed_count=inv["signed"] if inv else 0,
        ))

    return TeamProspectsResponse(
        team_id=team_id,
        team_name=team_name or f"Team {team_id}",
        prospects=entries,
    )


@router.post("/refresh")
async def refresh_prospects():
    """Clear the prospects cache to force a fresh scrape."""
    _pipeline_cache.clear()
    _fangraphs_cache.clear()
    _team_prospects_cache.clear()
    return {"status": "cache_cleared"}
