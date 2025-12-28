import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../api';
import type { Brand, ProductLineCreate } from '../types';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function ProductLines() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.products.getBrands(),
  });

  const { data: productLines, isLoading } = useQuery({
    queryKey: ['product-lines', filterBrand, filterYear],
    queryFn: () => api.products.getProductLines({
      brand_id: filterBrand || undefined,
      year: filterYear ? parseInt(filterYear) : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.products.deleteProductLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-lines'] });
    },
  });

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Lines</h1>
          <p className="text-gray-500 mt-1">Manage Topps, Bowman, and other product lines</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Product Line
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Product Lines Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productLines?.map((pl) => (
            <div
              key={pl.id}
              className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{pl.brand?.name || pl.brand_name}</p>
                    <h3 className="font-semibold text-gray-900">{pl.name}</h3>
                    <p className="text-sm text-gray-500">{pl.year}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this product line and all its checklists?')) {
                      deleteMutation.mutate(pl.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Checklist</span>
                  <span className="font-medium text-gray-900">{formatNumber(pl.checklist_count)} cards</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">In Stock</span>
                  <span className="font-medium text-gray-900">{formatNumber(pl.inventory_count)}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Completion</span>
                    <span className="text-gray-700">{pl.completion_pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pl.completion_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {productLines?.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No product lines found. Add one to get started.
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProductLineModal
          brands={brands || []}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['product-lines'] });
          }}
        />
      )}
    </div>
  );
}

function CreateProductLineModal({
  brands,
  onClose,
  onCreated,
}: {
  brands: Brand[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState<ProductLineCreate>({
    brand_id: '',
    name: '',
    year: new Date().getFullYear(),
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: ProductLineCreate) => api.products.createProductLine(data),
    onSuccess: () => onCreated(),
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_id || !formData.name) {
      setError('Brand and name are required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Product Line</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select brand...</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Chrome, Series 1, Draft"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min={1900}
              max={2100}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

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
