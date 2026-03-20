import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
} from 'lucide-react';
import { api } from '../api';
import type { InventoryAnalytics, SalesAnalytics } from '../types';
import type { Consigner } from '../types/consignments';
import type { GameWithInventory } from '../api/mlbStatsApi';

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Package;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="text-blue-600" size={24} />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-1">
          {trend === 'up' ? (
            <TrendingUp className="text-green-500" size={16} />
          ) : (
            <TrendingDown className="text-red-500" size={16} />
          )}
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {trendValue}
          </span>
          <span className="text-gray-500 text-sm ml-1">vs last month</span>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// ============================================
// CONSIGNER SCHEDULE SECTION
// ============================================

interface DashboardGame {
  game: GameWithInventory;
  consigners: string[];
}

const CONSIGNER_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function ConsignerScheduleSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const monthEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { data: consigners } = useQuery<Consigner[]>({
    queryKey: ['consigners', true],
    queryFn: () => api.consignments.getConsigners({ active_only: true }),
  });

  // Build team → consigner names map and get unique team IDs
  const { teamConsignerMap, uniqueTeamIds, consignerColorMap } = useMemo(() => {
    const map = new Map<number, string[]>();
    const colorMap = new Map<string, string>();
    let colorIdx = 0;

    for (const c of consigners || []) {
      if (!c.home_teams?.length) continue;
      if (!colorMap.has(c.name)) {
        colorMap.set(c.name, CONSIGNER_COLORS[colorIdx % CONSIGNER_COLORS.length]);
        colorIdx++;
      }
      for (const ht of c.home_teams) {
        const existing = map.get(ht.team_id) || [];
        if (!existing.includes(c.name)) {
          existing.push(c.name);
        }
        map.set(ht.team_id, existing);
      }
    }
    return {
      teamConsignerMap: map,
      uniqueTeamIds: [...map.keys()],
      consignerColorMap: colorMap,
    };
  }, [consigners]);

  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['dashboard-schedule', uniqueTeamIds, monthStart, monthEnd],
    queryFn: async () => {
      const results = await Promise.all(
        uniqueTeamIds.map(teamId =>
          api.mlbStats.getScheduleWithInventory({
            team_id: teamId,
            start_date: monthStart,
            end_date: monthEnd,
          }).catch(() => [] as GameWithInventory[])
        )
      );
      return results;
    },
    enabled: uniqueTeamIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  // Merge, dedup, annotate with consigners, group by date
  const gamesByDate = useMemo(() => {
    if (!scheduleData) return new Map<string, DashboardGame[]>();

    const seen = new Map<number, DashboardGame>();

    scheduleData.forEach((games, idx) => {
      const teamId = uniqueTeamIds[idx];
      const consignerNames = teamConsignerMap.get(teamId) || [];

      for (const game of games) {
        const existing = seen.get(game.game_pk);
        if (existing) {
          // Add consigners that aren't already listed
          for (const name of consignerNames) {
            if (!existing.consigners.includes(name)) {
              existing.consigners.push(name);
            }
          }
        } else {
          // Only include games where one of our consigner's home teams is the home team
          if (teamConsignerMap.has(game.home_team_id)) {
            seen.set(game.game_pk, {
              game,
              consigners: [...consignerNames],
            });
          }
        }
      }
    });

    // Group by date
    const grouped = new Map<string, DashboardGame[]>();
    const sorted = [...seen.values()].sort((a, b) => a.game.date.localeCompare(b.game.date));

    for (const entry of sorted) {
      const dateGames = grouped.get(entry.game.date) || [];
      dateGames.push(entry);
      grouped.set(entry.game.date, dateGames);
    }

    return grouped;
  }, [scheduleData, uniqueTeamIds, teamConsignerMap]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const hasHomeTeams = uniqueTeamIds.length > 0;

  const totalGames = useMemo(() => {
    let count = 0;
    for (const games of gamesByDate.values()) count += games.length;
    return count;
  }, [gamesByDate]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
      {/* Clickable header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Calendar className="text-emerald-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Consigner Schedule</h3>
          {!isExpanded && hasHomeTeams && !loadingSchedule && (
            <span className="text-sm text-gray-500 ml-2">
              {totalGames} game{totalGames !== 1 ? 's' : ''} in {monthLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isExpanded && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
                {monthLabel}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {!isExpanded ? null : (
        <div className="px-6 pb-6">
          {!hasHomeTeams ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No consigner home teams configured. Add home teams to consigners to see their game schedules.
            </p>
          ) : loadingSchedule ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : gamesByDate.size === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No games scheduled for {monthLabel}
            </p>
          ) : (
            <div className="space-y-4">
          {[...gamesByDate.entries()].map(([dateStr, games]) => {
            const dateObj = new Date(dateStr + 'T12:00:00');
            const dayLabel = dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={dateStr}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {dayLabel}
                </div>
                <div className="space-y-2">
                  {games.map(({ game, consigners: gameConsigners }) => (
                    <div
                      key={game.game_pk}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {/* Matchup */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {game.away_team} <span className="text-gray-400">@</span> {game.home_team}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin size={11} />
                          <span className="truncate">{game.venue}</span>
                        </div>
                      </div>

                      {/* Consigner badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {gameConsigners.map(name => (
                          <span
                            key={name}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${consignerColorMap.get(name) || CONSIGNER_COLORS[0]}`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>

                      {/* Inventory match */}
                      <div className="flex gap-3 text-xs shrink-0">
                        <span className="text-gray-500">
                          H:{' '}
                          <span className={game.home_players_in_inventory > 0 ? 'font-medium text-emerald-600' : 'text-gray-400'}>
                            {game.home_players_in_inventory}/{game.home_roster.length}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          A:{' '}
                          <span className={game.away_players_in_inventory > 0 ? 'font-medium text-emerald-600' : 'text-gray-400'}>
                            {game.away_players_in_inventory}/{game.away_roster.length}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function Dashboard() {
  const { data: inventoryAnalytics, isLoading: loadingInventory } = useQuery<InventoryAnalytics>({
    queryKey: ['inventory-analytics'],
    queryFn: () => api.inventory.getInventoryAnalytics(),
  });

  const { data: salesAnalytics, isLoading: loadingSales } = useQuery<SalesAnalytics>({
    queryKey: ['sales-analytics'],
    queryFn: () => api.financial.getSalesAnalytics(),
  });

  const isLoading = loadingInventory || loadingSales;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your card inventory and sales</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Cards"
              value={formatNumber(inventoryAnalytics?.total_quantity || 0)}
              subtitle={`${formatNumber(inventoryAnalytics?.total_unique_cards || 0)} unique`}
              icon={Package}
            />
            <StatCard
              title="Cost Basis"
              value={formatCurrency(inventoryAnalytics?.total_cost_basis || 0)}
              icon={DollarSign}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(salesAnalytics?.total_revenue || 0)}
              subtitle={`${salesAnalytics?.total_sales || 0} sales`}
              icon={BarChart3}
            />
            <StatCard
              title="Total Profit"
              value={formatCurrency(inventoryAnalytics?.total_profit || 0)}
              icon={TrendingUp}
              trend={inventoryAnalytics?.total_profit && inventoryAnalytics.total_profit > 0 ? 'up' : 'down'}
            />
          </div>

          {/* Consigner Schedule */}
          <ConsignerScheduleSection />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cards by Brand */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cards by Brand</h3>
              <div className="space-y-3">
                {Object.entries(inventoryAnalytics?.cards_by_brand || {}).map(([brand, count]) => {
                  const total = inventoryAnalytics?.total_quantity || 1;
                  const percentage = (count / total) * 100;
                  return (
                    <div key={brand}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{brand}</span>
                        <span className="text-gray-500">{formatNumber(count)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(inventoryAnalytics?.cards_by_brand || {}).length === 0 && (
                  <p className="text-gray-500 text-sm">No inventory data yet</p>
                )}
              </div>
            </div>

            {/* Sales by Platform */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Platform</h3>
              <div className="space-y-3">
                {Object.entries(salesAnalytics?.sales_by_platform || {}).map(([platform, revenue]) => {
                  const total = salesAnalytics?.total_revenue || 1;
                  const percentage = (revenue / total) * 100;
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{platform}</span>
                        <span className="text-gray-500">{formatCurrency(revenue)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(salesAnalytics?.sales_by_platform || {}).length === 0 && (
                  <p className="text-gray-500 text-sm">No sales data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Players */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Players by Inventory</h3>
              <Users className="text-gray-400" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Player</th>
                    <th className="pb-3 font-medium">Team</th>
                    <th className="pb-3 font-medium text-right">Cards</th>
                    <th className="pb-3 font-medium text-right">Rookies</th>
                    <th className="pb-3 font-medium text-right">Autos</th>
                    <th className="pb-3 font-medium text-right">Numbered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inventoryAnalytics?.top_players.map((player) => (
                    <tr key={player.player_id} className="text-sm">
                      <td className="py-3 font-medium text-gray-900">{player.player_name}</td>
                      <td className="py-3 text-gray-500">{player.team || '-'}</td>
                      <td className="py-3 text-right text-gray-900">{player.total_cards}</td>
                      <td className="py-3 text-right text-gray-500">{player.rookie_count}</td>
                      <td className="py-3 text-right text-gray-500">{player.auto_count}</td>
                      <td className="py-3 text-right text-gray-500">{player.numbered_count}</td>
                    </tr>
                  ))}
                  {(!inventoryAnalytics?.top_players || inventoryAnalytics.top_players.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No player data yet. Upload a checklist and add inventory to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards by Year */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Year</h3>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(inventoryAnalytics?.cards_by_year || {})
                .sort(([a], [b]) => Number(b) - Number(a))
                .slice(0, 10)
                .map(([year, count]) => {
                  const maxCount = Math.max(...Object.values(inventoryAnalytics?.cards_by_year || { 0: 1 }));
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${year}: ${formatNumber(count)} cards`}
                      />
                      <span className="text-xs text-gray-500">{year}</span>
                    </div>
                  );
                })}
              {Object.keys(inventoryAnalytics?.cards_by_year || {}).length === 0 && (
                <p className="text-gray-500 text-sm w-full text-center py-8">No inventory data yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
