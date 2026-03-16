"""
Top Prospects Routes

Fetches MLB Pipeline Top 100 via GraphQL and FanGraphs Top 100 via __NEXT_DATA__,
caches results, and cross-references against inventory.
"""

import json
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Inventory, Checklist, Player

router = APIRouter(prefix="/prospects", tags=["prospects"])

# Cache for 6 hours — these lists don't change often
_pipeline_cache: TTLCache = TTLCache(maxsize=5, ttl=21600)
_fangraphs_cache: TTLCache = TTLCache(maxsize=5, ttl=21600)
_team_prospects_cache: TTLCache = TTLCache(maxsize=60, ttl=21600)
_mlb_orgs_cache: TTLCache = TTLCache(maxsize=5, ttl=86400)  # 24h for org list

MLB_GRAPHQL_URL = "https://data-graph.mlb.com/graphql"
FANGRAPHS_URL = "https://www.fangraphs.com/prospects/the-board/2026-prospect-list/summary?sort=-1,1&type=0&team=&pos=&pg=1"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# MLB team ID -> URL slug for Pipeline GraphQL queries
_TEAM_SLUGS = {
    108: "angels", 109: "diamondbacks", 110: "orioles", 111: "redsox",
    112: "cubs", 113: "reds", 114: "guardians", 115: "rockies",
    116: "tigers", 117: "astros", 118: "royals", 119: "dodgers",
    120: "nationals", 121: "mets", 133: "athletics", 134: "pirates",
    135: "padres", 136: "mariners", 137: "giants", 138: "cardinals",
    139: "rays", 140: "rangers", 141: "bluejays", 142: "twins",
    143: "phillies", 144: "braves", 145: "whitesox", 146: "marlins",
    147: "yankees", 158: "brewers",
}

_PIPELINE_GRAPHQL_QUERY = """
query ($slug: String!, $limit: Int!) {
  getPlayerRankingsFromSelection(slug: $slug, limit: $limit) {
    rank
    playerEntity {
      eta
      position
      player {
        id
        fullName
        currentAge
        team { name }
        primaryPosition { abbreviation }
      }
    }
  }
}
"""


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
# MLB PIPELINE GRAPHQL HELPERS
# ============================================

