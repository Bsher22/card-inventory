import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  X,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  AlertCircle,
  Package,
  Store,
} from 'lucide-react';
import { api } from '../api';
import type {
  Sale,
  SaleCreate,
  SalesAnalytics,
  InventoryWithCard,
} from '../types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// INVENTORY SEARCH MODAL COMPONENT
// ============================================

interface InventorySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: InventoryWithCard) => void;
  excludeIds?: string[];
}

function InventorySearchModal({
  isOpen,
  onClose,
  onSelect,
  excludeIds = [],
}: InventorySearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [signedFilter, setSignedFilter] = useState<string>('');
  const [slabbedFilter, setSlabbedFilter] = useState<string>('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm, signedFilter, slabbedFilter],
    queryFn: () =>
      api.inventory.getInventory({
        search: searchTerm || undefined,
        is_signed: signedFilter === 'true' ? true : signedFilter === 'false' ? false : undefined,
        is_slabbed: slabbedFilter === 'true' ? true : slabbedFilter === 'false' ? false : undefined,
        limit: 50,
      }),
    enabled: isOpen,
  });

  const filteredItems = inventory?.filter((i) => !excludeIds.includes(i.id) && i.quantity > 0) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Select from Inventory</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <select
              value={signedFilter}
              onChange={(e) => setSignedFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All (Signed/Unsigned)</option>
              <option value="true">Signed Only</option>
              <option value="false">Unsigned Only</option>
            </select>
            <select
              value={slabbedFilter}
              onChange={(e) => setSlabbedFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All (Raw/Slabbed)</option>
              <option value="true">Slabbed Only</option>
              <option value="false">Raw Only</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No inventory items found matching your search
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {item.is_signed && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            SIGNED
                          </span>
                        )}
                        {item.is_slabbed && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {item.grade_company} {item.grade_value}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {item.raw_condition || 'NM'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">Qty: {item.quantity}</div>
                      <div className="text-sm text-gray-500">
                        Cost: {formatCurrency(item.total_cost / item.quantity)}/ea
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.checklist?.set_name || item.checklist?.product_line?.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SALE FORM MODAL COMPONENT
// ============================================

interface SaleLineItem {
  id: string;
  inventoryItem: InventoryWithCard;
  quantity: number;
  sale_price: number;
  cost_basis: number;
  notes: string;
}

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function SaleFormModal({ isOpen, onClose, onSuccess }: SaleFormModalProps) {
  const queryClient = useQueryClient();
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [removeFromInventory, setRemoveFromInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sale_date: getTodayString(),
    platform: 'eBay',
    buyer_name: '',
    order_number: '',
    platform_fees: 0,
    payment_fees: 0,
    shipping_collected: 0,
    shipping_cost: 0,
    notes: '',
  });

  const [lineItems, setLineItems] = useState<SaleLineItem[]>([]);

  // Calculate totals
  const grossAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.sale_price, 0);
  const totalFees = formData.platform_fees + formData.payment_fees + formData.shipping_cost;
  const netAmount = grossAmount + formData.shipping_collected - totalFees;
  const totalCostBasis = lineItems.reduce((sum, item) => sum + item.cost_basis * item.quantity, 0);
  const profit = netAmount - totalCostBasis;

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: { sale: SaleCreate; removeFromInventory: boolean }) =>
      api.financial.createSale(data.sale, data.removeFromInventory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onSuccess();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleClose = () => {
    setFormData({
      sale_date: getTodayString(),
      platform: 'eBay',
      buyer_name: '',
      order_number: '',
      platform_fees: 0,
      payment_fees: 0,
      shipping_collected: 0,
      shipping_cost: 0,
      notes: '',
    });
    setLineItems([]);
    setError(null);
    onClose();
  };

  const handleAddInventoryItem = (item: InventoryWithCard) => {
    const unitCost = item.total_cost / item.quantity;
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        inventoryItem: item,
        quantity: 1,
        sale_price: 0,
        cost_basis: unitCost,
        notes: '',
      },
    ]);
  };

  const handleUpdateLineItem = (id: string, updates: Partial<SaleLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lineItems.length === 0) {
      setError('Please add at least one item to the sale');
      return;
    }

    // Validate quantities
    for (const item of lineItems) {
      if (item.quantity > item.inventoryItem.quantity) {
        setError(
          `Cannot sell ${item.quantity} of ${item.inventoryItem.checklist?.player_name_raw} - only ${item.inventoryItem.quantity} in stock`
        );
        return;
      }
    }

    const saleData: SaleCreate = {
      sale_date: formData.sale_date,
      platform: formData.platform,
      buyer_name: formData.buyer_name || null,
      order_number: formData.order_number || null,
      platform_fees: formData.platform_fees,
      payment_fees: formData.payment_fees,
      shipping_collected: formData.shipping_collected,
      shipping_cost: formData.shipping_cost,
      notes: formData.notes || null,
      items: lineItems.map((item) => ({
        checklist_id: item.inventoryItem.checklist_id,
        quantity: item.quantity,
        sale_price: item.sale_price,
        notes: item.notes || null,
      })),
    };

    createMutation.mutate({ sale: saleData, removeFromInventory });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Record Sale</h2>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Sale Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Date *
                  </label>
                  <input
                    type="date"
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="eBay">eBay</option>
                    <option value="COMC">COMC</option>
                    <option value="MySlabs">MySlabs</option>
                    <option value="Facebook">Facebook</option>
                    <option value="In Person">In Person</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buyer</label>
                  <input
                    type="text"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    type="button"
                    onClick={() => setShowInventorySearch(true)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Plus size={16} />
                    Add from Inventory
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div
                    onClick={() => setShowInventorySearch(true)}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">Click to add items from your inventory</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Card
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                            Sale Price
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                            Cost Basis
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                            Profit
                          </th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lineItems.map((item) => {
                          const itemProfit =
                            item.quantity * item.sale_price - item.quantity * item.cost_basis;
                          return (
                            <tr key={item.id}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">
                                  #{item.inventoryItem.checklist?.card_number} -{' '}
                                  {item.inventoryItem.checklist?.player_name_raw}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {item.inventoryItem.is_signed && (
                                    <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                      SIGNED
                                    </span>
                                  )}
                                  {item.inventoryItem.is_slabbed && (
                                    <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                      {item.inventoryItem.grade_company}{' '}
                                      {item.inventoryItem.grade_value}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    (Stock: {item.inventoryItem.quantity})
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={item.inventoryItem.quantity}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      quantity: Math.min(
                                        parseInt(e.target.value) || 1,
                                        item.inventoryItem.quantity
                                      ),
                                    })
                                  }
                                  className="w-full px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.sale_price}
                                    onChange={(e) =>
                                      handleUpdateLineItem(item.id, {
                                        sale_price: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full pl-6 pr-2 py-1 border rounded text-right"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {formatCurrency(item.cost_basis * item.quantity)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-medium ${
                                  itemProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {itemProfit >= 0 ? '+' : ''}
                                {formatCurrency(itemProfit)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Fees & Shipping */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Fees
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.platform_fees}
                      onChange={(e) =>
                        setFormData({ ...formData, platform_fees: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Fees
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.payment_fees}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_fees: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Collected
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping_collected}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shipping_collected: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping_cost}
                      onChange={(e) =>
                        setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Amount</span>
                      <span className="font-medium">{formatCurrency(grossAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">+ Shipping Collected</span>
                      <span className="font-medium">{formatCurrency(formData.shipping_collected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">- Total Fees</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(totalFees)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Net Amount</span>
                      <span className="font-bold text-gray-900">{formatCurrency(netAmount)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost Basis</span>
                      <span className="font-medium">{formatCurrency(totalCostBasis)}</span>
                    </div>
                    <div className="border-t pt-2 mt-6 flex justify-between">
                      <span className="font-semibold text-gray-900">Profit</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {profit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        {profit >= 0 ? '+' : ''}
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remove from Inventory Toggle */}
              <label className="flex items-center gap-3 p-3 bg-green-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeFromInventory}
                  onChange={(e) => setRemoveFromInventory(e.target.checked)}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Remove from Inventory</div>
                  <div className="text-sm text-gray-600">
                    Automatically decrease inventory quantities
                  </div>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Record Sale
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inventory Search Modal */}
      <InventorySearchModal
        isOpen={showInventorySearch}
        onClose={() => setShowInventorySearch(false)}
        onSelect={handleAddInventoryItem}
        excludeIds={lineItems.map((i) => i.inventoryItem.id)}
      />
    </>
  );
}

// ============================================
// SALE CARD COMPONENT - UPDATED FOR EBAY IMPORTS
// ============================================

interface SaleCardProps {
  sale: Sale;
  isExpanded: boolean;
  onToggle: () => void;
}

function SaleCard({ sale, isExpanded, onToggle }: SaleCardProps) {
  const totalCards = sale.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const totalCostBasis = sale.items?.reduce((sum, i) => sum + (i.cost_basis || 0), 0) || 0;
  const profit = sale.net_amount - totalCostBasis;

  // Check if this is an eBay import
  const isEbayImport = sale.source === 'ebay_import';

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-gray-400" />
              <span className="font-medium text-gray-900">{sale.platform || 'Direct Sale'}</span>
              {/* Show "Imported" badge for eBay imports */}
              {isEbayImport && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Imported
                </span>
              )}
              {sale.buyer_name && (
                <span className="text-sm text-gray-500">to {sale.buyer_name}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(sale.sale_date)}
              </span>
              <span className="flex items-center gap-1">
                <Package size={14} />
                {totalCards} item{totalCards !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatCurrency(sale.net_amount)}</div>
          <div
            className={`text-sm font-medium flex items-center justify-end gap-1 ${
              profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {profit >= 0 ? '+' : ''}
            {formatCurrency(profit)}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t bg-gray-50">
          {/* Show listing title for eBay imports */}
          {isEbayImport && sale.notes && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="text-xs text-blue-600 font-medium mb-1">Listing Title</div>
              <div className="text-sm text-gray-700">{sale.notes}</div>
            </div>
          )}

          {/* Items Table */}
          {sale.items && sale.items.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">Card</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Sale Price</th>
                  <th className="px-3 py-2 text-right">Cost Basis</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sale.items.map((item) => {
                  const itemProfit = item.sale_price * item.quantity - (item.cost_basis || 0);
                  return (
                    <tr key={item.id} className="hover:bg-white">
                      {/* Card - UPDATED: Handle null checklist_id for eBay imports */}
                      <td className="px-4 py-2">
                        {item.checklist_id && item.checklist ? (
                          <>
                            <div className="font-medium text-gray-900">
                              #{item.checklist.card_number} - {item.checklist.player_name_raw}
                            </div>
                            <div className="text-xs text-gray-500">{item.checklist.set_name}</div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500 italic">
                            <Package size={14} />
                            <span>eBay Listing</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {formatCurrency(item.sale_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {item.cost_basis ? formatCurrency(item.cost_basis) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          item.cost_basis === null
                            ? 'text-gray-400'
                            : itemProfit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {item.cost_basis !== null ? (
                          <>
                            {itemProfit >= 0 ? '+' : ''}
                            {formatCurrency(itemProfit)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-medium">
                  <td colSpan={2} className="px-4 py-2 text-gray-700">
                    Fees: Platform {formatCurrency(sale.platform_fees)} / Payment{' '}
                    {formatCurrency(sale.payment_fees)} / Shipping {formatCurrency(sale.shipping_cost)}
                  </td>
                  <td colSpan={3} className="px-3 py-2 text-right text-gray-900">
                    Net: {formatCurrency(sale.net_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Empty items state */}
          {(!sale.items || sale.items.length === 0) && (
            <div className="px-4 py-8 text-center text-gray-500">
              No items recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN SALES PAGE
// ============================================

export default function Sales() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', filterPlatform, dateRange],
    queryFn: () =>
      api.financial.getSales({
        platform: filterPlatform || undefined,
        start_date: dateRange.start,
        end_date: dateRange.end,
      }),
  });

  const { data: analytics } = useQuery({
    queryKey: ['salesAnalytics', dateRange],
    queryFn: () =>
      api.financial.getSalesAnalytics({
        start_date: dateRange.start,
        end_date: dateRange.end,
      }),
  });

  // Calculate totals
  const totalRevenue = sales?.reduce((sum, s) => sum + (s.net_amount || 0), 0) || 0;
  const totalCards =
    sales?.reduce((sum, s) => sum + (s.items?.reduce((isum, i) => isum + i.quantity, 0) || 0), 0) ||
    0;
  const totalProfit =
    sales?.reduce((sum, s) => {
      const costBasis = s.items?.reduce((isum, i) => isum + (i.cost_basis || 0), 0) || 0;
      return sum + (s.net_amount - costBasis);
    }, 0) || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">Track revenue and profit from card sales</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={18} />
          Record Sale
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900">{sales?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Cards Sold</div>
          <div className="text-2xl font-bold text-gray-900">{totalCards}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Profit</div>
          <div
            className={`text-2xl font-bold flex items-center gap-1 ${
              totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totalProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {totalProfit >= 0 ? '+' : ''}
            {formatCurrency(totalProfit)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Platform</label>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Platforms</option>
            <option value="eBay">eBay</option>
            <option value="COMC">COMC</option>
            <option value="MySlabs">MySlabs</option>
            <option value="Facebook">Facebook</option>
            <option value="In Person">In Person</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value || undefined })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value || undefined })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Sales List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : sales?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <DollarSign className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No sales yet</h3>
          <p className="text-gray-500 mb-4">Record your first sale or import from eBay to start tracking profit</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={18} />
            Record Sale
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              isExpanded={expandedId === sale.id}
              onToggle={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <SaleFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
