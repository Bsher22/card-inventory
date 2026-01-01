/**
 * Authentication Page
 * 
 * Manages PSA/DNA and JSA signature authentication submissions
 * with tabs for Cards, Memorabilia, and Collectibles
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Package, 
  CheckCircle, 
  Clock, 
  Shield,
  CreditCard,
  Trophy,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Trash2,
  Search,
} from 'lucide-react';

import { signatureAuthApi } from '../api/gradingApi';
import { submittersApi } from '../api/submittersApi';
import { api } from '../api';
import type { 
  AuthSubmission, 
  AuthSubmissionCreate,
  AuthItemCreate,
  AuthItem, 
  AuthStats, 
  AuthItemType,
  GradingCompanyWithLevels,
  PendingByCompany,
  Inventory,
  StandaloneItem,
  SubmitterSummary,
} from '../types';

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

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  received: 'bg-purple-100 text-purple-800',
  processing: 'bg-orange-100 text-orange-800',
  shipped_back: 'bg-indigo-100 text-indigo-800',
  returned: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  authentic: 'bg-green-100 text-green-800',
  not_authentic: 'bg-red-100 text-red-800',
  inconclusive: 'bg-yellow-100 text-yellow-800',
};

// Item type icons
const itemTypeIcons: Record<AuthItemType, React.ReactNode> = {
  card: <CreditCard className="h-4 w-4" />,
  memorabilia: <Trophy className="h-4 w-4" />,
  collectible: <Sparkles className="h-4 w-4" />,
};

// ============================================
// ITEM SEARCH MODAL
// ============================================

interface ItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (item: Inventory) => void;
  onSelectStandalone: (item: StandaloneItem) => void;
  excludeCardIds?: string[];
  excludeStandaloneIds?: string[];
}

function ItemSearchModal({ 
  isOpen, 
  onClose, 
  onSelectCard, 
  onSelectStandalone,
  excludeCardIds = [],
  excludeStandaloneIds = [],
}: ItemSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'cards' | 'items'>('cards');

  const { data: inventory, isLoading: loadingCards } = useQuery({
    queryKey: ['inventory-search-auth', searchTerm],
    queryFn: () => api.inventory.getInventory({
      search: searchTerm || undefined,
      is_signed: true, // Only signed cards need authentication
      limit: 50,
    }),
    enabled: isOpen && searchType === 'cards',
  });

  const { data: standaloneItems, isLoading: loadingItems } = useQuery({
    queryKey: ['standalone-items-search-auth', searchTerm],
    queryFn: () => api.standaloneItems.getStandaloneItems({
      search: searchTerm || undefined,
      limit: 50,
    }),
    enabled: isOpen && searchType === 'items',
  });

  const filteredCards = inventory?.filter((i) => !excludeCardIds.includes(i.id)) || [];
  const filteredItems = standaloneItems?.filter((i: StandaloneItem) => !excludeStandaloneIds.includes(i.id)) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Items for Authentication</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b space-y-3">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSearchType('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                searchType === 'cards' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <CreditCard size={16} />
              Cards
            </button>
            <button
              onClick={() => setSearchType('items')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                searchType === 'items' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Trophy size={16} />
              Memorabilia / Collectibles
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={searchType === 'cards' ? 'Search signed cards...' : 'Search items...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {searchType === 'cards' ? (
            loadingCards ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No signed cards found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCards.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectCard(item);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">
                          #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                        </span>
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                          SIGNED
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.checklist?.set_name || item.checklist?.product_line?.name}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            loadingItems ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No items found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item: StandaloneItem) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectStandalone(item);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{item.title}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        item.category?.slug === 'memorabilia' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.category?.name || item.item_type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.sport} • {item.player_name || 'Unknown signer'}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEW AUTH SUBMISSION MODAL
// ============================================

interface AuthItemRow {
  id: string;
  item_type: AuthItemType;
  inventory?: Inventory;
  standalone_item?: StandaloneItem;
  description: string;
  signer_name: string;
  declared_value: number;
}

interface NewAuthSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: GradingCompanyWithLevels[];
}

function NewAuthSubmissionModal({ isOpen, onClose, onSuccess, companies }: NewAuthSubmissionModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showItemSearch, setShowItemSearch] = useState(false);

  const [formData, setFormData] = useState({
    company_id: '',
    service_level_id: '',
    date_submitted: getTodayString(),
    submission_number: '',
    reference_number: '',
    shipping_to_cost: 0,
    shipping_to_tracking: '',
    insurance_cost: 0,
    notes: '',
  });

  const [submitterId, setSubmitterId] = useState<string>('');
  const [items, setItems] = useState<AuthItemRow[]>([]);

  // Fetch submitters for authentication
  const { data: submitters } = useQuery({
    queryKey: ['submitters-auth'],
    queryFn: () => submittersApi.getSubmitters({ authentication: true }),
    enabled: isOpen,
  });

  // Set default submitter when data loads
  useEffect(() => {
    if (submitters && submitters.length > 0 && !submitterId) {
      const defaultSubmitter = submitters.find((s: SubmitterSummary) => s.is_default);
      if (defaultSubmitter) {
        setSubmitterId(defaultSubmitter.id);
      }
    }
  }, [submitters, submitterId]);

  // Filter to only auth companies
  const authCompanies = companies.filter(c => c.service_type === 'authentication' || c.service_type === 'both');
  const selectedCompany = authCompanies.find(c => c.id === formData.company_id);
  const serviceLevels = selectedCompany?.service_levels || [];

  const createMutation = useMutation({
    mutationFn: (data: AuthSubmissionCreate) => signatureAuthApi.createSubmission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-stats'] });
      queryClient.invalidateQueries({ queryKey: ['auth-items'] });
      onSuccess();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleAddCard = (inventoryItem: Inventory) => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      item_type: 'card',
      inventory: inventoryItem,
      description: `${inventoryItem.checklist?.card_number} - ${inventoryItem.checklist?.player_name_raw}`,
      signer_name: inventoryItem.checklist?.player_name_raw || '',
      declared_value: inventoryItem.total_cost || 0,
    }]);
  };

  const handleAddStandaloneItem = (item: StandaloneItem) => {
    const itemType = item.category?.slug === 'memorabilia' ? 'memorabilia' : 'collectible';
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      item_type: itemType,
      standalone_item: item,
      description: item.title,
      signer_name: item.player_name || '',
      declared_value: 0, // No purchase_price on StandaloneItem, user can edit
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<AuthItemRow>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleClose = () => {
    setFormData({
      company_id: '',
      service_level_id: '',
      date_submitted: getTodayString(),
      submission_number: '',
      reference_number: '',
      shipping_to_cost: 0,
      shipping_to_tracking: '',
      insurance_cost: 0,
      notes: '',
    });
    setSubmitterId('');
    setItems([]);
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.company_id) {
      setError('Please select an authentication company');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    const submissionData: AuthSubmissionCreate = {
      company_id: formData.company_id,
      service_level_id: formData.service_level_id || undefined,
      submitter_id: submitterId || undefined,
      date_submitted: formData.date_submitted,
      submission_number: formData.submission_number || undefined,
      reference_number: formData.reference_number || undefined,
      shipping_to_cost: formData.shipping_to_cost,
      shipping_to_tracking: formData.shipping_to_tracking || undefined,
      insurance_cost: formData.insurance_cost,
      notes: formData.notes || undefined,
      items: items.map(item => ({
        item_type: item.item_type,
        inventory_id: item.inventory?.id,
        standalone_item_id: item.standalone_item?.id,
        description: item.description,
        signer_name: item.signer_name,
        declared_value: item.declared_value,
      })),
    };

    createMutation.mutate(submissionData);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="text-green-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">New Authentication Submission</h2>
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

              {/* Company & Service Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      company_id: e.target.value,
                      service_level_id: ''
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select company...</option>
                    {authCompanies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Level
                  </label>
                  <select
                    value={formData.service_level_id}
                    onChange={(e) => setFormData({ ...formData, service_level_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    disabled={!formData.company_id}
                  >
                    <option value="">Select level...</option>
                    {serviceLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} - {formatCurrency(l.base_fee)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submitted Through */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submitted Through
                </label>
                <select
                  value={submitterId}
                  onChange={(e) => setSubmitterId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Direct submission...</option>
                  {submitters?.map((s: SubmitterSummary) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Third-party service used to submit items (e.g., PWCC, MySlabs)
                </p>
              </div>

              {/* Submission Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Submitted *
                  </label>
                  <input
                    type="date"
                    value={formData.date_submitted}
                    onChange={(e) => setFormData({ ...formData, date_submitted: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submission #
                  </label>
                  <input
                    type="text"
                    value={formData.submission_number}
                    onChange={(e) => setFormData({ ...formData, submission_number: e.target.value })}
                    placeholder="From company"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference #
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Your reference"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Shipping & Insurance */}
              <div className="grid grid-cols-3 gap-4">
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
                      value={formData.shipping_to_cost || ''}
                      onChange={(e) => setFormData({ ...formData, shipping_to_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking #
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_to_tracking}
                    onChange={(e) => setFormData({ ...formData, shipping_to_tracking: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.insurance_cost || ''}
                      onChange={(e) => setFormData({ ...formData, insurance_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    type="button"
                    onClick={() => setShowItemSearch(true)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                {items.length === 0 ? (
                  <div
                    onClick={() => setShowItemSearch(true)}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <Shield className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">Click to add items for authentication</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Signer</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Value</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                item.item_type === 'card' ? 'bg-blue-100 text-blue-700' :
                                item.item_type === 'memorabilia' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {itemTypeIcons[item.item_type]}
                                {item.item_type}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900 text-sm">
                                {item.description}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.signer_name}
                                onChange={(e) => handleUpdateItem(item.id, { signer_name: e.target.value })}
                                placeholder="Signer name"
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.declared_value}
                                  onChange={(e) => handleUpdateItem(item.id, { declared_value: parseFloat(e.target.value) || 0 })}
                                  className="w-full pl-6 pr-2 py-1 border rounded text-right text-sm"
                                />
                              </div>
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm">
                    <span><strong>{items.filter(i => i.item_type === 'card').length}</strong> cards</span>
                    <span><strong>{items.filter(i => i.item_type === 'memorabilia').length}</strong> memorabilia</span>
                    <span><strong>{items.filter(i => i.item_type === 'collectible').length}</strong> collectibles</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Declared Value</div>
                    <div className="text-xl font-bold text-green-700">
                      {formatCurrency(items.reduce((sum, i) => sum + i.declared_value, 0))}
                    </div>
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
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Create Submission
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Item Search Modal */}
      <ItemSearchModal
        isOpen={showItemSearch}
        onClose={() => setShowItemSearch(false)}
        onSelectCard={handleAddCard}
        onSelectStandalone={handleAddStandaloneItem}
        excludeCardIds={items.filter(i => i.inventory).map(i => i.inventory!.id)}
        excludeStandaloneIds={items.filter(i => i.standalone_item).map(i => i.standalone_item!.id)}
      />
    </>
  );
}

// ============================================
// ITEMS LIST COMPONENT
// ============================================

function ItemsList({ 
  items, 
  type 
}: { 
  items: AuthItem[];
  type: AuthItemType;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {type} items found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${statusColors[item.status]}`}>
                {item.status === 'authentic' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : item.status === 'pending' ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
              </div>
              <div>
                {type === 'card' ? (
                  <>
                    <p className="font-medium text-gray-900">{item.player_name || 'Unknown Player'}</p>
                    <p className="text-sm text-gray-500">
                      {item.card_number} • {item.product_line_name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{item.item_name || item.description || 'Unknown Item'}</p>
                    <p className="text-sm text-gray-500">
                      {item.item_category || type}
                    </p>
                  </>
                )}
                {item.signer_name && (
                  <p className="text-xs text-blue-600">Signed by: {item.signer_name}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs ${statusColors[item.status]}`}>
                {item.status.replace('_', ' ')}
              </span>
              {item.cert_number && (
                <p className="text-xs text-gray-500 mt-1">Cert: {item.cert_number}</p>
              )}
              {item.sticker_number && (
                <p className="text-xs text-gray-500 mt-1">Sticker: {item.sticker_number}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(item.declared_value)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AuthenticationPage() {
  const [activeTab, setActiveTab] = useState<AuthItemType>('card');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['auth-stats'],
    queryFn: () => signatureAuthApi.getStats(),
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['auth-companies'],
    queryFn: () => signatureAuthApi.getCompanies(),
  });

  // Fetch pending by company
  const { data: pendingByCompany = [] } = useQuery({
    queryKey: ['auth-pending-by-company'],
    queryFn: () => signatureAuthApi.getPendingByCompany(),
  });

  // Fetch items by type for active tab
  const { data: cardItems = [] } = useQuery({
    queryKey: ['auth-items', 'cards'],
    queryFn: () => signatureAuthApi.getCardItems(),
  });

  const { data: memorabiliaItems = [] } = useQuery({
    queryKey: ['auth-items', 'memorabilia'],
    queryFn: () => signatureAuthApi.getMemorabiliaItems(),
  });

  const { data: collectibleItems = [] } = useQuery({
    queryKey: ['auth-items', 'collectibles'],
    queryFn: () => signatureAuthApi.getCollectibleItems(),
  });

  // Get items for current tab
  const itemsMap: Record<AuthItemType, AuthItem[]> = {
    card: cardItems,
    memorabilia: memorabiliaItems,
    collectible: collectibleItems,
  };
  const currentItems = itemsMap[activeTab];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Authentication</h1>
          <p className="text-gray-500">PSA/DNA & JSA signature verification</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Submission
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out for Auth</p>
                <p className="text-2xl font-bold text-gray-900">{stats.items_out_for_auth}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Fees</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending_fees)}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Authenticated</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_authenticated}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pass_rate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Pending by Company */}
      {pendingByCompany.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending by Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingByCompany.map((company: PendingByCompany) => (
              <div 
                key={company.company_id} 
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{company.company_name}</p>
                    <p className="text-sm text-gray-500">
                      {company.pending_count} item{company.pending_count !== 1 ? 's' : ''} pending
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(company.pending_value)}</p>
                  {company.oldest_submission_date && (
                    <p className="text-xs text-gray-400">
                      Since {formatDate(company.oldest_submission_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Type Tabs */}
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="border-b border-gray-100 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Items by Category</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('card')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'card' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Cards ({cardItems.length})
            </button>
            <button 
              onClick={() => setActiveTab('memorabilia')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'memorabilia' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Memorabilia ({memorabiliaItems.length})
            </button>
            <button 
              onClick={() => setActiveTab('collectible')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'collectible' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Collectibles ({collectibleItems.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          <ItemsList items={currentItems} type={activeTab} />
        </div>
      </div>

      {/* By Item Type Stats */}
      {stats && stats.by_item_type && (
        <div className="grid grid-cols-3 gap-4">
          {(['card', 'memorabilia', 'collectible'] as AuthItemType[]).map((type) => (
            <div key={type} className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  type === 'card' ? 'bg-blue-100' :
                  type === 'memorabilia' ? 'bg-yellow-100' : 'bg-purple-100'
                }`}>
                  {itemTypeIcons[type]}
                </div>
                <div>
                  <p className="text-sm text-gray-500 capitalize">{type}s</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.by_item_type[type] || 0}
                  </p>
                  <p className="text-xs text-gray-400">authenticated</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <NewAuthSubmissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
        companies={companies}
      />
    </div>
  );
}