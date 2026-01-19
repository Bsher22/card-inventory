/**
 * Inventory Page with eBay Listing Generation
 * 
 * Features:
 * - Toggle "Generate eBay Listings" mode
 * - Checkboxes appear when toggle is ON
 * - Select cards → Generate Listings button
 * - Navigate to /ebay-listings with selected IDs
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  Package,
  ShoppingCart,
  CheckSquare,
  Square,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api';
import type { InventoryWithCard } from '../types';

export default function Inventory() {
  const navigate = useNavigate();
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterProductLine, setFilterProductLine] = useState('');
  const [filterSigned, setFilterSigned] = useState<boolean | undefined>(undefined);
  const [filterSlabbed, setFilterSlabbed] = useState<boolean | undefined>(undefined);
  
  // eBay listing mode
  const [ebayMode, setEbayMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', { search, filterBrand, filterProductLine }],
    queryFn: () => api.inventory.getInventory({
      search: search || undefined,
      brand_id: filterBrand || undefined,
      product_line_id: filterProductLine || undefined,
    }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.products.getBrands(),
  });

  const { data: productLines } = useQuery({
    queryKey: ['product-lines', filterBrand],
    queryFn: () => api.products.getProductLines({ brand_id: filterBrand || undefined }),
    enabled: true,
  });

  // Filter inventory client-side for signed/slabbed
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    
    return inventory.filter((item) => {
      if (filterSigned !== undefined && item.is_signed !== filterSigned) return false;
      if (filterSlabbed !== undefined && item.is_slabbed !== filterSlabbed) return false;
      return true;
    });
  }, [inventory, filterSigned, filterSlabbed]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredInventory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInventory.map((item) => item.id)));
    }
  };

  const generateListings = () => {
    if (selectedIds.size === 0) return;
    const idsParam = Array.from(selectedIds).join(',');
    navigate(`/ebay-listings?ids=${idsParam}`);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">
            {filteredInventory.length} cards • Track your card inventory with quantities and conditions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* eBay Mode Toggle */}
          <button
            onClick={() => {
              setEbayMode(!ebayMode);
              if (ebayMode) setSelectedIds(new Set()); // Clear selection when turning off
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              ebayMode
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart size={18} />
            {ebayMode ? 'Exit eBay Mode' : 'Generate eBay Listings'}
          </button>
        </div>
      </div>

      {/* eBay Selection Bar (visible when ebayMode is ON) */}
      {ebayMode && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-800"
            >
              {selectedIds.size === filteredInventory.length && filteredInventory.length > 0 ? (
                <CheckSquare size={18} />
              ) : (
                <Square size={18} />
              )}
              {selectedIds.size === filteredInventory.length && filteredInventory.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </button>
            <span className="text-orange-600">
              {selectedIds.size} of {filteredInventory.length} selected
            </span>
          </div>

          <button
            onClick={generateListings}
            disabled={selectedIds.size === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedIds.size > 0
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ExternalLink size={18} />
            Generate {selectedIds.size} Listing{selectedIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player or card number..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <select
            value={filterBrand}
            onChange={(e) => {
              setFilterBrand(e.target.value);
              setFilterProductLine('');
            }}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterProductLine}
            onChange={(e) => setFilterProductLine(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Products</option>
            {productLines?.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.year} {pl.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterSigned === undefined ? '' : filterSigned ? 'signed' : 'unsigned'}
            onChange={(e) => {
              const val = e.target.value;
              setFilterSigned(val === '' ? undefined : val === 'signed');
            }}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All (Signed/Unsigned)</option>
            <option value="signed">Signed Only</option>
            <option value="unsigned">Unsigned Only</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterSlabbed === undefined ? '' : filterSlabbed ? 'slabbed' : 'raw'}
            onChange={(e) => {
              const val = e.target.value;
              setFilterSlabbed(val === '' ? undefined : val === 'slabbed');
            }}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All (Raw/Slabbed)</option>
            <option value="slabbed">Slabbed Only</option>
            <option value="raw">Raw Only</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No inventory found</h3>
          <p className="text-gray-500">Try adjusting your filters or add some cards.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {ebayMode && (
                  <th className="px-3 py-1.5 text-left">
                    <button onClick={selectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedIds.size === filteredInventory.length && filteredInventory.length > 0 ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600">Player</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600">Card</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600">Parallel</th>
                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-600">Qty</th>
                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-600">Status</th>
                <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-600">Total Cost</th>
                <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-600">Per Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    ebayMode && selectedIds.has(item.id) ? 'bg-orange-50' : ''
                  }`}
                  onClick={ebayMode ? () => toggleSelection(item.id) : undefined}
                  style={ebayMode ? { cursor: 'pointer' } : undefined}
                >
                  {ebayMode && (
                    <td className="px-3 py-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(item.id);
                        }}
                        className="text-orange-500"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-1.5">
                    <div className="text-sm font-medium text-gray-900">
                      {item.checklist?.player?.name || item.checklist?.player_name_raw || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.checklist?.team || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-sm text-gray-900">
                      {item.checklist?.product_line?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      #{item.checklist?.card_number}
                      {item.checklist?.is_first_bowman && (
                        <span className="ml-1.5 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                          1st
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-sm text-gray-700">
                      {item.base_type?.name || 'Chrome'}
                    </div>
                    {item.parallel && (
                      <div className="text-xs text-gray-500">
                        {item.parallel.name}
                        {item.parallel.is_numbered && item.parallel.numbered_to && ` /${item.parallel.numbered_to}`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-center gap-1">
                      {item.is_signed && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Signed
                        </span>
                      )}
                      {item.is_slabbed ? (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {item.grade_company} {item.grade_value}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Raw
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.total_cost)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-sm text-gray-600">
                    {formatCurrency(
                      item.total_cost && item.quantity
                        ? item.total_cost / item.quantity
                        : null
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
