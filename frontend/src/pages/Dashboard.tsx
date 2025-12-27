import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Users,
  BarChart3 
} from 'lucide-react';
import { api } from '../api';
import type { InventoryAnalytics, SalesAnalytics } from '../types';

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Package;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="text-blue-600" size={24} />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-1">
          {trend === 'up' ? (
            <TrendingUp className="text-green-500" size={16} />
          ) : (
            <TrendingDown className="text-red-500" size={16} />
          )}
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {trendValue}
          </span>
          <span className="text-gray-500 text-sm ml-1">vs last month</span>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function Dashboard() {
  const { data: inventoryAnalytics, isLoading: loadingInventory } = useQuery<InventoryAnalytics>({
    queryKey: ['inventory-analytics'],
    queryFn: () => api.inventory.getInventoryAnalytics(),
  });

  const { data: salesAnalytics, isLoading: loadingSales } = useQuery<SalesAnalytics>({
    queryKey: ['sales-analytics'],
    queryFn: () => api.financial.getSalesAnalytics(),
  });

  const isLoading = loadingInventory || loadingSales;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your card inventory and sales</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Cards"
              value={formatNumber(inventoryAnalytics?.total_quantity || 0)}
              subtitle={`${formatNumber(inventoryAnalytics?.total_unique_cards || 0)} unique`}
              icon={Package}
            />
            <StatCard
              title="Cost Basis"
              value={formatCurrency(inventoryAnalytics?.total_cost_basis || 0)}
              icon={DollarSign}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(salesAnalytics?.total_revenue || 0)}
              subtitle={`${salesAnalytics?.total_sales || 0} sales`}
              icon={BarChart3}
            />
            <StatCard
              title="Total Profit"
              value={formatCurrency(inventoryAnalytics?.total_profit || 0)}
              icon={TrendingUp}
              trend={inventoryAnalytics?.total_profit && inventoryAnalytics.total_profit > 0 ? 'up' : 'down'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cards by Brand */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cards by Brand</h3>
              <div className="space-y-3">
                {Object.entries(inventoryAnalytics?.cards_by_brand || {}).map(([brand, count]) => {
                  const total = inventoryAnalytics?.total_quantity || 1;
                  const percentage = (count / total) * 100;
                  return (
                    <div key={brand}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{brand}</span>
                        <span className="text-gray-500">{formatNumber(count)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(inventoryAnalytics?.cards_by_brand || {}).length === 0 && (
                  <p className="text-gray-500 text-sm">No inventory data yet</p>
                )}
              </div>
            </div>

            {/* Sales by Platform */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Platform</h3>
              <div className="space-y-3">
                {Object.entries(salesAnalytics?.sales_by_platform || {}).map(([platform, revenue]) => {
                  const total = salesAnalytics?.total_revenue || 1;
                  const percentage = (revenue / total) * 100;
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{platform}</span>
                        <span className="text-gray-500">{formatCurrency(revenue)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(salesAnalytics?.sales_by_platform || {}).length === 0 && (
                  <p className="text-gray-500 text-sm">No sales data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Players */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Players by Inventory</h3>
              <Users className="text-gray-400" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Player</th>
                    <th className="pb-3 font-medium">Team</th>
                    <th className="pb-3 font-medium text-right">Cards</th>
                    <th className="pb-3 font-medium text-right">Rookies</th>
                    <th className="pb-3 font-medium text-right">Autos</th>
                    <th className="pb-3 font-medium text-right">Numbered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inventoryAnalytics?.top_players.map((player) => (
                    <tr key={player.player_id} className="text-sm">
                      <td className="py-3 font-medium text-gray-900">{player.player_name}</td>
                      <td className="py-3 text-gray-500">{player.team || '-'}</td>
                      <td className="py-3 text-right text-gray-900">{player.total_cards}</td>
                      <td className="py-3 text-right text-gray-500">{player.rookie_count}</td>
                      <td className="py-3 text-right text-gray-500">{player.auto_count}</td>
                      <td className="py-3 text-right text-gray-500">{player.numbered_count}</td>
                    </tr>
                  ))}
                  {(!inventoryAnalytics?.top_players || inventoryAnalytics.top_players.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No player data yet. Upload a checklist and add inventory to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards by Year */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Year</h3>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(inventoryAnalytics?.cards_by_year || {})
                .sort(([a], [b]) => Number(b) - Number(a))
                .slice(0, 10)
                .map(([year, count]) => {
                  const maxCount = Math.max(...Object.values(inventoryAnalytics?.cards_by_year || { 0: 1 }));
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${year}: ${formatNumber(count)} cards`}
                      />
                      <span className="text-xs text-gray-500">{year}</span>
                    </div>
                  );
                })}
              {Object.keys(inventoryAnalytics?.cards_by_year || {}).length === 0 && (
                <p className="text-gray-500 text-sm w-full text-center py-8">No inventory data yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
