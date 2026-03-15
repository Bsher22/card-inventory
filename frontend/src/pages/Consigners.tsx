// src/pages/Consigners.tsx
// Consigners with home teams, MiLB schedule, roster & inventory cross-reference

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit2,
  Copy,
  Check,
  X,
  Search,
  Calendar,
  Users,
  Package,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import type {
  Consigner,
  ConsignerCreate,
  ConsignerUpdate,
} from '../types';
import { US_STATES } from '../types';
import { AddressInline } from '../components/AddressFields';
import type { MilbTeam, GameWithInventory, PlayerInventoryMatch } from '../api/mlbStatsApi';
import type { ConsignerHomeTeamCreate } from '../api/consignmentsApi';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTwoWeeksFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Consigners() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConsigner, setEditingConsigner] = useState<Consigner | null>(null);
  const [selectedConsigner, setSelectedConsigner] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: consigners, isLoading } = useQuery({
    queryKey: ['consigners', showInactive],
    queryFn: () => api.consignments.getConsigners({ active_only: !showInactive }),
  });

  const handleCreated = () => {
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['consigners'] });
  };

  const handleUpdated = () => {
    setEditingConsigner(null);
    queryClient.invalidateQueries({ queryKey: ['consigners'] });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consigners</h1>
          <p className="text-gray-500 mt-1">Manage people who get autographs at games and events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Consigner
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Show inactive consigners</span>
        </label>
      </div>

      {/* Consigners Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consigners?.map((consigner) => (
            <ConsignerCard
              key={consigner.id}
              consigner={consigner}
              isExpanded={selectedConsigner === consigner.id}
              onToggle={() => setSelectedConsigner(
                selectedConsigner === consigner.id ? null : consigner.id
              )}
              onEdit={() => setEditingConsigner(consigner)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['consigners'] })}
            />
          ))}

          {consigners?.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No consigners found. Add one to start tracking autograph consignments.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ConsignerFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
        />
      )}

      {/* Edit Modal */}
      {editingConsigner && (
        <ConsignerFormModal
          consigner={editingConsigner}
          onClose={() => setEditingConsigner(null)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  );
}


// ============================================
// CONSIGNER CARD COMPONENT
// ============================================

interface ConsignerCardProps {
  consigner: Consigner;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}

function ConsignerCard({ consigner, isExpanded, onToggle, onEdit, onUpdate }: ConsignerCardProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.consignments.updateConsigner(consigner.id, {
      is_active: !consigner.is_active
    }),
    onSuccess: onUpdate,
  });

  const handleCopyAddress = async () => {
    if (consigner.formatted_address) {
      await navigator.clipboard.writeText(consigner.formatted_address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const homeTeams = consigner.home_teams || [];

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        consigner.is_active
          ? 'border-gray-100 hover:border-gray-200'
          : 'border-gray-200 bg-gray-50'
      } ${isExpanded ? 'col-span-full' : ''}`}
    >
      {/* Header - Always Visible */}
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{consigner.name}</h3>
              {!consigner.is_active && (
                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                  Inactive
                </span>
              )}
            </div>

            {/* Location summary */}
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <MapPin size={14} />
              <AddressInline city={consigner.city} state={consigner.state} />
            </div>

            {/* Home teams badges */}
            {homeTeams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {homeTeams.map((ht) => (
                  <span
                    key={ht.id}
                    className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200"
                  >
                    {ht.team_abbreviation || ht.team_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {consigner.default_fee && (
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(Number(consigner.default_fee))}/card
              </span>
            )}
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Contact & Address */}
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                {consigner.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <a href={`mailto:${consigner.email}`} className="hover:text-blue-600">
                      {consigner.email}
                    </a>
                  </div>
                )}
                {consigner.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${consigner.phone}`} className="hover:text-blue-600">
                      {consigner.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <MapPin size={12} />
                      Shipping Address
                    </div>
                    {consigner.formatted_address ? (
                      <div className="text-sm text-gray-900 whitespace-pre-line">
                        {consigner.formatted_address}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No address on file</div>
                    )}
                  </div>
                  {consigner.formatted_address && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAddress();
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              {(consigner.payment_method || consigner.payment_details) && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <CreditCard size={12} />
                    Payment
                  </div>
                  {consigner.payment_method && (
                    <div className="text-sm text-gray-700">{consigner.payment_method}</div>
                  )}
                  {consigner.payment_details && (
                    <div className="text-sm text-gray-500">{consigner.payment_details}</div>
                  )}
                </div>
              )}

              {/* Notes */}
              {consigner.notes && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                  {consigner.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActiveMutation.mutate();
                  }}
                  disabled={toggleActiveMutation.isPending}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    consigner.is_active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {consigner.is_active ? 'Mark Inactive' : 'Mark Active'}
                </button>
              </div>
            </div>

            {/* Right columns: Schedule & Inventory */}
            {homeTeams.length > 0 && (
              <div className="lg:col-span-2">
                <UpcomingSchedulePanel homeTeams={homeTeams} />
              </div>
            )}

            {homeTeams.length === 0 && (
              <div className="lg:col-span-2 flex items-center justify-center bg-gray-50 rounded-lg p-8">
                <div className="text-center text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No home teams assigned</p>
                  <p className="text-xs mt-1">Edit this consigner to add MiLB teams they attend</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================
// UPCOMING SCHEDULE PANEL
// ============================================

interface UpcomingSchedulePanelProps {
  homeTeams: Array<{ id: string; team_id: number; team_name: string; team_abbreviation: string | null }>;
}

function UpcomingSchedulePanel({ homeTeams }: UpcomingSchedulePanelProps) {
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getTwoWeeksFromNow());
  const [expandedGame, setExpandedGame] = useState<number | null>(null);

  // Fetch schedule with inventory for all home teams
  const scheduleQueries = homeTeams.map((ht) => ({
    teamId: ht.team_id,
    teamName: ht.team_name,
  }));

  // We'll fetch for each home team
  const { data: allGames, isLoading } = useQuery({
    queryKey: ['schedule-inventory', homeTeams.map(t => t.team_id), startDate, endDate],
    queryFn: async () => {
      const results: Array<{ teamName: string; games: GameWithInventory[] }> = [];
      for (const ht of homeTeams) {
        const games = await api.mlbStats.getScheduleWithInventory({
          team_id: ht.team_id,
          start_date: startDate,
          end_date: endDate,
        });
        results.push({ teamName: ht.team_name, games });
      }
      return results;
    },
    enabled: homeTeams.length > 0,
  });

  // Flatten and sort all games by date
  const sortedGames = useMemo(() => {
    if (!allGames) return [];
    const flat: Array<GameWithInventory & { hostTeamName: string }> = [];
    for (const { teamName, games } of allGames) {
      for (const g of games) {
        flat.push({ ...g, hostTeamName: teamName });
      }
    }
    // Deduplicate by game_pk
    const seen = new Set<number>();
    const deduped = flat.filter((g) => {
      if (seen.has(g.game_pk)) return false;
      seen.add(g.game_pk);
      return true;
    });
    deduped.sort((a, b) => a.date.localeCompare(b.date));
    return deduped;
  }, [allGames]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar size={16} />
          Upcoming Games
        </div>
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-400">
          No games found in this date range
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sortedGames.map((game) => (
            <GameCard
              key={game.game_pk}
              game={game}
              isExpanded={expandedGame === game.game_pk}
              onToggle={() => setExpandedGame(
                expandedGame === game.game_pk ? null : game.game_pk
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================
// GAME CARD (within schedule panel)
// ============================================

interface GameCardProps {
  game: GameWithInventory & { hostTeamName: string };
  isExpanded: boolean;
  onToggle: () => void;
}

function GameCard({ game, isExpanded, onToggle }: GameCardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');

  const totalHome = game.home_roster.length;
  const totalAway = game.away_roster.length;
  const homeInv = game.home_players_in_inventory;
  const awayInv = game.away_players_in_inventory;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{formatDate(game.date)}</span>
              <span className="text-sm font-semibold text-gray-900">
                {game.away_team} @ {game.home_team}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">{game.venue}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Inventory match summary */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full ${
                homeInv > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                H: {homeInv}/{totalHome}
              </span>
              <span className={`px-2 py-0.5 rounded-full ${
                awayInv > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                A: {awayInv}/{totalAway}
              </span>
            </div>
            <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'home'
                  ? 'bg-white text-emerald-700 border-b-2 border-emerald-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={12} className="inline mr-1" />
              {game.home_team} ({homeInv}/{totalHome} in inventory)
            </button>
            <button
              onClick={() => setActiveTab('away')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'away'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={12} className="inline mr-1" />
              {game.away_team} ({awayInv}/{totalAway} in inventory)
            </button>
          </div>

          {/* Roster list */}
          <div className="max-h-64 overflow-y-auto">
            <RosterList
              players={activeTab === 'home' ? game.home_roster : game.away_roster}
              accentColor={activeTab === 'home' ? 'emerald' : 'blue'}
            />
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================
// ROSTER LIST
// ============================================

interface RosterListProps {
  players: PlayerInventoryMatch[];
  accentColor: 'emerald' | 'blue';
}

function RosterList({ players, accentColor }: RosterListProps) {
  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-400">
        Roster not available
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-gray-50 text-gray-500">
          <th className="text-left px-3 py-1.5 font-medium">#</th>
          <th className="text-left px-3 py-1.5 font-medium">Player</th>
          <th className="text-left px-3 py-1.5 font-medium">Pos</th>
          <th className="text-right px-3 py-1.5 font-medium">Inventory</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr
            key={p.player_id}
            className={`border-t border-gray-100 ${
              p.has_inventory
                ? `bg-${accentColor}-50/50`
                : ''
            }`}
          >
            <td className="px-3 py-1.5 text-gray-400">{p.jersey_number || '-'}</td>
            <td className="px-3 py-1.5">
              <span className={p.has_inventory ? 'font-medium text-gray-900' : 'text-gray-600'}>
                {p.full_name}
              </span>
            </td>
            <td className="px-3 py-1.5 text-gray-400">{p.position}</td>
            <td className="px-3 py-1.5 text-right">
              {p.has_inventory ? (
                <div className="flex items-center justify-end gap-1">
                  <Package size={12} className={`text-${accentColor}-500`} />
                  <span className={`text-${accentColor}-700 font-medium`}>{p.inventory_count}</span>
                  <span className="text-gray-400 ml-1">
                    ({p.unsigned_count}u / {p.signed_count}s)
                  </span>
                </div>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


// ============================================
// CONSIGNER FORM MODAL (Create/Edit)
// ============================================

interface ConsignerFormModalProps {
  consigner?: Consigner;
  onClose: () => void;
  onSuccess: () => void;
}

function ConsignerFormModal({ consigner, onClose, onSuccess }: ConsignerFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!consigner;

  const [formData, setFormData] = useState<ConsignerCreate>({
    name: consigner?.name || '',
    email: consigner?.email || '',
    phone: consigner?.phone || '',
    street_address: consigner?.street_address || '',
    city: consigner?.city || '',
    state: consigner?.state || '',
    postal_code: consigner?.postal_code || '',
    country: consigner?.country || 'USA',
    location: consigner?.location || '',
    default_fee: consigner?.default_fee ? Number(consigner.default_fee) : undefined,
    payment_method: consigner?.payment_method || '',
    payment_details: consigner?.payment_details || '',
    notes: consigner?.notes || '',
    is_active: consigner?.is_active ?? true,
  });

  // Home teams state
  const [selectedTeams, setSelectedTeams] = useState<Array<{ team_id: number; team_name: string; team_abbreviation: string }>>(
    consigner?.home_teams?.map(ht => ({
      team_id: ht.team_id,
      team_name: ht.team_name,
      team_abbreviation: ht.team_abbreviation || '',
    })) || []
  );
  const [teamSearch, setTeamSearch] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  const [error, setError] = useState('');

  // Fetch MiLB teams for picker
  const { data: milbTeams } = useQuery({
    queryKey: ['milb-teams'],
    queryFn: () => api.mlbStats.getMilbTeams(),
    staleTime: 3600000,
  });

  const filteredTeams = useMemo(() => {
    if (!milbTeams || !teamSearch.trim()) return milbTeams || [];
    const search = teamSearch.toLowerCase();
    return milbTeams.filter(
      (t) => t.name.toLowerCase().includes(search) || t.abbreviation.toLowerCase().includes(search)
    );
  }, [milbTeams, teamSearch]);

  const createMutation = useMutation({
    mutationFn: (data: ConsignerCreate) => api.consignments.createConsigner(data),
    onSuccess: async (created) => {
      // Save home teams
      if (selectedTeams.length > 0) {
        await api.consignments.setConsignerHomeTeams(
          created.id,
          selectedTeams.map(t => ({
            team_id: t.team_id,
            team_name: t.team_name,
            team_abbreviation: t.team_abbreviation || undefined,
          }))
        );
      }
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ConsignerUpdate) => {
      const updated = await api.consignments.updateConsigner(consigner!.id, data);
      // Save home teams
      await api.consignments.setConsignerHomeTeams(
        consigner!.id,
        selectedTeams.map(t => ({
          team_id: t.team_id,
          team_name: t.team_name,
          team_abbreviation: t.team_abbreviation || undefined,
        }))
      );
      return updated;
    },
    onSuccess,
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTeam = (team: MilbTeam) => {
    if (selectedTeams.some(t => t.team_id === team.id)) return;
    setSelectedTeams([...selectedTeams, {
      team_id: team.id,
      team_name: team.name,
      team_abbreviation: team.abbreviation,
    }]);
    setTeamSearch('');
    setShowTeamDropdown(false);
  };

  const removeTeam = (teamId: number) => {
    setSelectedTeams(selectedTeams.filter(t => t.team_id !== teamId));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Consigner' : 'Add Consigner'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Smith"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Home Teams Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Home Teams</h3>
            <p className="text-xs text-gray-400">MiLB teams whose home games this consigner attends</p>

            {/* Selected teams */}
            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((t) => (
                  <span
                    key={t.team_id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-200"
                  >
                    {t.team_name}
                    <button
                      type="button"
                      onClick={() => removeTeam(t.team_id)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Team search */}
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => {
                    setTeamSearch(e.target.value);
                    setShowTeamDropdown(true);
                  }}
                  onFocus={() => setShowTeamDropdown(true)}
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search MiLB teams..."
                />
              </div>

              {showTeamDropdown && filteredTeams.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTeams.slice(0, 20).map((team) => {
                    const isSelected = selectedTeams.some(t => t.team_id === team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        disabled={isSelected}
                        onClick={() => addTeam(team)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          isSelected ? 'opacity-40 cursor-not-allowed' : ''
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

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Shipping Address</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.street_address || ''}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main St, Suite 100"
              />
            </div>

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">--</option>
                  {US_STATES.map((state: { value: string; label: string }) => (
                    <option key={state.value} value={state.value}>
                      {state.value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country || 'USA'}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="USA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Label
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Home, Office, Spring Training"
              />
              <p className="text-xs text-gray-400 mt-1">A label to identify this address</p>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1">Fee & Payment</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Fee per Card</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.default_fee ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_fee: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method || ''}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select method...</option>
                <option value="Venmo">Venmo</option>
                <option value="PayPal">PayPal</option>
                <option value="Zelle">Zelle</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Details</label>
              <input
                type="text"
                value={formData.payment_details || ''}
                onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., @venmo-handle, paypal@email.com"
              />
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Any additional notes about this consigner..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? (isEditing ? 'Saving...' : 'Creating...')
                : (isEditing ? 'Save Changes' : 'Add Consigner')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
