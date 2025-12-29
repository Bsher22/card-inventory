import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  ChevronDown,
  ChevronRight,
  Package,
  X,
  Search,
  Trash2,
  ShoppingCart,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api';
import type {
  Purchase,
  PurchaseCreate,
  PurchaseItemCreate,
  Checklist,
  ProductLine,
} from '../types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
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
// CARD SEARCH MODAL COMPONENT
// ============================================

interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: Checklist) => void;
  excludeIds?: string[];
}

function CardSearchModal({ isOpen, onClose, onSelect, excludeIds = [] }: CardSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductLine, setSelectedProductLine] = useState<string>('');

  const { data: productLines } = useQuery({
    queryKey: ['productLines'],
    queryFn: () => api.products.getProductLines(),
  });

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists', selectedProductLine, searchTerm],
    queryFn: () =>
      api.checklists.getChecklists({
        product_line_id: selectedProductLine || undefined,
        search: searchTerm || undefined,
        limit: 50,
      }),
    enabled: isOpen,
  });

  const filteredCards = checklists?.filter((c) => !excludeIds.includes(c.id)) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Search Cards</h3>
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
              placeholder="Search by player name or card number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <select
            value={selectedProductLine}
            onChange={(e) => setSelectedProductLine(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Product Lines</option>
            {productLines?.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.year} {pl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || selectedProductLine
                ? 'No cards found matching your search'
                : 'Enter a search term or select a product line'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    onSelect(card);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        #{card.card_number} - {card.player_name_raw}
                      </span>
                      {card.is_autograph && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                          AUTO
                        </span>
                      )}
                      {card.is_rookie_card && (
                        <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          RC
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{card.team}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {card.set_name || card.product_line?.name}
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
// PURCHASE FORM MODAL COMPONENT
// ============================================

interface LineItem {
  id: string;
  checklist: Checklist;
  quantity: number;
  unit_price: number;
  condition: string;
  notes: string;
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PurchaseFormModal({ isOpen, onClose, onSuccess }: PurchaseFormModalProps) {
  const queryClient = useQueryClient();
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [addToInventory, setAddToInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    purchase_date: getTodayString(),
    vendor: '',
    platform: '',
    order_number: '',
    shipping: 0,
    tax: 0,
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal + formData.shipping + formData.tax;

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: { purchase: PurchaseCreate; addToInventory: boolean }) =>
      api.financial.createPurchase(data.purchase, data.addToInventory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
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
      purchase_date: getTodayString(),
      vendor: '',
      platform: '',
      order_number: '',
      shipping: 0,
      tax: 0,
      notes: '',
    });
    setLineItems([]);
    setError(null);
    onClose();
  };

  const handleAddCard = (card: Checklist) => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        checklist: card,
        quantity: 1,
        unit_price: 0,
        condition: 'NM',
        notes: '',
      },
    ]);
  };

  const handleUpdateLineItem = (id: string, updates: Partial<LineItem>) => {
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
      setError('Please add at least one card to the purchase');
      return;
    }

    const purchaseData: PurchaseCreate = {
      purchase_date: formData.purchase_date,
      vendor: formData.vendor || null,
      platform: formData.platform || null,
      order_number: formData.order_number || null,
      shipping: formData.shipping,
      tax: formData.tax,
      notes: formData.notes || null,
      items: lineItems.map((item) => ({
        checklist_id: item.checklist.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        condition: item.condition,
        notes: item.notes || null,
      })),
    };

    createMutation.mutate({ purchase: purchaseData, addToInventory });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="text-blue-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Record Purchase</h2>
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

              {/* Purchase Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g., Card Shop, eBay Seller"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="eBay">eBay</option>
                    <option value="COMC">COMC</option>
                    <option value="MySlabs">MySlabs</option>
                    <option value="In Person">In Person</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Other">Other</option>
                  </select>
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Cards *</label>
                  <button
                    type="button"
                    onClick={() => setShowCardSearch(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={16} />
                    Add Card
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div
                    onClick={() => setShowCardSearch(true)}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">Click to add cards to this purchase</p>
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
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">
                            Condition
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                            Total
                          </th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">
                                #{item.checklist.card_number} - {item.checklist.player_name_raw}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.checklist.set_name || item.checklist.product_line?.name}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLineItem(item.id, {
                                    quantity: parseInt(e.target.value) || 1,
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
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    handleUpdateLineItem(item.id, {
                                      unit_price: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full pl-6 pr-2 py-1 border rounded text-right"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.condition}
                                onChange={(e) =>
                                  handleUpdateLineItem(item.id, { condition: e.target.value })
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="NM">NM</option>
                                <option value="EX">EX</option>
                                <option value="VG">VG</option>
                                <option value="G">G</option>
                                <option value="P">P</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {formatCurrency(item.quantity * item.unit_price)}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Costs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping}
                      onChange={(e) =>
                        setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.tax}
                      onChange={(e) =>
                        setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal ({lineItems.length} cards)</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatCurrency(formData.shipping)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(formData.tax)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Add to Inventory Toggle */}
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToInventory}
                  onChange={(e) => setAddToInventory(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Add to Inventory</div>
                  <div className="text-sm text-gray-600">
                    Automatically add purchased cards to your inventory
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
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Record Purchase
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card Search Modal */}
      <CardSearchModal
        isOpen={showCardSearch}
        onClose={() => setShowCardSearch(false)}
        onSelect={handleAddCard}
        excludeIds={lineItems.map((i) => i.checklist.id)}
      />
    </>
  );
}

