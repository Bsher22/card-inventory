import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Package, Calendar, 
  ChevronDown, ChevronRight, Award, X, Check, AlertCircle, Trash2, Search
} from 'lucide-react';
import { api } from '../api';
import { cardGradingApi } from '../api/gradingApi';
import { submittersApi } from '../api/submittersApi';
import type { 
  CardGradingSubmission, 
  CardGradingSubmissionCreate,
  CardGradingItem,
  CardGradingItemCreate,
  GradingCompanyWithLevels,
  GradingServiceLevel,
  PendingByCompany,
  Inventory,
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

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  shipped: { bg: 'bg-blue-100', text: 'text-blue-700' },
  received: { bg: 'bg-purple-100', text: 'text-purple-700' },
  grading: { bg: 'bg-orange-100', text: 'text-orange-700' },
  shipped_back: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  returned: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

// ============================================
// INVENTORY SEARCH MODAL
// ============================================

interface InventorySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: Inventory) => void;
  excludeIds?: string[];
}

function InventorySearchModal({ isOpen, onClose, onSelect, excludeIds = [] }: InventorySearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-search', searchTerm],
    queryFn: () => api.inventory.getInventory({
      search: searchTerm || undefined,
      limit: 50,
    }),
    enabled: isOpen,
  });

  // Filter to only raw cards (not already slabbed) and exclude already selected
  const filteredItems = inventory?.filter((i) => 
    !i.is_slabbed && !excludeIds.includes(i.id)
  ) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Select Cards from Inventory</h3>
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
          <p className="text-xs text-gray-500 mt-2">Only showing raw (unslabbed) cards</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No raw cards found in inventory
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
                  className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        #{item.checklist?.card_number} - {item.checklist?.player_name_raw}
                      </span>
                      {item.is_signed && (
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                          SIGNED
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
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
// NEW GRADING SUBMISSION MODAL
// ============================================

interface GradingItemRow {
  id: string;
  inventory: Inventory | null;
  declared_value: number;
  was_signed: boolean;
}

interface NewGradingSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: GradingCompanyWithLevels[];
}

function NewGradingSubmissionModal({ isOpen, onClose, onSuccess, companies }: NewGradingSubmissionModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showInventorySearch, setShowInventorySearch] = useState(false);

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
  const [items, setItems] = useState<GradingItemRow[]>([]);

  // Fetch submitters for grading
  const { data: submitters } = useQuery({
    queryKey: ['submitters-grading'],
    queryFn: () => submittersApi.getSubmitters({ grading: true }),
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

  // Get selected company's service levels
  const selectedCompany = companies.find(c => c.id === formData.company_id);
  const serviceLevels = selectedCompany?.service_levels || [];

  // Get selected service level fee
  const selectedLevel = serviceLevels.find(l => l.id === formData.service_level_id);
  const feePerCard = selectedLevel?.base_fee || 0;
  const totalGradingFee = items.length * feePerCard;

  const createMutation = useMutation({
    mutationFn: (data: CardGradingSubmissionCreate) => cardGradingApi.createSubmission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['grading-stats'] });
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
      inventory: inventoryItem,
      declared_value: inventoryItem.total_cost || 0,
      was_signed: inventoryItem.is_signed || false,
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<GradingItemRow>) => {
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
      setError('Please select a grading company');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one card');
      return;
    }

    const validItems = items.filter(item => item.inventory);
    if (validItems.length === 0) {
      setError('Please add at least one valid card');
      return;
    }

    const submissionData: CardGradingSubmissionCreate = {
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
      items: validItems.map(item => ({
        inventory_id: item.inventory!.id,
        checklist_id: item.inventory!.checklist_id,
        declared_value: item.declared_value,
        was_signed: item.was_signed,
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Award className="text-blue-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">New Grading Submission</h2>
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
                      service_level_id: '' // Reset service level when company changes
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select company...</option>
                    {companies.filter(c => c.service_type !== 'authentication').map((c) => (
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.company_id}
                  >
                    <option value="">Select level...</option>
                    {serviceLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} - {formatCurrency(l.base_fee)} ({l.estimated_days || '?'} days)
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Direct submission...</option>
                  {submitters?.map((s: SubmitterSummary) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Third-party service used to submit cards (e.g., PWCC, MySlabs)
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    onClick={() => setShowInventorySearch(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={16} />
                    Add from Inventory
                  </button>
                </div>

                {items.length === 0 ? (
                  <div
                    onClick={() => setShowInventorySearch(true)}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">Click to add cards from your inventory</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Declared Value</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Signed</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">
                                #{item.inventory?.checklist?.card_number} - {item.inventory?.checklist?.player_name_raw}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.inventory?.checklist?.set_name}
                              </div>
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
                                  className="w-full pl-6 pr-2 py-1 border rounded text-right"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.was_signed}
                                onChange={(e) => handleUpdateItem(item.id, { was_signed: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600"
                              />
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Cards</div>
                    <div className="font-bold text-gray-900">{items.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Grading Fee</div>
                    <div className="font-bold text-gray-900">{formatCurrency(totalGradingFee)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Cost</div>
                    <div className="font-bold text-blue-700">
                      {formatCurrency(totalGradingFee + formData.shipping_to_cost + formData.insurance_cost)}
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
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

      {/* Inventory Search Modal */}
      <InventorySearchModal
        isOpen={showInventorySearch}
        onClose={() => setShowInventorySearch(false)}
        onSelect={handleAddCard}
        excludeIds={items.filter(i => i.inventory).map(i => i.inventory!.id)}
      />
    </>
  );
}

// ============================================
// SUBMISSION CARD COMPONENT
// ============================================

function SubmissionCard({
  submission,
  isExpanded,
  onToggle,
}: {
  submission: CardGradingSubmission;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[submission.status] || STATUS_STYLES.pending;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header Row */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <button className="p-1">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{submission.company_name}</span>
              {submission.submission_number && (
                <span className="text-sm text-gray-500">#{submission.submission_number}</span>
              )}
              {submission.submitter_name && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  via {submission.submitter_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(submission.date_submitted)}
              </span>
              <span>{submission.item_count} cards</span>
              {submission.service_level_name && (
                <span>{submission.service_level_name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {submission.status.replace('_', ' ')}
          </span>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Fees</div>
            <div className="font-semibold text-gray-900">{formatCurrency(Number(submission.total_fees) || 0)}</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-4 py-4 bg-gray-50">
          {/* Item List */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Card #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Declared</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cert #</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submission.items?.map((item: CardGradingItem) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {item.card_number || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {item.player_name || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {formatCurrency(Number(item.declared_value) || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.grade_value !== null ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          Number(item.grade_value) >= 9 ? 'bg-green-100 text-green-700' :
                          Number(item.grade_value) >= 7 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          <Award size={12} />
                          {item.grade_value}
                          {item.auto_grade && ` / ${item.auto_grade}`}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {item.cert_number || '-'}
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

export default function GradingSubmissions() {
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['grading-companies'],
    queryFn: () => cardGradingApi.getCompanies(),
  });

  const { data: stats } = useQuery({
    queryKey: ['grading-stats'],
    queryFn: () => cardGradingApi.getStats(),
  });

  const { data: pendingByCompany } = useQuery({
    queryKey: ['pending-by-company'],
    queryFn: () => cardGradingApi.getPendingByCompany(),
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['grading-submissions', filterCompany, filterStatus],
    queryFn: () => cardGradingApi.getSubmissions({
      company_id: filterCompany || undefined,
      status: filterStatus || undefined,
    }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Grading</h1>
          <p className="text-gray-500 mt-1">Track PSA, BGS, SGC and other grading submissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Submission
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Out</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.cards_out_for_grading || 0}</p>
          <p className="text-xs text-gray-500">{stats?.pending_submissions || 0} submissions</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Pending Fees</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(Number(stats?.pending_fees) || 0)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Graded</p>
          <p className="text-2xl font-bold text-green-600">{stats?.total_graded || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Gem Rate</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.gem_rate?.toFixed(1) || '-'}%</p>
        </div>
      </div>

      {/* Pending by Company */}
      {pendingByCompany && pendingByCompany.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Pending by Company</h3>
          <div className="flex flex-wrap gap-3">
            {pendingByCompany.map((pending: PendingByCompany) => (
              <div key={pending.company_id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{pending.company_name}</span>
                <span className="text-sm text-gray-500">{pending.pending_count} cards</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {companies.map((c: GradingCompanyWithLevels) => (
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
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
            <option value="grading">Grading</option>
            <option value="shipped_back">Shipped Back</option>
            <option value="returned">Returned</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i: number) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {submissions?.map((submission: CardGradingSubmission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isExpanded={expandedId === submission.id}
              onToggle={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
            />
          ))}

          {submissions?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Award className="mx-auto text-gray-400 mb-3" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
              <p className="text-gray-500 mb-4">Create one to start tracking your grading submissions</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                New Submission
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <NewGradingSubmissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
        companies={companies}
      />
    </div>
  );
}