async def _fetch_pipeline_graphql(slug: str, limit: int = 100) -> list[dict]:
    """Fetch prospect rankings from MLB Pipeline's GraphQL API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            MLB_GRAPHQL_URL,
            json={
                "query": _PIPELINE_GRAPHQL_QUERY,
                "variables": {"slug": slug, "limit": limit},
            },
            headers=HEADERS,
        )
        if resp.status_code != 200:
            return []

    data = resp.json()
    rankings = data.get("data", {}).get("getPlayerRankingsFromSelection", [])

    prospects = []
    for entry in rankings:
        pe = entry.get("playerEntity", {})
        player = pe.get("player", {})
        name = player.get("fullName", "")
        if not name:
            continue

        prospects.append({
            "rank": entry.get("rank", len(prospects) + 1),
            "name": name,
            "team": player.get("team", {}).get("name", ""),
            "position": pe.get("position", player.get("primaryPosition", {}).get("abbreviation", "")),
            "age": player.get("currentAge"),
        })

    return prospects


async def _scrape_pipeline() -> list[dict]:
    """Fetch MLB Pipeline Top 100 prospects via GraphQL API."""
    cache_key = "pipeline_top100"
    if cache_key in _pipeline_cache:
        return _pipeline_cache[cache_key]

    prospects = await _fetch_pipeline_graphql("sel-pr-2026-top100", limit=100)

    _pipeline_cache[cache_key] = prospects
    return prospects


# ============================================
# FANGRAPHS SCRAPING
# ============================================

async def _scrape_fangraphs() -> list[dict]:
    """Scrape FanGraphs Top 100 prospects from The Board via __NEXT_DATA__ JSON."""
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

    # FanGraphs embeds all prospect data in __NEXT_DATA__ script tag
    next_data_tag = soup.select_one("script#__NEXT_DATA__")
    if next_data_tag and next_data_tag.string:
        try:
            next_data = json.loads(next_data_tag.string)
            # Navigate: props.pageProps.dehydratedState.queries[].state.data
            queries = (
                next_data.get("props", {})
                .get("pageProps", {})
                .get("dehydratedState", {})
                .get("queries", [])
            )
            for q in queries:
                data = q.get("state", {}).get("data", [])
                if not isinstance(data, list) or not data:
                    continue
                first = data[0] if data else {}
                if "playerName" not in first and "PlayerName" not in first:
                    continue

                for item in data:
                    name = item.get("playerName", item.get("PlayerName", ""))
                    if not name:
                        continue
                    rank = item.get("Ovr_Rank", item.get("ovr_Rank", len(prospects) + 1))
                    age_raw = item.get("Age", item.get("age"))
                    age = None
                    if age_raw is not None:
                        try:
                            age = int(float(age_raw))
                            if not (15 <= age <= 40):
                                age = None
                        except (ValueError, TypeError):
                            pass

                    prospects.append({
                        "rank": rank,
                        "name": name,
                        "team": item.get("Team", item.get("team", "")),
                        "position": item.get("Position", item.get("position", "")),
                        "age": age,
                    })

                if prospects:
                    break
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Sort by rank and take top 100
    if prospects:
        prospects.sort(key=lambda p: p.get("rank", 999))
        prospects = prospects[:100]

    _fangraphs_cache[cache_key] = prospects
    return prospects


# ============================================
# SHARED HELPERS
# ============================================

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
                case((Inventory.is_signed == False, Inventory.quantity), else_=0)
            ).label("unsigned_qty"),
            func.sum(
                case((Inventory.is_signed == True, Inventory.quantity), else_=0)
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
    Uses MLB Pipeline GraphQL API, falls back to FanGraphs.
    Returns (team_name, prospects_list).
    """
    cache_key = f"team_{team_id}"
    if cache_key in _team_prospects_cache:
        return _team_prospects_cache[cache_key]

    # Get team name and abbreviation from orgs
    orgs = await _get_mlb_orgs()
    team_name = ""
    team_abbrev = ""
    for org in orgs:
        if org["id"] == team_id:
            team_name = org["name"]
            team_abbrev = org["abbreviation"]
            break

    prospects = []

    # Try MLB Pipeline GraphQL API first
    slug = _TEAM_SLUGS.get(team_id)
    if slug:
        prospects = await _fetch_pipeline_graphql(f"sel-pr-2026-{slug}", limit=30)

    # Fallback: FanGraphs Board page with team filter
    if not prospects and team_abbrev:
        try:
            fg_url = (
                f"https://www.fangraphs.com/prospects/the-board/2026-prospect-list/summary"
                f"?sort=-1,1&type=0&team={team_abbrev}&pos=&pg=1"
            )
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(fg_url, headers=HEADERS)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    next_data_tag = soup.select_one("script#__NEXT_DATA__")
                    if next_data_tag and next_data_tag.string:
                        next_data = json.loads(next_data_tag.string)
                        queries = (
                            next_data.get("props", {})
                            .get("pageProps", {})
                            .get("dehydratedState", {})
                            .get("queries", [])
                        )
                        for q in queries:
                            data = q.get("state", {}).get("data", [])
                            if not isinstance(data, list) or not data:
                                continue
                            first = data[0] if data else {}
                            if "playerName" not in first and "PlayerName" not in first:
                                continue
                            for i, item in enumerate(data[:30], 1):
                                name = item.get("playerName", item.get("PlayerName", ""))
                                if not name:
                                    continue
                                age_raw = item.get("Age", item.get("age"))
                                age = None
                                if age_raw is not None:
                                    try:
                                        age = int(float(age_raw))
                                        if not (15 <= age <= 40):
                                            age = None
                                    except (ValueError, TypeError):
                                        pass
                                prospects.append({
                                    "rank": item.get("Org_Rank", i),
                                    "name": name,
                                    "team": team_name,
                                    "position": item.get("Position", item.get("position", "")),
                                    "age": age,
                                })
                            if prospects:
                                break
        except Exception:
            pass

    result = (team_name, prospects[:30])
    _team_prospects_cache[cache_key] = result
    return result


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
    # Fetch both sources
    pipeline_raw = []
    fangraphs_raw = []

    try:
        pipeline_raw = await _scrape_pipeline()
    except Exception as e:
        print(f"Pipeline fetch failed: {e}")

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
