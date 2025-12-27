import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ChevronDown, Star, Pen, Award } from 'lucide-react';
import { api } from '../api';
import type { ProductLineSummary } from '../types';

export default function Checklists() {
  const [search, setSearch] = useState('');
  const [filterProductLine, setFilterProductLine] = useState('');
  const [filterRookie, setFilterRookie] = useState<boolean | undefined>(undefined);
  const [filterAuto, setFilterAuto] = useState<boolean | undefined>(undefined);

  const { data: productLines } = useQuery({
    queryKey: ['product-lines'],
    queryFn: () => api.products.getProductLines(),
  });

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists', filterProductLine, filterRookie, filterAuto, search],
    queryFn: () => api.checklists.getChecklists({
      product_line_id: filterProductLine || undefined,
      is_rookie: filterRookie,
      is_auto: filterAuto,
      search: search || undefined,
      limit: 200,
    }),
    enabled: true,
  });

  // Group by product line for display
  const groupedByProductLine = checklists?.reduce((acc, card) => {
    const plName = card.product_line 
      ? `${card.product_line.year} ${card.product_line.name}`
      : 'Unknown';
    if (!acc[plName]) acc[plName] = [];
    acc[plName].push(card);
    return acc;
  }, {} as Record<string, typeof checklists>);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <p className="text-gray-500 mt-1">Browse all cards across your product lines</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name or card number..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <select
            value={filterProductLine}
            onChange={(e) => setFilterProductLine(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Product Lines</option>
            {productLines?.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.year} {pl.brand_name} {pl.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterRookie(filterRookie === true ? undefined : true)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
              filterRookie === true
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star size={14} />
            Rookies
          </button>
          <button
            onClick={() => setFilterAuto(filterAuto === true ? undefined : true)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
              filterAuto === true
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Pen size={14} />
            Autos
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {checklists?.length || 0} cards found
      </div>

      {/* Checklist Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Parallel</th>
                <th className="px-4 py-3 font-medium text-center">Type</th>
                <th className="px-4 py-3 font-medium text-right">In Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checklists?.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">
                    {card.card_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {card.player?.name || card.player_name_raw || 'Unknown'}
                    </div>
                    {card.product_line && (
                      <div className="text-xs text-gray-500">
                        {card.product_line.year} {card.product_line.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {card.team || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{card.parallel_name || 'Base'}</span>
                    {card.serial_numbered && (
                      <span className="ml-2 text-xs text-gray-400">/{card.serial_numbered}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {card.is_rookie_card && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                          RC
                        </span>
                      )}
                      {card.is_autograph && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          Auto
                        </span>
                      )}
                      {card.is_relic && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          Relic
                        </span>
                      )}
                      {card.is_short_print && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          SP
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      card.inventory_quantity > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {card.inventory_quantity}
                    </span>
                  </td>
                </tr>
              ))}

              {checklists?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No cards found. Upload a checklist to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
