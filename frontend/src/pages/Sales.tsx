import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, Calendar, TrendingUp,
  ChevronDown, ChevronRight, Package
} from 'lucide-react';
import { api } from '../api';
import type { Sale, SalesAnalytics } from '../types';

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

export default function Sales() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data: analytics } = useQuery({
    queryKey: ['sales-analytics', dateRange],
    queryFn: () => api.financial.getSalesAnalytics({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', filterPlatform, dateRange],
    queryFn: () => api.financial.getSales({
      platform: filterPlatform || undefined,
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  const platforms = [...new Set(sales?.map(s => s.platform).filter(Boolean))];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">Track revenue and profit from card sales</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Record Sale
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_sales}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(analytics.total_revenue)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-600">Total Profit</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(analytics.total_profit)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-600">Avg Sale Price</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(analytics.avg_sale_price)}</p>
          </div>
        </div>
      )}

      {/* Sales by Platform & Month Charts */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* By Platform */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Revenue by Platform</h3>
            <div className="space-y-2">
              {Object.entries(analytics.sales_by_platform).map(([platform, revenue]) => {
                const pct = (revenue / analytics.total_revenue) * 100;
                return (
                  <div key={platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{platform}</span>
                      <span className="text-gray-500">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(analytics.sales_by_platform).length === 0 && (
                <p className="text-sm text-gray-500">No sales data</p>
              )}
            </div>
          </div>

          {/* By Month */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Revenue by Month</h3>
            <div className="flex items-end gap-1 h-32">
              {Object.entries(analytics.sales_by_month)
                .slice(-12)
                .map(([month, revenue]) => {
                  const maxRevenue = Math.max(...Object.values(analytics.sales_by_month));
                  const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: revenue > 0 ? '4px' : '0' }}
                        title={`${month}: ${formatCurrency(revenue)}`}
                      />
                      <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                        {month.slice(5)}
                      </span>
                    </div>
                  );
                })}
              {Object.keys(analytics.sales_by_month).length === 0 && (
                <p className="text-sm text-gray-500 w-full text-center">No sales data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative">
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div>
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start date"
          />
        </div>
        <div>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End date"
          />
        </div>
        {(dateRange.start || dateRange.end || filterPlatform) && (
          <button
            onClick={() => {
              setDateRange({});
              setFilterPlatform('');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Sales List */}
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
          {sales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              isExpanded={expandedId === sale.id}
              onToggle={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
            />
          ))}

          {sales?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No sales found. Record one to start tracking revenue.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SaleCard({
  sale,
  isExpanded,
  onToggle,
}: {
  sale: Sale;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalCards = (sale.items?.reduce((sum, i) => sum + i.quantity, 0);
  const totalProfit = (sale.items?.reduce((sum, i) => {
    const revenue = i.sale_price * i.quantity;
    const cost = (i.cost_basis || 0);
    return sum + (revenue - cost);
  }, 0);

  // Net revenue after fees
  const netRevenue = (sale.gross_amount || 0) + sale.shipping_collected - 
    sale.platform_fees - sale.payment_fees - sale.shipping_cost;

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
                  {sale.platform || 'Direct Sale'}
                </h3>
                {sale.order_number && (
                  <span className="text-sm text-gray-500">
                    #{sale.order_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(sale.sale_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {totalCards} cards
                </span>
                {sale.buyer_name && (
                  <span>{sale.buyer_name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(sale.gross_amount || 0)}
            </p>
            <p className={`text-sm ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={14} className="inline mr-1" />
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)} profit
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="font-bold text-gray-900">{formatCurrency(sale.gross_amount || 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping Charged</p>
              <p className="font-bold text-gray-900">{formatCurrency(sale.shipping_collected)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Platform Fees</p>
              <p className="font-bold text-red-600">-{formatCurrency(sale.platform_fees)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Payment Fees</p>
              <p className="font-bold text-red-600">-{formatCurrency(sale.payment_fees)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Net Revenue</p>
              <p className="font-bold text-green-700">{formatCurrency(netRevenue)}</p>
            </div>
          </div>

          {sale.notes && (
            <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
              {sale.notes}
            </p>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Items ({(sale.items?.length ?? 0)})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Condition</th>
                  <th className="px-3 py-2 font-medium text-center">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-right">Cost</th>
                  <th className="px-3 py-2 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items?.map((item) => {
                  const revenue = item.sale_price * item.quantity;
                  const cost = item.cost_basis || 0;
                  const profit = revenue - cost;
                  
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-900">
                        Checklist #{item.checklist_id.slice(0, 8)}...
                      </td>
                      <td className="px-3 py-2 text-center">
                        {false ? (
                          <span className="text-blue-600">{""} {item.grade_value}</span>
                        ) : (
                          <span className="text-gray-600">{"" || 'Raw'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatCurrency(item.sale_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {item.cost_basis ? formatCurrency(item.cost_basis) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
