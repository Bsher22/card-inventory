import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, ShoppingCart, Calendar, Store, 
  ChevronDown, ChevronRight, Package
} from 'lucide-react';
import { api } from '../api/client';
import type { Purchase } from '../types';

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

export default function Purchases() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', dateRange],
    queryFn: () => api.getPurchases({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  // Calculate totals
  const totalSpent = purchases?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;
  const totalCards = purchases?.reduce((sum, p) => 
    sum + p.items.reduce((isum, i) => isum + i.quantity, 0), 0
  ) || 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 mt-1">Track card acquisitions and cost basis</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Record Purchase
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-2xl font-bold text-gray-900">{purchases?.length || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Acquired</p>
          <p className="text-2xl font-bold text-gray-900">{totalCards}</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(dateRange.start || dateRange.end) && (
          <button
            onClick={() => setDateRange({})}
            className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Purchases List */}
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
          {purchases?.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              isExpanded={expandedId === purchase.id}
              onToggle={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
            />
          ))}

          {purchases?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No purchases found. Record one to start tracking costs.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PurchaseCard({
  purchase,
  isExpanded,
  onToggle,
}: {
  purchase: Purchase;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalCards = purchase.items.reduce((sum, i) => sum + i.quantity, 0);

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
            <div className="p-2 bg-green-100 rounded-lg">
              {isExpanded ? <ChevronDown className="text-green-600" size={20} /> : <ChevronRight className="text-green-600" size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">
                  {purchase.vendor || 'Unknown Vendor'}
                </h3>
                {purchase.invoice_number && (
                  <span className="text-sm text-gray-500">
                    #{purchase.invoice_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(purchase.purchase_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {totalCards} cards
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(purchase.total_cost || 0)}
            </p>
            {purchase.shipping_cost > 0 && (
              <p className="text-sm text-gray-500">
                +{formatCurrency(purchase.shipping_cost)} shipping
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          {purchase.notes && (
            <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
              {purchase.notes}
            </p>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Items ({purchase.items.length})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Condition</th>
                  <th className="px-3 py-2 font-medium text-center">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit Cost</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchase.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">
                      Checklist #{item.checklist_id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.is_slabbed ? (
                        <span className="text-blue-600">{item.grade_company} {item.grade_value}</span>
                      ) : (
                        <span className="text-gray-600">{item.condition}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.unit_cost * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-700">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    {formatCurrency(purchase.total_cost || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
