import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, Package, Calendar, DollarSign, 
  ChevronDown, ChevronRight
} from 'lucide-react';
import { api } from '../api';
import type { Consignment } from '../types';

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
  const [filterConsigner, setFilterConsigner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: consigners } = useQuery({
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

  // Calculate stats from consignments data
  const pendingConsignments = consignments?.filter(c => c.status === 'pending') || [];
  const totalPendingCards = pendingConsignments.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  const totalPendingFees = pendingConsignments.reduce((sum, c) => sum + (c.total_fee || 0), 0);

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
                {/* FIXED: Show fee_paid status */}
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
                {/* FIXED: Show reference number if available */}
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
          {/* FIXED: Show expected return date if available */}
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
                    {/* FIXED: Show inscription if available */}
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
