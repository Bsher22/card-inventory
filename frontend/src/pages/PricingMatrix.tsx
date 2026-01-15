/**
 * Pricing Matrix Page
 *
 * Displays a grid of players (rows) vs consigners (columns) with prices.
 * Allows inline editing of prices.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  DollarSign,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { consignerPricingApi } from '../api/consignerPricingApi';
import type {
  PlayerRow,
  ConsignerPlayerPriceCreate,
} from '../types/consignerPricing';

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

interface EditingCell {
  playerId: string;
  consignerId: string;
  value: string;
}

export default function PricingMatrix() {
  const queryClient = useQueryClient();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyWithPrices, setOnlyWithPrices] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch matrix data
  const { data: matrix, isLoading, error } = useQuery({
    queryKey: ['pricing-matrix', debouncedSearch, onlyWithPrices, page],
    queryFn: () =>
      consignerPricingApi.getMatrix({
        player_search: debouncedSearch || undefined,
        only_with_prices: onlyWithPrices,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  // Create/update price mutation
  const createPriceMutation = useMutation({
    mutationFn: (data: ConsignerPlayerPriceCreate) =>
      consignerPricingApi.createPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix'] });
      setEditingCell(null);
    },
  });

  // Calculate stats for each consigner
  const consignerStats = useMemo(() => {
    if (!matrix) return {};

    const stats: Record<string, { count: number; total: number; min: number; max: number }> = {};

    matrix.consigners.forEach((c) => {
      stats[c.id] = { count: 0, total: 0, min: Infinity, max: -Infinity };
    });

    matrix.players.forEach((player) => {
      Object.entries(player.prices).forEach(([consignerId, priceInfo]) => {
        if (priceInfo.price_per_card !== null) {
          const s = stats[consignerId];
          s.count++;
          s.total += priceInfo.price_per_card;
          s.min = Math.min(s.min, priceInfo.price_per_card);
          s.max = Math.max(s.max, priceInfo.price_per_card);
        }
      });
    });

    return stats;
  }, [matrix]);

  // Handle cell click to edit
  const handleCellClick = (playerId: string, consignerId: string, currentPrice: number | null) => {
    setEditingCell({
      playerId,
      consignerId,
      value: currentPrice?.toString() || '',
    });
  };

  // Handle save
  const handleSave = () => {
    if (!editingCell) return;

    const price = parseFloat(editingCell.value);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }

    createPriceMutation.mutate({
      player_id: editingCell.playerId,
      consigner_id: editingCell.consignerId,
      price_per_card: price,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingCell(null);
  };

  // Get best price indicator for a player row
  const getBestPrice = (player: PlayerRow): { consignerId: string; price: number } | null => {
    let best: { consignerId: string; price: number } | null = null;

    Object.entries(player.prices).forEach(([consignerId, info]) => {
      if (info.price_per_card !== null) {
        if (!best || info.price_per_card < best.price) {
          best = { consignerId, price: info.price_per_card };
        }
      }
    });

    return best;
  };

  // Export to CSV
  const handleExport = () => {
    if (!matrix) return;

    const headers = ['Player', ...matrix.consigners.map((c) => c.name)];
    const rows = matrix.players.map((player) => [
      player.name,
      ...matrix.consigners.map((c) => {
        const price = player.prices[c.id]?.price_per_card;
        return price !== null ? price.toString() : '';
      }),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consigner-pricing-matrix.csv';
    a.click();
  };

  // Pagination
  const totalPages = matrix ? Math.ceil(matrix.total_players / pageSize) : 0;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading pricing matrix: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Matrix</h1>
          <p className="text-gray-500 mt-1">
            Compare consigner prices across players - Click any cell to edit
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!matrix}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithPrices}
            onChange={(e) => {
              setOnlyWithPrices(e.target.checked);
              setPage(0);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Only show players with prices</span>
        </label>

        {matrix && (
          <div className="text-sm text-gray-500">
            {matrix.total_players} players - {matrix.total_consigners} consigners
          </div>
        )}
      </div>

      {/* Matrix Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-full"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded w-full"></div>
            ))}
          </div>
        </div>
      ) : matrix && matrix.consigners.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-[200px] z-10">
                    Player
                  </th>
                  {matrix.consigners.map((consigner) => (
                    <th
                      key={consigner.id}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[120px]"
                    >
                      <div>{consigner.name}</div>
                      {consigner.default_fee && (
                        <div className="text-xs font-normal text-gray-500">
                          Default: {formatCurrency(consigner.default_fee)}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[100px]">
                    Best
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrix.players.map((player) => {
                  const bestPrice = getBestPrice(player);

                  return (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 z-10">
                        <div>{player.name}</div>
                        {player.team && (
                          <div className="text-xs text-gray-500">{player.team}</div>
                        )}
                      </td>

                      {matrix.consigners.map((consigner) => {
                        const priceInfo = player.prices[consigner.id];
                        const isEditing =
                          editingCell?.playerId === player.id &&
                          editingCell?.consignerId === consigner.id;
                        const isBest =
                          bestPrice?.consignerId === consigner.id &&
                          priceInfo?.price_per_card !== null;

                        return (
                          <td
                            key={consigner.id}
                            className={`px-4 py-3 text-center text-sm ${
                              isBest ? 'bg-green-50' : ''
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-gray-400">$</span>
                                <input
                                  type="number"
                                  value={editingCell.value}
                                  onChange={(e) =>
                                    setEditingCell({
                                      ...editingCell,
                                      value: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                  }}
                                  className="w-16 px-1 py-0.5 border border-blue-400 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                  min="0"
                                  step="0.01"
                                />
                                <button
                                  onClick={handleSave}
                                  disabled={createPriceMutation.isPending}
                                  className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  handleCellClick(
                                    player.id,
                                    consigner.id,
                                    priceInfo?.price_per_card ?? null
                                  )
                                }
                                className={`w-full px-2 py-1 rounded transition-colors ${
                                  priceInfo?.price_per_card !== null
                                    ? isBest
                                      ? 'text-green-700 font-semibold hover:bg-green-100'
                                      : 'text-gray-900 hover:bg-gray-100'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                }`}
                              >
                                {priceInfo?.price_per_card !== null
                                  ? formatCurrency(priceInfo.price_per_card)
                                  : '-'}
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Best Price Column */}
                      <td className="px-4 py-3 text-center text-sm">
                        {bestPrice ? (
                          <div className="text-green-700 font-semibold">
                            {formatCurrency(bestPrice.price)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="sticky left-0 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 z-10">
                    Summary
                  </td>
                  {matrix.consigners.map((consigner) => {
                    const stats = consignerStats[consigner.id];
                    return (
                      <td
                        key={consigner.id}
                        className="px-4 py-2 text-center text-xs text-gray-600"
                      >
                        {stats && stats.count > 0 ? (
                          <div className="space-y-0.5">
                            <div>{stats.count} prices</div>
                            <div>
                              Avg: {formatCurrency(stats.total / stats.count)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-green-600 flex items-center gap-0.5">
                                <TrendingDown size={10} />
                                {formatCurrency(stats.min)}
                              </span>
                              <Minus size={10} className="text-gray-400" />
                              <span className="text-red-600 flex items-center gap-0.5">
                                <TrendingUp size={10} />
                                {formatCurrency(stats.max)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No prices</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {page * pageSize + 1} -{' '}
                {Math.min((page + 1) * pageSize, matrix.total_players)} of{' '}
                {matrix.total_players}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pricing Data</h3>
          <p className="text-gray-500">
            {matrix?.total_consigners === 0
              ? 'Add consigners first to start tracking prices.'
              : 'No players match your search criteria.'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span>Best price for player</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">-</span>
          <span>No price set (click to add)</span>
        </div>
      </div>
    </div>
  );
}
