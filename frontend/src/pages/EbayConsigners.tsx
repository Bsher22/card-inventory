// src/pages/EbayConsigners.tsx
// Manage eBay consignment clients (people whose items we sell).

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Mail, Phone, Pencil, X } from 'lucide-react';
import {
  createEbayConsigner,
  listEbayConsigners,
  updateEbayConsigner,
  type EbayConsigner,
  type EbayConsignerCreate,
} from '../api/ebayConsignmentsApi';

export default function EbayConsigners() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<EbayConsigner | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: consigners, isLoading } = useQuery({
    queryKey: ['ebay-consigners', showInactive],
    queryFn: () => listEbayConsigners({ active_only: !showInactive }),
  });

  const onSaved = () => {
    setShowCreate(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['ebay-consigners'] });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eBay Consignment Clients</h1>
          <p className="text-gray-500 mt-1">
            People whose items we're selling on eBay for a commission
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Client
        </button>
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Include inactive clients</span>
        </label>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : !consigners || consigners.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          No consignment clients yet. Add one to start writing agreements.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consigners.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                  {c.email && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                      <Mail size={12} /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {c.phone}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(c)}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Default fee:{' '}
                  <strong>
                    {c.default_fee_percent ? `${c.default_fee_percent}%` : '—'}
                  </strong>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <Link
                  to={`/ebay-consignments?consigner_id=${c.id}`}
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Agreements <ChevronRight size={14} className="inline" />
                </Link>
                <Link
                  to={`/ebay-payouts?consigner_id=${c.id}`}
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Payouts <ChevronRight size={14} className="inline" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editing) && (
        <ConsignerModal
          initial={editing ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function ConsignerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: EbayConsigner;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EbayConsignerCreate>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    street_address: initial?.street_address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    postal_code: initial?.postal_code ?? '',
    country: initial?.country ?? 'USA',
    default_fee_percent: initial?.default_fee_percent ?? '',
    payment_method: initial?.payment_method ?? '',
    payment_details: initial?.payment_details ?? '',
    is_active: initial?.is_active ?? true,
    notes: initial?.notes ?? '',
  });

  const createMut = useMutation({ mutationFn: createEbayConsigner, onSuccess: onSaved });
  const updateMut = useMutation({
    mutationFn: (payload: EbayConsignerCreate) =>
      updateEbayConsigner(initial!.id, payload),
    onSuccess: onSaved,
  });
  const busy = createMut.isPending || updateMut.isPending;

  const set = <K extends keyof EbayConsignerCreate>(k: K, v: EbayConsignerCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EbayConsignerCreate = {
      ...form,
      default_fee_percent:
        form.default_fee_percent === '' || form.default_fee_percent == null
          ? null
          : form.default_fee_percent,
    };
    if (initial) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-lg">
            {initial ? 'Edit Client' : 'New Consignment Client'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Name *">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
          </div>

          <Field label="Street address">
            <input
              type="text"
              value={form.street_address ?? ''}
              onChange={(e) => set('street_address', e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <input
                type="text"
                value={form.city ?? ''}
                onChange={(e) => set('city', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="State">
              <input
                type="text"
                value={form.state ?? ''}
                onChange={(e) => set('state', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="ZIP">
              <input
                type="text"
                value={form.postal_code ?? ''}
                onChange={(e) => set('postal_code', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Default Fee % (commission)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.default_fee_percent as string | number}
                onChange={(e) => set('default_fee_percent', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="e.g., 20"
              />
            </Field>
            <Field label="Payment Method">
              <select
                value={form.payment_method ?? ''}
                onChange={(e) => set('payment_method', e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-white"
              >
                <option value="">—</option>
                <option>Check</option>
                <option>Venmo</option>
                <option>PayPal</option>
                <option>Zelle</option>
                <option>ACH</option>
                <option>Cash</option>
              </select>
            </Field>
          </div>

          <Field label="Payment Details (handle, account, etc.)">
            <input
              type="text"
              value={form.payment_details ?? ''}
              onChange={(e) => set('payment_details', e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </Field>

          <Field label="Notes">
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </Field>

          {initial && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
              />
              Active
            </label>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : initial ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
