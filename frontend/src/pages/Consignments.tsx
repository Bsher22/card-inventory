import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Package, Calendar,
  ChevronDown, ChevronRight, X, Check, AlertCircle, Trash2, Search,
  Grid3X3, Send
} from 'lucide-react';
import { api } from '../api';
import type {
  Consignment,
  ConsignmentCreate,
  ConsignmentItemCreate,
  Consigner,
  Checklist
} from '../types';
import PricingMatrix from './PricingMatrix';

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  partial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial Return' },
  complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
};

// ============================================
// CARD SEARCH MODAL
// ============================================

interface CardSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: Checklist) => void;
  excludeIds?: string[];
}

function CardSearchModal({ isOpen, onClose, onSelect, excludeIds = [] }: CardSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists-search', searchTerm],
    queryFn: () => api.checklists.getChecklists({
      search: searchTerm || undefined,
      limit: 50,
    }),
    enabled: isOpen && searchTerm.length >= 2,
  });

  const filteredCards = checklists?.filter((c) => !excludeIds.includes(c.id)) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Search Cards</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {searchTerm.length < 2 ? (
            <div className="text-center py-12 text-gray-500">
              Type at least 2 characters to search
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No cards found
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
                  <div className="font-medium text-gray-900">
                    #{card.card_number} - {card.player_name_raw}
                  </div>
                  <div className="text-sm text-gray-500">
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
// NEW CONSIGNMENT MODAL
// ============================================

interface ConsignmentItemRow {
  id: string;
  checklist: Checklist | null;
  quantity: number;
  fee_per_card: number;
}

interface NewConsignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consigners: Consigner[];
}

function NewConsignmentModal({ isOpen, onClose, onSuccess, consigners }: NewConsignmentModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showCardSearch, setShowCardSearch] = useState(false);

  const [formData, setFormData] = useState({
    consigner_id: '',
    date_sent: getTodayString(),
    reference_number: '',
    expected_return_date: '',
    shipping_out_cost: 0,
    notes: '',
  });

  const [items, setItems] = useState<ConsignmentItemRow[]>([]);

  // Get selected consigner's default fee
  const selectedConsigner = consigners.find(c => c.id === formData.consigner_id);
  const defaultFee = selectedConsigner?.default_fee || 0;

  const totalFee = items.reduce((sum, item) => sum + (item.quantity * item.fee_per_card), 0);

  const createMutation = useMutation({
    mutationFn: (data: ConsignmentCreate) => api.consignments.createConsignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignments'] });
      onSuccess();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleAddCard = (card: Checklist) => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      checklist: card,
      quantity: 1,
      fee_per_card: defaultFee,
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ConsignmentItemRow>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleClose = () => {
    setFormData({
      consigner_id: '',
      date_sent: getTodayString(),
      reference_number: '',
      expected_return_date: '',
      shipping_out_cost: 0,
      notes: '',
    });
    setItems([]);
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.consigner_id) {
      setError('Please select a consigner');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one card');
      return;
    }

    const validItems = items.filter(item => item.checklist);
    if (validItems.length === 0) {
      setError('Please add at least one valid card');
      return;
    }

    const consignmentData: ConsignmentCreate = {
      consigner_id: formData.consigner_id,
      date_sent: formData.date_sent,
      reference_number: formData.reference_number || null,
      expected_return_date: formData.expected_return_date || null,
      status: 'pending',
      total_fee: totalFee,
      fee_paid: false,
      shipping_out_cost: formData.shipping_out_cost,
      shipping_return_cost: 0,
      notes: formData.notes || null,
    };

    // Note: Items would typically be created via a separate API call or included in the create payload
    // This depends on your backend implementation
    createMutation.mutate(consignmentData);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="text-purple-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">New Consignment</h2>
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

              {/* Consigner Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consigner *
                  </label>
                  <select
                    value={formData.consigner_id}
                    onChange={(e) => setFormData({ ...formData, consigner_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select consigner...</option>
                    {consigners.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Sent *
                  </label>
                  <input
                    type="date"
                    value={formData.date_sent}
                    onChange={(e) => setFormData({ ...formData, date_sent: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference #
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Return
                  </label>
                  <input
                    type="date"
                    value={formData.expected_return_date}
                    onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
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
                      value={formData.shipping_out_cost || ''}
                      onChange={(e) => setFormData({ ...formData, shipping_out_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cards Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Cards *</label>
                  <button
                    type="button"
                    onClick={() => setShowCardSearch(true)}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <Plus size={16} />
                    Add Card
                  </button>
                </div>

                {items.length === 0 ? (
                  <div
                    onClick={() => setShowCardSearch(true)}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">Click to add cards to this consignment</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Fee/Card</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Total</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">
                                #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                className="w-full px-2 py-1 border rounded text-center"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.fee_per_card}
                                  onChange={(e) => handleUpdateItem(item.id, { fee_per_card: parseFloat(e.target.value) || 0 })}
                                  className="w-full pl-6 pr-2 py-1 border rounded text-right"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {formatCurrency(item.quantity * item.fee_per_card)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
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

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{items.length} card(s)</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Fee</div>
                    <div className="text-xl font-bold text-purple-700">{formatCurrency(totalFee)}</div>
                  </div>
                </div>
              </div>
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
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Create Consignment
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
        excludeIds={items.filter(i => i.checklist).map(i => i.checklist!.id)}
      />
    </>
  );
}

// ============================================
// CONSIGNMENT CARD COMPONENT
// ============================================

function ConsignmentCard({
  consignment,
  isExpanded,
  onToggle,
}: {
  consignment: Consignment;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[consignment.status] || STATUS_STYLES.pending;
  const totalCards = consignment.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const signedCards = consignment.items?.filter(i => i.status === 'signed').length || 0;

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-100'
    }`}>
      <div 
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              {isExpanded ? <ChevronDown className="text-purple-600" size={20} /> : <ChevronRight className="text-purple-600" size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">
                  {consignment.consigner?.name || 'Unknown Consigner'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
                {consignment.fee_paid && (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                    Paid
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(consignment.date_sent)}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {totalCards} cards
                </span>
                {consignment.reference_number && (
                  <span>#{consignment.reference_number}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(consignment.total_fee)}
            </p>
            <p className="text-sm text-gray-500">
              {signedCards}/{totalCards} signed
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          {consignment.expected_return_date && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Expected return: {formatDate(consignment.expected_return_date)}
            </div>
          )}

          {consignment.notes && (
            <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
              {consignment.notes}
            </p>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Items ({consignment.items?.length || 0})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Status</th>
                  <th className="px-3 py-2 font-medium text-center">Inscription</th>
                  <th className="px-3 py-2 font-medium text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consignment.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.checklist?.player?.name || item.checklist?.player_name_raw || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.status === 'signed' 
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {item.inscription || '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(item.fee_per_card * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

type TabType = 'consignments' | 'pricing';

export default function Consignments() {
  const [activeTab, setActiveTab] = useState<TabType>('consignments');
  const [filterConsigner, setFilterConsigner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: consigners = [] } = useQuery({
    queryKey: ['consigners'],
    queryFn: () => api.consignments.getConsigners(),
  });

  const { data: consignments, isLoading } = useQuery({
    queryKey: ['consignments', filterConsigner, filterStatus],
    queryFn: () => api.consignments.getConsignments({
      consigner_id: filterConsigner || undefined,
      status: filterStatus || undefined,
    }),
  });

  const pendingConsignments = consignments?.filter(c => c.status === 'pending') || [];
  const totalPendingCards = pendingConsignments.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  const totalPendingFees = pendingConsignments.reduce((sum, c) => sum + (c.total_fee || 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consignments</h1>
          <p className="text-gray-500 mt-1">Track cards sent out for autographs and compare consigner pricing</p>
        </div>
        {activeTab === 'consignments' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Consignment
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('consignments')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'consignments'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Send size={18} />
          Consignments
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pricing'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Grid3X3 size={18} />
          Pricing Matrix
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'pricing' ? (
        <PricingMatrix embedded />
      ) : (
        <>
          {/* Summary Stats */}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Out</p>
          <p className="text-2xl font-bold text-gray-900">{totalPendingCards}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Active Consignments</p>
          <p className="text-2xl font-bold text-gray-900">{pendingConsignments.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Pending Fees</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendingFees)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <select
            value={filterConsigner}
            onChange={(e) => setFilterConsigner(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Consigners</option>
            {consigners.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial Return</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Consignments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {consignments?.map((consignment) => (
            <ConsignmentCard
              key={consignment.id}
              consignment={consignment}
              isExpanded={expandedId === consignment.id}
              onToggle={() => setExpandedId(expandedId === consignment.id ? null : consignment.id)}
            />
          ))}

          {consignments?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Package className="mx-auto text-gray-400 mb-3" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No consignments yet</h3>
              <p className="text-gray-500 mb-4">Create one to start tracking</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                New Consignment
              </button>
            </div>
          )}
        </div>
      )}

          {/* Create Modal */}
          <NewConsignmentModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {}}
            consigners={consigners}
          />
        </>
      )}
    </div>
  );
}