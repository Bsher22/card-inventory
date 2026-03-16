// src/pages/MilbSchedule.tsx
// MiLB Schedule timeline with roster viewing and inventory cross-reference

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Search,
  Users,
  Package,
  ChevronDown,
  ChevronRight,
  X,
  Filter,
  Star,
} from 'lucide-react';
import { api } from '../api';
import type { MilbTeam, GameWithInventory, PlayerInventoryMatch } from '../api/mlbStatsApi';

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTwoWeeksOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

export default function MilbSchedule() {
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getTwoWeeksOut());
  const [expandedGame, setExpandedGame] = useState<number | null>(null);

  // Teams to track: start with consigner home teams, allow adding more
  const [additionalTeamIds, setAdditionalTeamIds] = useState<number[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  // Fetch consigners to get their home teams
  const { data: consigners } = useQuery({
    queryKey: ['consigners', false],
    queryFn: () => api.consignments.getConsigners({ active_only: true }),
  });

  // Fetch all MiLB teams for the picker
  const { data: allMilbTeams } = useQuery({
    queryKey: ['milb-teams'],
    queryFn: () => api.mlbStats.getMilbTeams(),
    staleTime: 3600000,
  });

  // Build the list of tracked teams
  const trackedTeams = useMemo(() => {
    const teams: Array<{ team_id: number; team_name: string; source: string }> = [];
    const seen = new Set<number>();

    // From consigners
    if (consigners) {
      for (const c of consigners) {
        for (const ht of (c.home_teams || [])) {
          if (!seen.has(ht.team_id)) {
            seen.add(ht.team_id);
            teams.push({ team_id: ht.team_id, team_name: ht.team_name, source: c.name });
          }
        }
      }
    }

    // Additional manually-added teams
    if (allMilbTeams) {
      for (const tid of additionalTeamIds) {
        if (!seen.has(tid)) {
          seen.add(tid);
          const t = allMilbTeams.find(mt => mt.id === tid);
          if (t) teams.push({ team_id: t.id, team_name: t.name, source: 'Manual' });
        }
      }
    }

    return teams;
  }, [consigners, additionalTeamIds, allMilbTeams]);

  // Filter for team picker dropdown
  const filteredPickerTeams = useMemo(() => {
    if (!allMilbTeams || !teamSearch.trim()) return allMilbTeams || [];
    const s = teamSearch.toLowerCase();
    return allMilbTeams.filter(
      t => t.name.toLowerCase().includes(s) || t.abbreviation.toLowerCase().includes(s)
    );
  }, [allMilbTeams, teamSearch]);

  // Fetch schedule with inventory for all tracked teams
  const { data: allGamesData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['milb-schedule-page', trackedTeams.map(t => t.team_id), startDate, endDate],
    queryFn: async () => {
      const results: Array<{ teamName: string; games: GameWithInventory[] }> = [];
      for (const t of trackedTeams) {
        const games = await api.mlbStats.getScheduleWithInventory({
          team_id: t.team_id,
          start_date: startDate,
          end_date: endDate,
        });
        results.push({ teamName: t.team_name, games });
      }
      return results;
    },
    enabled: trackedTeams.length > 0,
  });

  // Flatten, deduplicate by game_pk, group by date
  const gamesByDate = useMemo(() => {
    if (!allGamesData) return new Map<string, GameWithInventory[]>();

    const flat: GameWithInventory[] = [];
    const seen = new Set<number>();
    for (const { games } of allGamesData) {
      for (const g of games) {
        if (!seen.has(g.game_pk)) {
          seen.add(g.game_pk);
          flat.push(g);
        }
      }
    }
    flat.sort((a, b) => a.date.localeCompare(b.date) || a.home_team.localeCompare(b.home_team));

    const grouped = new Map<string, GameWithInventory[]>();
    for (const g of flat) {
      const existing = grouped.get(g.date) || [];
      existing.push(g);
      grouped.set(g.date, existing);
    }
    return grouped;
  }, [allGamesData]);

  const totalGames = Array.from(gamesByDate.values()).reduce((sum, g) => sum + g.length, 0);

  const addTeam = (team: MilbTeam) => {
    if (!additionalTeamIds.includes(team.id) && !trackedTeams.some(t => t.team_id === team.id)) {
      setAdditionalTeamIds([...additionalTeamIds, team.id]);
    }
    setTeamSearch('');
    setShowTeamPicker(false);
  };

  const removeAdditionalTeam = (teamId: number) => {
    setAdditionalTeamIds(additionalTeamIds.filter(id => id !== teamId));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={28} />
          MiLB Schedule
        </h1>
        <p className="text-gray-500 mt-1">View upcoming games, rosters, and inventory matches</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 space-y-4">
        {/* Date range */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-400">
            {totalGames} game{totalGames !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Tracked teams */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Tracked Teams</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trackedTeams.map((t) => {
              const isFromConsigner = t.source !== 'Manual';
              return (
                <span
                  key={t.team_id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                    isFromConsigner
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {t.team_name}
                  {isFromConsigner && (
                    <span className="text-xs opacity-60">({t.source})</span>
                  )}
                  {!isFromConsigner && (
                    <button
                      onClick={() => removeAdditionalTeam(t.team_id)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              );
            })}

            {trackedTeams.length === 0 && !showTeamPicker && (
              <span className="text-sm text-gray-400 italic">
                No teams tracked. Add consigner home teams or search below.
              </span>
            )}
          </div>

          {/* Add team picker */}
          <div className="mt-3 relative max-w-sm">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  setShowTeamPicker(true);
                }}
                onFocus={() => setShowTeamPicker(true)}
                placeholder="Add a team to track..."
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showTeamPicker && teamSearch.trim() && filteredPickerTeams.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPickerTeams.slice(0, 20).map((team) => {
                  const alreadyTracked = trackedTeams.some(t => t.team_id === team.id);
                  return (
                    <button
                      key={team.id}
                      disabled={alreadyTracked}
                      onClick={() => addTeam(team)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        alreadyTracked ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="font-medium">{team.name}</span>
                      <span className="text-gray-400 ml-2">({team.abbreviation})</span>
                      {team.league && (
                        <span className="text-gray-300 ml-1 text-xs">- {team.league}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Timeline */}
      {trackedTeams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">No teams to show</p>
          <p className="text-gray-400 text-sm mt-1">
            Assign home teams to your consigners, or search for a team above
          </p>
        </div>
      ) : scheduleLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-64"></div>
                <div className="h-4 bg-gray-100 rounded w-48"></div>
              </div>
            </div>
          ))}
        </div>
      ) : gamesByDate.size === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No games found in this date range</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(gamesByDate.entries()).map(([date, games]) => (
            <div key={date}>
              {/* Date heading */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {formatDateHeading(date)}
                </h2>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              {/* Games for this date */}
              <div className="space-y-3">
                {games.map((game) => (
                  <ScheduleGameCard
                    key={game.game_pk}
                    game={game}
                    isExpanded={expandedGame === game.game_pk}
                    onToggle={() => setExpandedGame(
                      expandedGame === game.game_pk ? null : game.game_pk
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================
// SCHEDULE GAME CARD
// ============================================

interface ScheduleGameCardProps {
  game: GameWithInventory;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScheduleGameCard({ game, isExpanded, onToggle }: ScheduleGameCardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');

  const totalHome = game.home_roster.length;
  const totalAway = game.away_roster.length;
  const homeInv = game.home_players_in_inventory;
  const awayInv = game.away_players_in_inventory;
  const totalInv = homeInv + awayInv;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors">
      {/* Game header */}
      <div
        className="p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-gray-900">
                {game.away_team}
                <span className="text-gray-400 mx-2 font-normal">@</span>
                {game.home_team}
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-1">{game.venue}</div>
          </div>

          <div className="flex items-center gap-4">
            {/* Inventory summary badges */}
            <div className="flex items-center gap-2">
              {totalInv > 0 ? (
                <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-200">
                  <Package size={14} />
                  <span className="font-medium">{totalInv}</span>
                  <span className="text-emerald-500 text-xs">players in inventory</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-sm border border-gray-200">
                  <Package size={14} />
                  <span>No inventory matches</span>
                </div>
              )}
            </div>

            <ChevronRight
              size={20}
              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>

        {/* Quick roster summary */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} />
            <span>Home: {totalHome} players</span>
            {homeInv > 0 && (
              <span className="text-emerald-600 font-medium">({homeInv} in inv.)</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} />
            <span>Away: {totalAway} players</span>
            {awayInv > 0 && (
              <span className="text-blue-600 font-medium">({awayInv} in inv.)</span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded roster view */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'home'
                  ? 'bg-gray-50 text-emerald-700 border-emerald-500'
                  : 'text-gray-500 hover:text-gray-700 border-transparent'
              }`}
            >
              <Users size={14} className="inline mr-1.5" />
              {game.home_team}
              <span className="ml-2 text-xs opacity-60">
                {homeInv}/{totalHome} in inventory
              </span>
            </button>
            <button
              onClick={() => setActiveTab('away')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'away'
                  ? 'bg-gray-50 text-blue-700 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 border-transparent'
              }`}
            >
              <Users size={14} className="inline mr-1.5" />
              {game.away_team}
              <span className="ml-2 text-xs opacity-60">
                {awayInv}/{totalAway} in inventory
              </span>
            </button>
          </div>

          {/* Roster table */}
          <div className="max-h-96 overflow-y-auto">
            <RosterTable
              players={activeTab === 'home' ? game.home_roster : game.away_roster}
              teamName={activeTab === 'home' ? game.home_team : game.away_team}
              accentColor={activeTab === 'home' ? 'emerald' : 'blue'}
            />
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================
// ROSTER TABLE
// ============================================

interface RosterTableProps {
  players: PlayerInventoryMatch[];
  teamName: string;
  accentColor: 'emerald' | 'blue';
}

function RosterTable({ players, teamName, accentColor }: RosterTableProps) {
  if (players.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        Roster not available for {teamName}
      </div>
    );
  }

  const withInventory = players.filter(p => p.has_inventory);
  const withoutInventory = players.filter(p => !p.has_inventory);

  return (
    <div>
      {/* Inventory matches section */}
      {withInventory.length > 0 && (
        <div>
          <div className={`px-4 py-2 bg-${accentColor}-50 text-${accentColor}-700 text-xs font-semibold uppercase tracking-wide border-b border-${accentColor}-100`}>
            In Inventory ({withInventory.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left px-4 py-2 font-medium w-12">#</th>
                <th className="text-left px-4 py-2 font-medium">Player</th>
                <th className="text-left px-4 py-2 font-medium w-16">Pos</th>
                <th className="text-right px-4 py-2 font-medium w-24">Total</th>
                <th className="text-right px-4 py-2 font-medium w-24">Unsigned</th>
                <th className="text-right px-4 py-2 font-medium w-24">Signed</th>
              </tr>
            </thead>
            <tbody>
              {withInventory.map((p) => (
                <tr key={p.player_id} className={`border-b border-gray-50 bg-${accentColor}-50/30`}>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{p.jersey_number || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-900">{p.full_name}</span>
                    <ProspectBadge rankTeam={p.prospect_rank_team} rankOverall={p.prospect_rank_overall} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.position}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 text-${accentColor}-700 font-semibold`}>
                      <Package size={12} />
                      {p.inventory_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{p.unsigned_count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{p.signed_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Not in inventory section */}
      <div>
        <div className="px-4 py-2 bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide border-b border-gray-100">
          Not in Inventory ({withoutInventory.length})
        </div>
        <table className="w-full text-sm">
          <tbody>
            {withoutInventory.map((p) => (
              <tr key={p.player_id} className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-400 text-xs w-12">{p.jersey_number || '-'}</td>
                <td className="px-4 py-2">
                  <span className="text-gray-500">{p.full_name}</span>
                  <ProspectBadge rankTeam={p.prospect_rank_team} rankOverall={p.prospect_rank_overall} />
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs w-16">{p.position}</td>
                <td className="px-4 py-2 text-right text-gray-300 w-24">—</td>
                <td className="px-4 py-2 w-24"></td>
                <td className="px-4 py-2 w-24"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ============================================
// PROSPECT BADGE
// ============================================

function ProspectBadge({
  rankTeam,
  rankOverall,
}: {
  rankTeam: number | null;
  rankOverall: number | null;
}) {
  if (!rankTeam) return null;

  return (
    <span
      className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium"
      title={`#${rankTeam} team prospect${rankOverall ? `, #${rankOverall} overall` : ''}`}
    >
      <Star size={10} className="fill-amber-500 text-amber-500" />
      #{rankTeam} prospect
      {rankOverall && (
        <span className="text-amber-600 font-normal ml-0.5">(#{rankOverall} overall)</span>
      )}
    </span>
  );
}
