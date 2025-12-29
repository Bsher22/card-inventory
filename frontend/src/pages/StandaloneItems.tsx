import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  X,
  Package,
  Award,
  Shield,
  Edit2,
  Trash2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api';
import type {
  StandaloneItem,
  StandaloneItemCreate,
  StandaloneItemUpdate,
  ItemCategory,
} from '../types';
import {
  SPORTS,
  AUTHENTICATORS,
  MEMORABILIA_TYPES,
  COLLECTIBLE_TYPES,
  CONDITIONS,
} from '../types/standaloneItems';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// STANDALONE ITEM FORM MODAL
// ============================================

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: StandaloneItem | null;
  categories: ItemCategory[];
}

function ItemFormModal({ isOpen, onClose, item, categories }: ItemFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!item;
  
  const memorabiliaCategory = categories.find(c => c.slug === 'memorabilia');
  const collectiblesCategory = categories.find(c => c.slug === 'collectibles');
  
  const [formData, setFormData] = useState<StandaloneItemCreate>({
    category_id: item?.category_id || memorabiliaCategory?.id || '',
    title: item?.title || '',
    description: item?.description || '',
    sport: item?.sport || 'Baseball',
    brand: item?.brand || '',
    year: item?.year || new Date().getFullYear(),
    player_name: item?.player_name || '',
    team: item?.team || '',
    is_authenticated: item?.is_authenticated || false,
    authenticator: item?.authenticator || '',
    cert_number: item?.cert_number || '',
    item_type: item?.item_type || '',
    size: item?.size || '',
    color: item?.color || '',
    material: item?.material || '',
    condition: item?.condition || 'Excellent',
    condition_notes: item?.condition_notes || '',
    notes: item?.notes || '',
  });

  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: StandaloneItemCreate) => api.standaloneItems.createStandaloneItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standaloneItems'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: StandaloneItemUpdate) => api.standaloneItems.updateStandaloneItem(item!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standaloneItems'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const itemTypes = selectedCategory?.slug === 'memorabilia' ? MEMORABILIA_TYPES : COLLECTIBLE_TYPES;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="text-purple-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Item' : 'Add New Item'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Category Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value, item_type: '' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select category...</option>
                  {memorabiliaCategory && (
                    <option value={memorabiliaCategory.id}>Memorabilia</option>
                  )}
                  {collectiblesCategory && (
                    <option value={collectiblesCategory.id}>Collectibles</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sport *</label>
                <select
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Derek Jeter Signed Official MLB Baseball"
                required
              />
            </div>

            {/* Item Type & Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                <select
                  value={formData.item_type || ''}
                  onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select type...</option>
                  {itemTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min={1900}
                  max={2100}
                />
              </div>
            </div>

            {/* Player & Team */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player/Person Name</label>
                <input
                  type="text"
                  value={formData.player_name || ''}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Derek Jeter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <input
                  type="text"
                  value={formData.team || ''}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., New York Yankees"
                />
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand/Manufacturer</label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Rawlings, Fanatics, Action Racing"
              />
            </div>

            {/* Authentication Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-green-600" />
                <span className="font-medium text-gray-900">Authentication</span>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_authenticated}
                    onChange={(e) => setFormData({ ...formData, is_authenticated: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">This item is authenticated</span>
                </label>
                {formData.is_authenticated && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator</label>
                      <select
                        value={formData.authenticator || ''}
                        onChange={(e) => setFormData({ ...formData, authenticator: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select...</option>
                        {AUTHENTICATORS.map((auth) => (
                          <option key={auth} value={auth}>{auth}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Certificate #</label>
                      <input
                        type="text"
                        value={formData.cert_number || ''}
                        onChange={(e) => setFormData({ ...formData, cert_number: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Physical Attributes */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input
                  type="text"
                  value={formData.size || ''}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., XL, 8x10, 1/64"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., White, Navy Blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input
                  type="text"
                  value={formData.material || ''}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Leather, Canvas"
                />
              </div>
            </div>

            {/* Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition Notes</label>
                <input
                  type="text"
                  value={formData.condition_notes || ''}
                  onChange={(e) => setFormData({ ...formData, condition_notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Any flaws or special notes..."
                />
              </div>
            </div>

            {/* Description & Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={2}
                placeholder="Additional details about the item..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={2}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// ITEM CARD COMPONENT
// ============================================

interface ItemCardProps {
  item: StandaloneItem;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                {item.category?.name || 'Unknown'}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {item.sport}
              </span>
              {item.is_authenticated && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                  <Shield size={10} />
                  {item.authenticator || 'Authenticated'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {item.player_name && (
            <div>
              <span className="text-gray-500">Player:</span>{' '}
              <span className="text-gray-900">{item.player_name}</span>
            </div>
          )}
          {item.team && (
            <div>
              <span className="text-gray-500">Team:</span>{' '}
              <span className="text-gray-900">{item.team}</span>
            </div>
          )}
          {item.item_type && (
            <div>
              <span className="text-gray-500">Type:</span>{' '}
              <span className="text-gray-900">{item.item_type}</span>
            </div>
          )}
          {item.year && (
            <div>
              <span className="text-gray-500">Year:</span>{' '}
              <span className="text-gray-900">{item.year}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Condition:</span>{' '}
            <span className="text-gray-900">{item.condition}</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          Added {formatDate(item.created_at)}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function StandaloneItems() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StandaloneItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: categories } = useQuery({
    queryKey: ['itemCategories'],
    queryFn: () => api.standaloneItems.getItemCategories(),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['standaloneItems', categoryFilter, sportFilter, searchTerm],
    queryFn: () => api.standaloneItems.getStandaloneItems({
      category_id: categoryFilter || undefined,
      sport: sportFilter || undefined,
      search: searchTerm || undefined,
      limit: 100,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['standaloneItemStats'],
    queryFn: () => api.standaloneItems.getStandaloneItemStats(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.standaloneItems.deleteStandaloneItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standaloneItems'] });
      queryClient.invalidateQueries({ queryKey: ['standaloneItemStats'] });
    },
  });

  const handleDelete = (item: StandaloneItem) => {
    if (confirm(`Delete "${item.title}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleEdit = (item: StandaloneItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  // Filter non-card categories for display
  const nonCardCategories = categories?.filter(c => c.slug !== 'cards') || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memorabilia & Collectibles</h1>
          <p className="text-gray-500 mt-1">Manage non-card inventory items</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Memorabilia</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats?.by_category?.['Memorabilia'] || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Collectibles</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats?.by_category?.['Collectibles'] || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Authenticated</div>
          <div className="text-2xl font-bold text-green-600">{stats?.authenticated || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All Categories</option>
            {nonCardCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All Sports</option>
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>

          {(categoryFilter || sportFilter || searchTerm) && (
            <button
              onClick={() => {
                setCategoryFilter('');
                setSportFilter('');
                setSearchTerm('');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading items...</div>
      ) : items?.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">No items found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ItemFormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        item={editingItem}
        categories={nonCardCategories}
      />
    </div>
  );
}
