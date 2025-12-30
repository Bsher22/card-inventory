/**
 * Authentication Page
 * 
 * Manages PSA/DNA and JSA signature authentication submissions
 * with tabs for Cards, Memorabilia, and Collectibles
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Shield,
  CreditCard,
  Trophy,
  Sparkles,
  ChevronRight,
  Pen,
} from 'lucide-react';

import { signatureAuthApi } from '../api/gradingApi';
import type { AuthSubmission, AuthItem, AuthStats, AuthItemType } from '../types';

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

export default function AuthenticationPage() {
  const [activeTab, setActiveTab] = useState<AuthItemType>('card');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
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
              <Pen className="h-8 w-8 text-green-500" />
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
            {pendingByCompany.map((company) => (
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
    </div>
  );
}

// Items List Component
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