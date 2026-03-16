"""
MiLB Stats Proxy Routes

Proxies requests to the MLB Stats API with in-memory caching.
Provides schedule, roster, and inventory cross-reference endpoints.
"""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

import httpx
from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Inventory, Checklist, Player

router = APIRouter(prefix="/mlb-stats", tags=["mlb-stats"])

MLB_API_BASE = "https://statsapi.mlb.com/api/v1"
MILB_SPORT_IDS = "11,12,13,14,16,17,5442"

# TTL caches: 1 hour for teams, 30 min for schedules/rosters
_teams_cache: TTLCache = TTLCache(maxsize=10, ttl=3600)
_schedule_cache: TTLCache = TTLCache(maxsize=200, ttl=1800)
_roster_cache: TTLCache = TTLCache(maxsize=200, ttl=1800)
_parent_org_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)  # MiLB team -> parent MLB org


# ============================================
# RESPONSE SCHEMAS
# ============================================

class MilbTeam(BaseModel):
    id: int
    name: str
    abbreviation: str
    league: Optional[str] = None
    division: Optional[str] = None
    venue: Optional[str] = None
    sport_id: Optional[int] = None
    sport_name: Optional[str] = None
    parent_org_id: Optional[int] = None
    parent_org_name: Optional[str] = None


class ScheduleGame(BaseModel):
    date: str
    game_pk: int
    home_team: str
    home_team_id: int
    away_team: str
    away_team_id: int
    venue: str


class RosterPlayer(BaseModel):
    player_id: int
    full_name: str
    position: str
    jersey_number: str = ""


class PlayerInventoryMatch(BaseModel):
    player_id: int
    full_name: str
    position: str
    jersey_number: str = ""
    has_inventory: bool = False
    inventory_count: int = 0
    unsigned_count: int = 0
    signed_count: int = 0
    prospect_rank_team: Optional[int] = None
    prospect_rank_overall: Optional[int] = None


class GameWithInventory(BaseModel):
    date: str
    game_pk: int
    home_team: str
    home_team_id: int
    away_team: str
    away_team_id: int
    venue: str
    home_roster: list[PlayerInventoryMatch] = []
    away_roster: list[PlayerInventoryMatch] = []
    home_players_in_inventory: int = 0
    away_players_in_inventory: int = 0


# ============================================
# HELPER: fetch from MLB API
# ============================================