// ============================================
// PURCHASE CARD COMPONENT
// ============================================

interface PurchaseCardProps {
  purchase: Purchase;
  isExpanded: boolean;
  onToggle: () => void;
}

function PurchaseCard({ purchase, isExpanded, onToggle }: PurchaseCardProps) {
  const totalCards = purchase.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

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
              <span className="font-medium text-gray-900">
                {purchase.vendor || purchase.platform || 'Purchase'}
              </span>
              {purchase.platform && purchase.vendor && (
                <span className="text-sm text-gray-500">via {purchase.platform}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(purchase.purchase_date)}
              </span>
              <span className="flex items-center gap-1">
                <Package size={14} />
                {totalCards} card{totalCards !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatCurrency(purchase.total)}</div>
          {purchase.order_number && (
            <div className="text-xs text-gray-500">#{purchase.order_number}</div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && purchase.items && purchase.items.length > 0 && (
        <div className="border-t bg-gray-50">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Card</th>
                <th className="px-3 py-2 text-center">Condition</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map((item) => (
                <tr key={item.id} className="hover:bg-white">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">
                      #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                    </div>
                    <div className="text-xs text-gray-500">{item.checklist?.set_name}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      {item.condition || 'NM'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-medium">
                <td colSpan={4} className="px-4 py-2 text-right text-gray-700">
                  Subtotal / Shipping / Tax
                </td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatCurrency(purchase.subtotal)} / {formatCurrency(purchase.shipping)} /{' '}
                  {formatCurrency(purchase.tax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PURCHASES PAGE
// ============================================

export default function Purchases() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', dateRange],
    queryFn: () =>
      api.financial.getPurchases({
        start_date: dateRange.start,
        end_date: dateRange.end,
      }),
  });

  // Calculate totals
  const totalSpent = purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
  const totalCards =
    purchases?.reduce((sum, p) => sum + (p.items?.reduce((isum, i) => isum + i.quantity, 0) || 0), 0) ||
    0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 mt-1">Track card acquisitions and cost basis</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Record Purchase
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Purchases</div>
          <div className="text-2xl font-bold text-gray-900">{purchases?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Cards Acquired</div>
          <div className="text-2xl font-bold text-gray-900">{totalCards}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Spent</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalSpent)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
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

      {/* Purchase List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : purchases?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <ShoppingCart className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No purchases yet</h3>
          <p className="text-gray-500 mb-4">Record your first purchase to start tracking costs</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Record Purchase
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases?.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              isExpanded={expandedId === purchase.id}
              onToggle={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <PurchaseFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
