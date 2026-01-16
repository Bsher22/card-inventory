import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Pen,
  Filter,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../api';

type SortField = 'player' | 'team' | 'product_line' | 'parallel' | 'type' | 'inventory';
type SortDirection = 'asc' | 'desc';

export default function Checklists() {
  // Search
  const [search, setSearch] = useState('');

  // Filters
  const [filterProductLine, setFilterProductLine] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRookie, setFilterRookie] = useState<boolean | undefined>(undefined);
  const [filterAuto, setFilterAuto] = useState<boolean | undefined>(undefined);
  const [filterFirstBowman, setFilterFirstBowman] = useState<boolean | undefined>(undefined);
  const [filterInStock, setFilterInStock] = useState<boolean | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('player');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch data
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
      limit: 500,
    }),
    enabled: true,
  });

  // Extract unique years and teams from product lines and checklists
  const years = useMemo(() => {
    if (!productLines) return [];
    const uniqueYears = [...new Set(productLines.map(pl => pl.year))].filter(Boolean);
    return uniqueYears.sort((a, b) => b - a); // Descending
  }, [productLines]);

  const teams = useMemo(() => {
    if (!checklists) return [];
    const uniqueTeams = [...new Set(checklists.map(c => c.team).filter(Boolean))];
    return uniqueTeams.sort();
  }, [checklists]);

  // Filter product lines by selected year
  const filteredProductLines = useMemo(() => {
    if (!productLines) return [];
    if (!filterYear) return productLines;
    return productLines.filter(pl => pl.year === parseInt(filterYear));
  }, [productLines, filterYear]);

  // Client-side filtering and sorting
  const filteredAndSortedChecklists = useMemo(() => {
    if (!checklists) return [];

    let result = [...checklists];

    // Apply client-side filters
    if (filterYear) {
      result = result.filter(c => c.product_line?.year === parseInt(filterYear));
    }

    if (filterTeam) {
      result = result.filter(c => c.team === filterTeam);
    }

    if (filterFirstBowman === true) {
      result = result.filter(c => c.is_first_bowman);
    }

    if (filterInStock === true) {
      result = result.filter(c => (c.inventory_count || 0) > 0);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'player':
          const nameA = a.player?.name || a.player_name_raw || '';
          const nameB = b.player?.name || b.player_name_raw || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'team':
          comparison = (a.team || '').localeCompare(b.team || '');
          break;
        case 'product_line':
          const plA = a.product_line?.name || '';
          const plB = b.product_line?.name || '';
          comparison = plA.localeCompare(plB);
          break;
        case 'parallel':
          comparison = (a.parallel_name || 'Base').localeCompare(b.parallel_name || 'Base');
          break;
        case 'type':
          // Sort by type badges: 1st > Auto > RC > Relic
          const typeScoreA = (a.is_first_bowman ? 8 : 0) + (a.is_autograph ? 4 : 0) + (a.is_rookie_card ? 2 : 0) + (a.is_relic ? 1 : 0);
          const typeScoreB = (b.is_first_bowman ? 8 : 0) + (b.is_autograph ? 4 : 0) + (b.is_rookie_card ? 2 : 0) + (b.is_relic ? 1 : 0);
          comparison = typeScoreB - typeScoreA;
          break;
        case 'inventory':
          comparison = (a.inventory_count || 0) - (b.inventory_count || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [checklists, filterYear, filterTeam, filterFirstBowman, filterInStock, sortField, sortDirection]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-300" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-blue-600" />
      : <ChevronDown size={14} className="text-blue-600" />;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setFilterProductLine('');
    setFilterYear('');
    setFilterTeam('');
    setFilterRookie(undefined);
    setFilterAuto(undefined);
    setFilterFirstBowman(undefined);
    setFilterInStock(undefined);
  };

  // Count active filters
  const activeFilterCount = [
    filterProductLine,
    filterYear,
    filterTeam,
    filterRookie,
    filterAuto,
    filterFirstBowman,
    filterInStock,
  ].filter(f => f !== '' && f !== undefined).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <p className="text-gray-500 mt-1">Browse all cards across your product lines</p>
      </div>

      {/* Search & Filter Toggle */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
            Clear all
          </button>
        )}
      </div>

      {/* Expandable Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Year Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
              <div className="relative">
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setFilterProductLine(''); // Reset product line when year changes
                  }}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            {/* Product Line Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product Line</label>
              <div className="relative">
                <select
                  value={filterProductLine}
                  onChange={(e) => setFilterProductLine(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Products</option>
                  {filteredProductLines.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Team</label>
              <div className="relative">
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Teams</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            {/* In Stock Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Inventory</label>
              <div className="relative">
                <select
                  value={filterInStock === undefined ? '' : filterInStock ? 'in_stock' : 'out_of_stock'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterInStock(val === '' ? undefined : val === 'in_stock');
                  }}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="in_stock">In Stock Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          {/* Toggle Filters Row */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setFilterFirstBowman(filterFirstBowman === true ? undefined : true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filterFirstBowman === true
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              1st Bowman
            </button>
            <button
              onClick={() => setFilterRookie(filterRookie === true ? undefined : true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
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
      )}

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-500">
        {filteredAndSortedChecklists.length} cards found
        {activeFilterCount > 0 && checklists && filteredAndSortedChecklists.length !== checklists.length && (
          <span className="text-gray-400"> (filtered from {checklists.length})</span>
        )}
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
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('player')}
                >
                  <div className="flex items-center gap-1">
                    Player
                    <SortIndicator field="player" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('product_line')}
                >
                  <div className="flex items-center gap-1">
                    Product
                    <SortIndicator field="product_line" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('team')}
                >
                  <div className="flex items-center gap-1">
                    Team
                    <SortIndicator field="team" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('parallel')}
                >
                  <div className="flex items-center gap-1">
                    Parallel
                    <SortIndicator field="parallel" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Type
                    <SortIndicator field="type" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium text-right cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('inventory')}
                >
                  <div className="flex items-center justify-end gap-1">
                    In Stock
                    <SortIndicator field="inventory" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedChecklists.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {card.player?.name || card.player_name_raw || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      #{card.card_number}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {card.product_line?.name || '-'}
                    </div>
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
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {card.is_first_bowman && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          1st
                        </span>
                      )}
                      {card.is_autograph && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          Auto
                        </span>
                      )}
                      {card.is_rookie_card && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                          RC
                        </span>
                      )}
                      {card.is_relic && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          Relic
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      (card.inventory_count || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {card.inventory_count || 0}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredAndSortedChecklists.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No cards found. Try adjusting your filters or upload a checklist.
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
