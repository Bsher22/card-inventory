import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, ChevronDown, Plus, Minus, Package, 
  Pen, Award, Filter 
} from 'lucide-react';
import { api } from '../api';
import type { InventoryWithCard } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSigned, setFilterSigned] = useState<boolean | undefined>(undefined);
  const [filterSlabbed, setFilterSlabbed] = useState<boolean | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(true);

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.products.getBrands(),
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', filterBrand, search, inStockOnly],
    queryFn: () => api.inventory.getInventory({
      brand_id: filterBrand || undefined,
      search: search || undefined,
      in_stock_only: inStockOnly,
      limit: 200,
    }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, adjustment }: { id: string; adjustment: number }) =>
      api.inventory.adjustInventory(id, adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  // Filter by signed/slabbed status client-side
  const filteredInventory = inventory?.filter((item) => {
    if (filterSigned !== undefined && item.checklist) {
      // This would need the inventory item's is_signed field
      // For now, we'll skip this filter
    }
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">Track your card inventory with quantities and conditions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
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
            onChange={(e) => setFilterBrand(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">In stock only</span>
        </label>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredInventory?.length || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Cards</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredInventory?.reduce((sum, i) => sum + i.quantity, 0) || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Signed Cards</p>
          <p className="text-2xl font-bold text-purple-600">
            {filteredInventory?.filter(i => i.is_signed).reduce((sum, i) => sum + i.quantity, 0) || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Slabbed Cards</p>
          <p className="text-2xl font-bold text-blue-600">
            {filteredInventory?.filter(i => i.is_slabbed).reduce((sum, i) => sum + i.quantity, 0) || 0}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b">
                <th className="px-4 py-3 font-medium">Card</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium text-right">Cost</th>
                <th className="px-4 py-3 font-medium text-center">Qty</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInventory?.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  onAdjust={(adjustment) => adjustMutation.mutate({ id: item.id, adjustment })}
                  isAdjusting={adjustMutation.isPending}
                />
              ))}

              {filteredInventory?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No inventory found. Add cards via purchases or checklist.
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

function InventoryRow({
  item,
  onAdjust,
  isAdjusting,
}: {
  item: InventoryWithCard;
  onAdjust: (adjustment: number) => void;
  isAdjusting: boolean;
}) {
  const checklist = item.checklist;
  const player = checklist?.player;
  const productLine = checklist?.product_line;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">
            {player?.name || checklist?.player_name_raw || 'Unknown'}
          </div>
          <div className="text-sm text-gray-500">
            #{checklist?.card_number} {checklist?.parallel_name !== 'Base' && checklist?.parallel_name}
            {checklist?.serial_numbered && ` /${checklist.serial_numbered}`}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {productLine ? `${productLine.year} ${productLine.name}` : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {item.is_signed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
              <Pen size={12} />
              Signed
            </span>
          )}
          {item.is_slabbed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
              <Award size={12} />
              {item.grade_company} {item.grade_value}
            </span>
          )}
          {!item.is_signed && !item.is_slabbed && (
            <span className="text-xs text-gray-400">Raw</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {item.is_slabbed ? (
          <span className="font-medium text-gray-900">
            {item.grade_company} {item.grade_value}
            {item.auto_grade && ` / Auto ${item.auto_grade}`}
          </span>
        ) : (
          <span className="text-gray-600">{item.raw_condition}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {item.total_cost > 0 ? formatCurrency(Number(item.total_cost)) : '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`font-bold ${item.quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {item.quantity}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onAdjust(-1)}
            disabled={isAdjusting || item.quantity === 0}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => onAdjust(1)}
            disabled={isAdjusting}
            className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
