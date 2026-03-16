// src/pages/TopProspects.tsx
// Top 100 Prospects from Just Baseball and FanGraphs with inventory cross-reference
// Plus per-team top 30 prospects view

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  RefreshCw,
  Package,
  Search,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Users,
} from 'lucide-react';
import { prospectsApi } from '../api/prospectsApi';
import type { ProspectEntry, MlbOrg } from '../api/prospectsApi';

type ViewMode = 'top100' | 'byTeam';
type SourceTab = 'pipeline' | 'fangraphs';
type SortField = 'rank' | 'name' | 'team' | 'inventory_count';
type SortDir = 'asc' | 'desc';

export default function TopProspects() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('top100');
  const [activeTab, setActiveTab] = useState<SourceTab>('pipeline');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterInventory, setFilterInventory] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  // Top 100 data
  const { data: top100Data, isLoading: top100Loading, error: top100Error } = useQuery({
    queryKey: ['top-prospects'],
    queryFn: prospectsApi.getTopProspects,
    staleTime: 1000 * 60 * 30,
    enabled: viewMode === 'top100',
  });

  // MLB orgs for team picker
  const { data: orgs } = useQuery({
    queryKey: ['mlb-orgs'],
    queryFn: prospectsApi.getMlbOrgs,
    staleTime: 1000 * 60 * 60 * 24, // 24h
    enabled: viewMode === 'byTeam',
  });

  // Team prospects
  const { data: teamData, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['team-prospects', selectedTeamId],
    queryFn: () => prospectsApi.getTeamProspects(selectedTeamId!),
    staleTime: 1000 * 60 * 30,
    enabled: viewMode === 'byTeam' && selectedTeamId !== null,
  });

  const refreshMutation = useMutation({
    mutationFn: prospectsApi.refreshProspects,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-prospects'] });
      queryClient.invalidateQueries({ queryKey: ['team-prospects'] });
    },
  });

  // Current prospect list based on view mode
  const prospects: ProspectEntry[] =
    viewMode === 'top100'
      ? top100Data?.[activeTab] ?? []
      : teamData?.prospects ?? [];

  const isLoading = viewMode === 'top100' ? top100Loading : teamLoading;
  const error = viewMode === 'top100' ? top100Error : teamError;

  // Filter & sort
  const filtered = prospects
    .filter((p) => {
      if (filterInventory && !p.has_inventory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'rank':
          cmp = a.rank - b.rank;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'team':
          cmp = a.team.localeCompare(b.team);
          break;
        case 'inventory_count':
          cmp = a.inventory_count - b.inventory_count;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'inventory_count' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} className="inline ml-0.5" />
    ) : (
      <ChevronDown size={14} className="inline ml-0.5" />
    );
  };

  // Stats
  const totalWithInventory = prospects.filter((p) => p.has_inventory).length;

  // Filtered team list for picker
  const filteredOrgs = (orgs ?? []).filter((o) =>
    teamSearch
      ? o.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        o.abbreviation.toLowerCase().includes(teamSearch.toLowerCase())
      : true
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="text-amber-500" size={28} />
            Top Prospects
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {viewMode === 'top100'
              ? 'Just Baseball & FanGraphs Top 100 with inventory cross-reference'
              : teamData?.team_name
                ? `${teamData.team_name} — Top 30 Prospects`
                : 'Select a team to view their top 30 prospects'}
          </p>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshMutation.isPending ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('top100')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'top100'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Star size={14} />
          Top 100
        </button>
        <button
          onClick={() => setViewMode('byTeam')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'byTeam'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          By Team
        </button>
      </div>

      {/* Top 100: Source sub-tabs */}
      {viewMode === 'top100' && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Just Baseball
            {top100Data?.pipeline?.length ? (
              <span className="ml-1 text-xs text-slate-400">({top100Data.pipeline.length})</span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('fangraphs')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'fangraphs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            FanGraphs
            {top100Data?.fangraphs?.length ? (
              <span className="ml-1 text-xs text-slate-400">({top100Data.fangraphs.length})</span>
            ) : null}
          </button>
        </div>
      )}

      {/* By Team: Team Picker */}
      {viewMode === 'byTeam' && (
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filteredOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedTeamId(org.id);
                  setSortField('rank');
                  setSortDir('asc');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedTeamId === org.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {org.abbreviation}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {prospects.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-slate-600">
            <Package size={14} className="inline mr-1" />
            {totalWithInventory} of {prospects.length} prospects in inventory
          </span>
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(totalWithInventory / Math.max(prospects.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Search & Filters */}
      {(viewMode === 'top100' || selectedTeamId) && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, team, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setFilterInventory(!filterInventory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filterInventory
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package size={14} />
            In Inventory Only
          </button>
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <RefreshCw size={24} className="animate-spin mr-2" />
          Loading prospects... (scraping may take a moment)
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
          <AlertCircle size={18} />
          <span>Failed to load prospects: {(error as Error).message}</span>
        </div>
      )}

      {/* Prospects Table */}
      {!isLoading && prospects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 w-16"
                  onClick={() => handleSort('rank')}
                >
                  # <SortIcon field="rank" />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('name')}
                >
                  Player <SortIcon field="name" />
                </th>
                {viewMode === 'top100' && (
                  <th
                    className="text-left px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 w-40"
                    onClick={() => handleSort('team')}
                  >
                    Team <SortIcon field="team" />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Pos</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-16">Age</th>
                <th
                  className="text-center px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 w-32"
                  onClick={() => handleSort('inventory_count')}
                >
                  Inventory <SortIcon field="inventory_count" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <ProspectRow
                  key={`${p.source}-${p.rank}-${p.name}`}
                  prospect={p}
                  index={i}
                  showTeam={viewMode === 'top100'}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={viewMode === 'top100' ? 6 : 5} className="text-center py-8 text-gray-400">
                    No prospects match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !error && prospects.length === 0 && viewMode === 'top100' && (
        <div className="text-center py-20 text-gray-400">
          <Star size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No prospect data available</p>
          <p className="text-sm mt-1">Try refreshing to scrape the latest rankings</p>
        </div>
      )}

      {viewMode === 'byTeam' && !selectedTeamId && !isLoading && (
        <div className="text-center py-20 text-gray-400">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Select a team above</p>
          <p className="text-sm mt-1">Choose an MLB organization to view their top 30 prospects</p>
        </div>
      )}

      {viewMode === 'byTeam' && selectedTeamId && !isLoading && !error && prospects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No prospect data found for this team</p>
          <p className="text-sm mt-1">The data source may not have prospects listed for this organization</p>
        </div>
      )}
    </div>
  );
}

function ProspectRow({
  prospect: p,
  index,
  showTeam,
}: {
  prospect: ProspectEntry;
  index: number;
  showTeam: boolean;
}) {
  return (
    <tr
      className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
        index % 2 === 1 ? 'bg-gray-50/50' : ''
      }`}
    >
      <td className="px-4 py-2.5 font-bold text-slate-500 text-center">{p.rank}</td>
      <td className="px-4 py-2.5">
        <span className="font-medium text-gray-900">{p.name}</span>
      </td>
      {showTeam && <td className="px-4 py-2.5 text-gray-600">{p.team}</td>}
      <td className="px-4 py-2.5">
        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
          {p.position || '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center text-gray-500">{p.age ?? '—'}</td>
      <td className="px-4 py-2.5 text-center">
        {p.has_inventory ? (
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Package size={12} />
              {p.inventory_count}
            </span>
            {p.unsigned_count > 0 && (
              <span className="text-xs text-gray-400" title="Unsigned">
                {p.unsigned_count}u
              </span>
            )}
            {p.signed_count > 0 && (
              <span className="text-xs text-blue-500" title="Signed">
                {p.signed_count}s
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}
