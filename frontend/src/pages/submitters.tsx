/**
 * Submitters Page
 * 
 * Manage third-party grading/authentication submission services.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Building2,
  Check,
  X,
  Pencil,
  Trash2,
  Star,
  Shield,
  Award,
  ExternalLink,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react';

import { submittersApi } from '../api/submittersApi';
import type { Submitter, SubmitterCreate, SubmitterUpdate } from '../types';

// ============================================
// SUBMITTER FORM MODAL
// ============================================

interface SubmitterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  submitter?: Submitter | null;
}

function SubmitterFormModal({ isOpen, onClose, submitter }: SubmitterFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!submitter;

  const [formData, setFormData] = useState<SubmitterCreate>({
    name: submitter?.name || '',
    short_name: submitter?.short_name || '',
    website: submitter?.website || '',
    contact_email: submitter?.contact_email || '',
    contact_phone: submitter?.contact_phone || '',
    offers_grading: submitter?.offers_grading ?? true,
    offers_authentication: submitter?.offers_authentication ?? true,
    is_active: submitter?.is_active ?? true,
    notes: submitter?.notes || '',
  });

  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: submittersApi.createSubmitter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submitters'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SubmitterUpdate) => 
      submittersApi.updateSubmitter(submitter!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submitters'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    const data = {
      ...formData,
      short_name: formData.short_name || null,
      website: formData.website || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      notes: formData.notes || null,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as SubmitterCreate);
    }
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 className="text-indigo-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Submitter' : 'Add Submitter'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PWCC, MySlabs, KK Sports"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* Short Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name
            </label>
            <input
              type="text"
              value={formData.short_name || ''}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder="e.g., PWCC"
              maxLength={20}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used in compact views (max 20 chars)</p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services Offered
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.offers_grading}
                  onChange={(e) => setFormData({ ...formData, offers_grading: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Award size={16} className="text-blue-600" />
                <span className="text-sm text-gray-700">Grading</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.offers_authentication}
                  onChange={(e) => setFormData({ ...formData, offers_authentication: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Shield size={16} className="text-green-600" />
                <span className="text-sm text-gray-700">Authentication</span>
              </label>
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Active</div>
              <div className="text-sm text-gray-600">
                Inactive submitters won't appear in dropdowns
              </div>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                {isEditing ? 'Save Changes' : 'Add Submitter'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUBMITTER CARD
// ============================================

interface SubmitterCardProps {
  submitter: Submitter;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

function SubmitterCard({ submitter, onEdit, onDelete, onSetDefault }: SubmitterCardProps) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${!submitter.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{submitter.name}</h3>
          {submitter.is_default && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              <Star size={12} fill="currentColor" />
              Default
            </span>
          )}
          {!submitter.is_active && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!submitter.is_default && submitter.is_active && (
            <button
              onClick={onSetDefault}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
              title="Set as default"
            >
              <Star size={16} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          {!submitter.is_default && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="flex items-center gap-3 mb-3">
        {submitter.offers_grading && (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <Award size={12} />
            Grading
          </span>
        )}
        {submitter.offers_authentication && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            <Shield size={12} />
            Authentication
          </span>
        )}
      </div>

      {/* Contact Info */}
      <div className="space-y-1 text-sm text-gray-600">
        {submitter.website && (
          <a
            href={submitter.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-indigo-600"
          >
            <ExternalLink size={14} />
            {submitter.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
        {submitter.contact_email && (
          <a
            href={`mailto:${submitter.contact_email}`}
            className="flex items-center gap-2 hover:text-indigo-600"
          >
            <Mail size={14} />
            {submitter.contact_email}
          </a>
        )}
        {submitter.contact_phone && (
          <a
            href={`tel:${submitter.contact_phone}`}
            className="flex items-center gap-2 hover:text-indigo-600"
          >
            <Phone size={14} />
            {submitter.contact_phone}
          </a>
        )}
      </div>

      {submitter.notes && (
        <p className="mt-3 text-sm text-gray-500 border-t pt-3">{submitter.notes}</p>
      )}
    </div>
  );
}

// ============================================
// MAIN SUBMITTERS PAGE
// ============================================

export default function Submitters() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSubmitter, setEditingSubmitter] = useState<Submitter | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: submitters, isLoading } = useQuery({
    queryKey: ['submitters', showInactive],
    queryFn: () => submittersApi.getSubmitters({ active_only: !showInactive }),
  });

  const deleteMutation = useMutation({
    mutationFn: submittersApi.deleteSubmitter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submitters'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: submittersApi.setDefaultSubmitter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submitters'] });
    },
  });

  const handleEdit = (submitter: Submitter) => {
    setEditingSubmitter(submitter);
    setShowModal(true);
  };

  const handleDelete = (submitter: Submitter) => {
    if (confirm(`Are you sure you want to delete "${submitter.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(submitter.id);
    }
  };

  const handleSetDefault = (submitter: Submitter) => {
    setDefaultMutation.mutate(submitter.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubmitter(null);
  };

  const activeCount = submitters?.filter(s => s.is_active).length || 0;
  const totalCount = submitters?.length || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submitters</h1>
          <p className="text-gray-500 mt-1">
            Manage third-party grading and authentication services
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Add Submitter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Active Submitters</div>
          <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Grading Services</div>
          <div className="text-2xl font-bold text-blue-600">
            {submitters?.filter(s => s.offers_grading && s.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Auth Services</div>
          <div className="text-2xl font-bold text-green-600">
            {submitters?.filter(s => s.offers_authentication && s.is_active).length || 0}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-600">Show inactive submitters</span>
        </label>
        {showInactive && totalCount > activeCount && (
          <span className="text-sm text-gray-500">
            ({totalCount - activeCount} inactive)
          </span>
        )}
      </div>

      {/* Submitter List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : submitters?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No submitters yet</h3>
          <p className="text-gray-500 mb-4">
            Add your first third-party submission service
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Submitter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submitters?.map((submitter) => (
            <SubmitterCard
              key={submitter.id}
              submitter={submitter}
              onEdit={() => handleEdit(submitter)}
              onDelete={() => handleDelete(submitter)}
              onSetDefault={() => handleSetDefault(submitter)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <SubmitterFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        submitter={editingSubmitter}
      />
    </div>
  );
}