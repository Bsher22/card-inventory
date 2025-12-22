import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Package, Calendar, DollarSign, Truck, 
  ChevronDown, ChevronRight, Check, X, Clock,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import type { Consignment, Consigner, PendingConsignmentsValue } from '../types';

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  partial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial Return' },
  complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
};

export default function Consignments() {
  const queryClient = useQueryClient();
  const [filterConsigner, setFilterConsigner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: consigners } = useQuery({
    queryKey: ['consigners'],
    queryFn: () => api.getConsigners(),
  });

  const { data: pendingValue } = useQuery({
    queryKey: ['pending-consignments-value'],
    queryFn: () => api.getPendingConsignmentsValue(),
  });

  const { data: consignments, isLoading } = useQuery({
    queryKey: ['consignments', filterConsigner, filterStatus],
    queryFn: () => api.getConsignments({
      consigner_id: filterConsigner || undefined,
      status: filterStatus || undefined,
    }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consignments</h1>
          <p className="text-gray-500 mt-1">Track cards sent out for autographs</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Consignment
        </button>
      </div>

      {/* Summary Cards */}
      {pendingValue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <Package size={18} />
              <span className="font-medium">Cards Out</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{pendingValue.cards_out}</p>
            <p className="text-sm text-amber-600">{pendingValue.items_out} line items</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <DollarSign size={18} />
              <span className="font-medium">Pending Fees</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(pendingValue.pending_fees)}</p>
            <p className="text-sm text-blue-600">When cards return signed</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <Clock size={18} />
              <span className="font-medium">Active Consignments</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {consignments?.filter(c => c.status === 'pending' || c.status === 'partial').length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <select
            value={filterConsigner}
            onChange={(e) => setFilterConsigner(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Consigners</option>
            {consigners?.map((c) => (
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
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['consignments'] });
                queryClient.invalidateQueries({ queryKey: ['pending-consignments-value'] });
              }}
            />
          ))}

          {consignments?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No consignments found. Create one to start tracking.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConsignmentCard({
  consignment,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  consignment: Consignment;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const status = STATUS_STYLES[consignment.status] || STATUS_STYLES.pending;
  const totalCards = consignment.items.reduce((sum, i) => sum + i.quantity, 0);
  const signedCards = consignment.items
    .filter(i => i.status === 'signed')
    .reduce((sum, i) => sum + i.quantity, 0);

  const markPaidMutation = useMutation({
    mutationFn: () => api.markConsignmentFeePaid(consignment.id),
    onSuccess: onUpdate,
  });

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
            <div className="p-2 bg-gray-100 rounded-lg">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">
                  {consignment.consigner?.name || 'Unknown Consigner'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Sent {formatDate(consignment.date_sent)}
                </span>
                {consignment.reference_number && (
                  <span>Ref: {consignment.reference_number}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-gray-900">{totalCards} cards</p>
            {signedCards > 0 && (
              <p className="text-sm text-green-600">{signedCards} signed</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {consignment.status !== 'cancelled' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((signedCards / totalCards) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(signedCards / totalCards) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Fee</p>
              <p className="font-bold text-gray-900">{formatCurrency(consignment.total_fee)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping Out</p>
              <p className="font-bold text-gray-900">{formatCurrency(consignment.shipping_out_cost)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping Return</p>
              <p className="font-bold text-gray-900">{formatCurrency(consignment.shipping_return_cost)}</p>
            </div>
            <div className={`rounded-lg p-3 ${consignment.fee_paid ? 'bg-green-50' : 'bg-amber-50'}`}>
              <p className="text-xs text-gray-500">Fee Status</p>
              <p className={`font-bold ${consignment.fee_paid ? 'text-green-700' : 'text-amber-700'}`}>
                {consignment.fee_paid ? 'Paid' : 'Unpaid'}
              </p>
            </div>
          </div>

          {/* Tracking Info */}
          {(consignment.shipping_out_tracking || consignment.shipping_return_tracking) && (
            <div className="flex gap-4 mb-6 text-sm">
              {consignment.shipping_out_tracking && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} />
                  Out: {consignment.shipping_out_tracking}
                </div>
              )}
              {consignment.shipping_return_tracking && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} />
                  Return: {consignment.shipping_return_tracking}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Cards ({consignment.items.length})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Fee</th>
                  <th className="px-3 py-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consignment.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.checklist?.player?.name || item.checklist?.player_name_raw || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(item.fee_per_card)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ItemStatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {!consignment.fee_paid && consignment.status === 'complete' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markPaidMutation.mutate();
                }}
                disabled={markPaidMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Mark Fee Paid
              </button>
            )}
            {consignment.status === 'pending' && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Process Return
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: typeof Check }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    signed: { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
    refused: { bg: 'bg-red-100', text: 'text-red-700', icon: X },
    lost: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle },
    returned_unsigned: { bg: 'bg-gray-100', text: 'text-gray-600', icon: X },
  };

  const style = styles[status] || styles.pending;
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${style.bg} ${style.text}`}>
      <Icon size={12} />
      {status.replace('_', ' ')}
    </span>
  );
}
