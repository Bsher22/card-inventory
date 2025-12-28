import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, User, DollarSign, Phone, Mail, Package } from 'lucide-react';
import { api } from '../api';
import type { Consigner, ConsignerCreate } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function Consigners() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConsigner, setSelectedConsigner] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: consigners, isLoading } = useQuery({
    queryKey: ['consigners', showInactive],
    queryFn: () => api.consignments.getConsigners({ active_only: !showInactive }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consigners</h1>
          <p className="text-gray-500 mt-1">Manage people who get autographs at games and events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Consigner
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Show inactive consigners</span>
        </label>
      </div>

      {/* Consigners Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consigners?.map((consigner) => (
            <ConsignerCard
              key={consigner.id}
              consigner={consigner}
              isExpanded={selectedConsigner === consigner.id}
              onToggle={() => setSelectedConsigner(
                selectedConsigner === consigner.id ? null : consigner.id
              )}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['consigners'] })}
            />
          ))}

          {consigners?.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No consigners found. Add one to start tracking autograph consignments.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateConsignerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['consigners'] });
          }}
        />
      )}
    </div>
  );
}

function ConsignerCard({
  consigner,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  consigner: Consigner;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const { data: stats } = useQuery({
    queryKey: ['consigner-stats', consigner.id],
    queryFn: () => api.consignments.getConsignerStats(consigner.id),
    enabled: isExpanded,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ConsignerCreate & { is_active: boolean }>) =>
      api.consignments.updateConsigner(consigner.id, data),
    onSuccess: onUpdate,
  });

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-100'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              consigner.is_active ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <User className={consigner.is_active ? 'text-blue-600' : 'text-gray-400'} size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{consigner.name}</h3>
              {consigner.notes && (
                <p className="text-sm text-gray-500">{consigner.notes}</p>
              )}
            </div>
          </div>
          {!consigner.is_active && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              Inactive
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {consigner.email && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Mail size={14} className="text-gray-400" />
              {consigner.email}
            </p>
          )}
          {consigner.phone && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              {consigner.phone}
            </p>
          )}
          {consigner.default_fee_per_card > 0 && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <DollarSign size={14} className="text-gray-400" />
              {formatCurrency(consigner.default_fee_per_card)} per card
            </p>
          )}
        </div>

        <button
          onClick={onToggle}
          className="mt-4 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {isExpanded ? 'Hide Details' : 'View Stats & History'}
        </button>
      </div>

      {/* Expanded Stats */}
      {isExpanded && stats && (
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Performance Stats</h4>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Consignments</p>
              <p className="text-lg font-bold text-gray-900">{stats.total_consignments}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Cards Sent</p>
              <p className="text-lg font-bold text-gray-900">{stats.total_cards_sent}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Cards Returned</p>
              <p className="text-lg font-bold text-green-600">{stats.total_cards_returned}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-lg font-bold text-blue-600">{stats.success_rate}%</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="text-sm text-gray-600">Total Fees Paid</span>
            <span className="font-bold text-gray-900">{formatCurrency(stats.total_fees_paid)}</span>
          </div>

          {stats.pending_cards > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <Package size={14} className="inline mr-1" />
                {stats.pending_cards} cards currently out
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => updateMutation.mutate({ is_active: !consigner.is_active })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                consigner.is_active
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {consigner.is_active ? 'Mark Inactive' : 'Mark Active'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateConsignerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState<ConsignerCreate>({
    name: '',
    email: '',
    phone: '',
    default_fee_per_card: 0,
    payment_method: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: ConsignerCreate) => api.consignments.createConsigner(data),
    onSuccess: onCreated,
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Name is required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Consigner</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Fee (per card)</label>
            <input
              type="number"
              step="0.01"
              value={formData.default_fee_per_card || ''}
              onChange={(e) => setFormData({ ...formData, default_fee_per_card: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 15.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <input
              type="text"
              value={formData.payment_method || ''}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              placeholder="Venmo, PayPal, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Location, special arrangements, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