async def _fetch_mlb_api(url: str) -> dict:
    """Fetch JSON from MLB Stats API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"MLB Stats API returned {resp.status_code}",
            )
        return resp.json()


# ============================================
# ROUTES
# ============================================

@router.get("/teams", response_model=list[MilbTeam])
async def get_milb_teams(season: int = Query(default=2026)):
    """Get all MiLB teams for the team picker."""
    cache_key = f"teams_{season}"
    if cache_key in _teams_cache:
        return _teams_cache[cache_key]

    data = await _fetch_mlb_api(
        f"{MLB_API_BASE}/teams?season={season}&sportIds={MILB_SPORT_IDS}"
    )

    teams = [
        MilbTeam(
            id=t["id"],
            name=t["name"],
            abbreviation=t.get("abbreviation", ""),
            league=t.get("league", {}).get("name"),
            division=t.get("division", {}).get("name"),
            venue=t.get("venue", {}).get("name"),
            sport_id=t.get("sport", {}).get("id"),
            sport_name=t.get("sport", {}).get("name"),
            parent_org_id=t.get("parentOrgId"),
            parent_org_name=t.get("parentOrgName"),
        )
        for t in data.get("teams", [])
    ]

    teams.sort(key=lambda t: t.name)
    _teams_cache[cache_key] = teams
    return teams


@router.get("/schedule", response_model=list[ScheduleGame])
async def get_schedule(
    team_id: int = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    season: int = Query(default=2026),
):
    """Get schedule for a team within a date range."""
    if not start_date:
        start_date = date.today().isoformat()
    if not end_date:
        end_date = (date.today() + timedelta(days=14)).isoformat()

    cache_key = f"schedule_{team_id}_{start_date}_{end_date}_{season}"
    if cache_key in _schedule_cache:
        return _schedule_cache[cache_key]

    url = (
        f"{MLB_API_BASE}/schedule"
        f"?teamId={team_id}"
        f"&season={season}"
        f"&sportId={MILB_SPORT_IDS}"
        f"&startDate={start_date}"
        f"&endDate={end_date}"
    )
    data = await _fetch_mlb_api(url)

    games = []
    for d in data.get("dates", []):
        for g in d["games"]:
            games.append(ScheduleGame(
                date=d["date"],
                game_pk=g["gamePk"],
                home_team=g["teams"]["home"]["team"]["name"],
                home_team_id=g["teams"]["home"]["team"]["id"],
                away_team=g["teams"]["away"]["team"]["name"],
                away_team_id=g["teams"]["away"]["team"]["id"],
                venue=g.get("venue", {}).get("name", ""),
            ))

    _schedule_cache[cache_key] = games
    return games


@router.get("/roster", response_model=list[RosterPlayer])
async def get_roster(
    team_id: int = Query(...),
    season: int = Query(default=2026),
):
    """Get current roster for a team."""
    cache_key = f"roster_{team_id}_{season}"
    if cache_key in _roster_cache:
        return _roster_cache[cache_key]

    data = await _fetch_mlb_api(
        f"{MLB_API_BASE}/teams/{team_id}/roster?season={season}"
    )

    roster = [
        RosterPlayer(
            player_id=p["person"]["id"],
            full_name=p["person"]["fullName"],
            position=p["position"]["abbreviation"],
            jersey_number=p.get("jerseyNumber", ""),
        )
        for p in data.get("roster", [])
    ]

    _roster_cache[cache_key] = roster
    return roster


@router.get("/schedule/inventory-match", response_model=list[GameWithInventory])
async def get_schedule_with_inventory(
    team_id: int = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    season: int = Query(default=2026),
    db: AsyncSession = Depends(get_db),
):
    """
    Get schedule with roster + inventory cross-reference.

    For each game, shows both rosters with inventory match info.
    """
    # Get the schedule
    games = await get_schedule(
        team_id=team_id,
        start_date=start_date,
        end_date=end_date,
        season=season,
    )

    if not games:
        return []

    # Collect unique team IDs to fetch rosters
    team_ids = set()
    for g in games:
        team_ids.add(g.home_team_id)
        team_ids.add(g.away_team_id)

    # Fetch all rosters
    rosters: dict[int, list[RosterPlayer]] = {}
    for tid in team_ids:
        rosters[tid] = await get_roster(team_id=tid, season=season)

    # Collect all player names from all rosters for batch inventory lookup
    all_player_names = set()
    for roster in rosters.values():
        for p in roster:
            all_player_names.add(p.full_name)

    # Batch inventory lookup: find all players we have inventory for
    inventory_by_name = await _batch_inventory_lookup(db, list(all_player_names))

    # Build prospect ranking lookups for all teams in the schedule
    team_rank_by_name, overall_rank_by_name = await _build_prospect_lookups(team_ids, season)

    # Build response
    result = []
    for g in games:
        home_roster = rosters.get(g.home_team_id, [])
        away_roster = rosters.get(g.away_team_id, [])

        home_matches = _match_roster_to_inventory(
            home_roster, inventory_by_name, team_rank_by_name, overall_rank_by_name
        )
        away_matches = _match_roster_to_inventory(
            away_roster, inventory_by_name, team_rank_by_name, overall_rank_by_name
        )

        result.append(GameWithInventory(
            date=g.date,
            game_pk=g.game_pk,
            home_team=g.home_team,
            home_team_id=g.home_team_id,
            away_team=g.away_team,
            away_team_id=g.away_team_id,
            venue=g.venue,
            home_roster=home_matches,
            away_roster=away_matches,
            home_players_in_inventory=sum(1 for m in home_matches if m.has_inventory),
            away_players_in_inventory=sum(1 for m in away_matches if m.has_inventory),
        ))

    return result


# ============================================
# HELPERS
# ============================================

def _normalize_name(name: str) -> str:
    """Normalize a player name for matching."""
    return name.strip().lower().replace(".", "").replace(",", "").replace("'", "")


async def _batch_inventory_lookup(
    db: AsyncSession,
    player_names: list[str],
) -> dict[str, dict]:
    """
    Look up inventory counts for a list of player names.

    Matches against Player.name_normalized and Checklist.player_name_raw.
    Returns dict keyed by normalized name with inventory counts.
    """
    if not player_names:
        return {}

    normalized_names = [_normalize_name(n) for n in player_names]

    # Query: find inventory grouped by player name
    # Join Inventory -> Checklist -> Player (optional)
    # Match on player_name_raw or player.name_normalized
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


async def _get_parent_org_id(milb_team_id: int, season: int = 2026) -> Optional[int]:
    """Get the parent MLB org ID for a MiLB team."""
    cache_key = f"parent_{milb_team_id}"
    if cache_key in _parent_org_cache:
        return _parent_org_cache[cache_key]

    # Check if teams are already cached
    teams_key = f"teams_{season}"
    if teams_key in _teams_cache:
        for t in _teams_cache[teams_key]:
            if t.id == milb_team_id and t.parent_org_id:
                _parent_org_cache[cache_key] = t.parent_org_id
                return t.parent_org_id

    # Fetch team info directly
    try:
        data = await _fetch_mlb_api(f"{MLB_API_BASE}/teams/{milb_team_id}")
        teams = data.get("teams", [])
        if teams:
            parent_id = teams[0].get("parentOrgId")
            if parent_id:
                _parent_org_cache[cache_key] = parent_id
                return parent_id
    except Exception:
        pass

    return None


async def _build_prospect_lookups(
    team_ids: set[int],
    season: int = 2026,
) -> tuple[dict[str, int], dict[str, int]]:
    """
    Build prospect rank lookup dicts for a set of MiLB team IDs.

    Returns:
        (team_rank_by_name, overall_rank_by_name)
        Both keyed by normalized player name.
    """
    from app.routes.prospects import _scrape_team_prospects, _scrape_pipeline, _normalize_name as _pnorm

    team_rank_by_name: dict[str, int] = {}
    overall_rank_by_name: dict[str, int] = {}

    # Get parent org IDs for all MiLB teams
    parent_orgs: dict[int, int] = {}  # milb_team_id -> parent_org_id
    seen_orgs: set[int] = set()
    for tid in team_ids:
        parent_id = await _get_parent_org_id(tid, season)
        if parent_id:
            parent_orgs[tid] = parent_id
            seen_orgs.add(parent_id)

    # Fetch team prospects for each unique parent org
    for org_id in seen_orgs:
        try:
            _, prospects = await _scrape_team_prospects(org_id)
            for p in prospects:
                name = p.get("name", "")
                if name:
                    normalized = _pnorm(name)
                    # Keep the best (lowest) rank if player appears multiple times
                    rank = p.get("rank", 0)
                    if normalized not in team_rank_by_name or rank < team_rank_by_name[normalized]:
                        team_rank_by_name[normalized] = rank
        except Exception:
            pass

    # Fetch overall top 100 for overall ranking
    try:
        pipeline = await _scrape_pipeline()
        for p in pipeline:
            name = p.get("name", "")
            if name:
                normalized = _pnorm(name)
                overall_rank_by_name[normalized] = p.get("rank", 0)
    except Exception:
        pass

    return team_rank_by_name, overall_rank_by_name


def _match_roster_to_inventory(
    roster: list[RosterPlayer],
    inventory_by_name: dict[str, dict],
    team_rank_by_name: Optional[dict[str, int]] = None,
    overall_rank_by_name: Optional[dict[str, int]] = None,
) -> list[PlayerInventoryMatch]:
    """Match roster players against inventory lookup results and prospect rankings."""
    matches = []
    for p in roster:
        normalized = _normalize_name(p.full_name)
        inv = inventory_by_name.get(normalized)

        team_rank = team_rank_by_name.get(normalized) if team_rank_by_name else None
        overall_rank = overall_rank_by_name.get(normalized) if overall_rank_by_name else None

        matches.append(PlayerInventoryMatch(
            player_id=p.player_id,
            full_name=p.full_name,
            position=p.position,
            jersey_number=p.jersey_number,
            has_inventory=inv is not None and inv["total"] > 0,
            inventory_count=inv["total"] if inv else 0,
            unsigned_count=inv["unsigned"] if inv else 0,
            signed_count=inv["signed"] if inv else 0,
            prospect_rank_team=team_rank,
            prospect_rank_overall=overall_rank,
        ))

    # Sort: prospects first (by rank), then inventory, then alphabetical
    matches.sort(key=lambda m: (
        m.prospect_rank_team is None,  # prospects first
        m.prospect_rank_team or 999,
        not m.has_inventory,
        m.full_name,
    ))
    return matches
