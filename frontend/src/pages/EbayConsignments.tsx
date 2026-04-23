// src/pages/EbayConsignments.tsx
// List consignment agreements + entry point to build a new one.

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, FileText, Trash2, Download, X,
} from 'lucide-react';
import {
  listEbayAgreements,
  listEbayConsigners,
  createEbayAgreement,
  deleteEbayAgreement,
  downloadAgreementPdf,
  type EbayAgreementStatus,
  type EbayConsignmentAgreementCreate,
  type EbayConsignmentItemCreate,
} from '../api/ebayConsignmentsApi';

const STATUS_COLORS: Record<EbayAgreementStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-yellow-50 text-yellow-700',
  signed:    'bg-blue-50 text-blue-700',
  active:    'bg-green-50 text-green-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-50 text-red-600',
};

export default function EbayConsignments() {
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const initialConsigner = sp.get('consigner_id') || '';
  const [consignerFilter, setConsignerFilter] = useState<string>(initialConsigner);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: consigners } = useQuery({
    queryKey: ['ebay-consigners'],
    queryFn: () => listEbayConsigners({ active_only: true, limit: 200 }),
  });

  const { data: agreements, isLoading } = useQuery({
    queryKey: ['ebay-agreements', consignerFilter, statusFilter],
    queryFn: () =>
      listEbayAgreements({
        consigner_id: consignerFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
  });

  const consignerMap = useMemo(() => {
    const m: Record<string, string> = {};
    (consigners || []).forEach((c) => (m[c.id] = c.name));
    return m;
  }, [consigners]);

  const deleteMut = useMutation({
    mutationFn: deleteEbayAgreement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebay-agreements'] }),
  });

  const pdfDownload = async (id: string, label: string) => {
    const blob = await downloadAgreementPdf(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consignment-${label || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eBay Consignment Agreements</h1>
          <p className="text-gray-500 mt-1">
            Build, sign, and track agreements for items being sold on eBay
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          New Agreement
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={consignerFilter}
          onChange={(e) => setConsignerFilter(e.target.value)}
          className="border rounded-md px-3 py-2 bg-white text-sm"
        >
          <option value="">All clients</option>
          {(consigners ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 bg-white text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="signed">Signed</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <Link
          to="/ebay-consigners"
          className="ml-auto text-sm text-blue-600 hover:text-blue-700"
        >
          Manage clients →
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Agreement #</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3">Payout %</th>
              <th className="text-right px-4 py-3">Items</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (agreements ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  No agreements match.
                </td>
              </tr>
            )}
            {(agreements ?? []).map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    to={`/ebay-consignments/${a.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {a.agreement_number || a.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.consigner_name ?? consignerMap[a.consigner_id] ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{a.agreement_date}</td>
                <td className="px-4 py-3 text-right">{a.payout_percent}%</td>
                <td className="px-4 py-3 text-right">{a.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="Download PDF"
                      onClick={() => pdfDownload(a.id, a.agreement_number || '')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <Download size={14} />
                    </button>
                    <Link
                      to={`/ebay-consignments/${a.id}`}
                      title="Open"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <FileText size={14} />
                    </Link>
                    {(a.status === 'draft' || a.status === 'cancelled') && (
                      <button
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete agreement ${a.agreement_number}? Items will be lost.`)) {
                            deleteMut.mutate(a.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateAgreementModal onClose={() => setShowCreate(false)} onCreated={() => {
          setShowCreate(false);
          qc.invalidateQueries({ queryKey: ['ebay-agreements'] });
        }} />
      )}
    </div>
  );
}

// ============================================
// New Agreement modal with line-item builder
// ============================================

type ItemRow = EbayConsignmentItemCreate & { _rowId: number };

function CreateAgreementModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: consigners } = useQuery({
    queryKey: ['ebay-consigners'],
    queryFn: () => listEbayConsigners({ active_only: true, limit: 200 }),
  });

  const today = new Date().toISOString().slice(0, 10);
  const [consignerId, setConsignerId] = useState('');
  const [agreementDate, setAgreementDate] = useState(today);
  const [payoutPercent, setPayoutPercent] = useState<string>('80');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { _rowId: 1, title: '', description: '', condition: '', minimum_price: '' },
  ]);

  // Pre-fill payout% when consigner picked
  const onConsignerChange = (id: string) => {
    setConsignerId(id);
    const picked = consigners?.find((c) => c.id === id);
    if (picked?.default_payout_percent) setPayoutPercent(String(picked.default_payout_percent));
  };

  const addRow = () =>
    setItems((rows) => [
      ...rows,
      {
        _rowId: (rows[rows.length - 1]?._rowId ?? 0) + 1,
        title: '',
        description: '',
        condition: '',
        minimum_price: '',
      },
    ]);

  const removeRow = (rowId: number) =>
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((r) => r._rowId !== rowId)));

  const updateRow = (rowId: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r._rowId === rowId ? { ...r, ...patch } : r)));

  const createMut = useMutation({
    mutationFn: (data: EbayConsignmentAgreementCreate) => createEbayAgreement(data),
    onSuccess: onCreated,
  });

  const canSubmit =
    !!consignerId &&
    !!agreementDate &&
    !!payoutPercent &&
    items.every((i) => i.title.trim().length > 0 && String(i.minimum_price).length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payloadItems: EbayConsignmentItemCreate[] = items.map((i) => ({
      title: i.title.trim(),
      description: i.description || null,
      category: i.category || null,
      condition: i.condition || null,
      minimum_price: i.minimum_price,
      notes: i.notes || null,
    }));
    createMut.mutate({
      consigner_id: consignerId,
      agreement_date: agreementDate,
      payout_percent: payoutPercent,
      notes: notes || null,
      items: payloadItems,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-lg">New Consignment Agreement</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm col-span-2">
              <span className="block text-gray-700 mb-1">Client *</span>
              <select
                required
                value={consignerId}
                onChange={(e) => onConsignerChange(e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-white"
              >
                <option value="">Select a client…</option>
                {(consigners ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Agreement date *</span>
              <input
                type="date"
                required
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Consigner payout (% of sale)</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={payoutPercent}
                  onChange={(e) => setPayoutPercent(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  %
                </span>
              </div>
              <span className="block text-xs text-gray-500 mt-1">
                IDGAS keeps {payoutPercent ? (100 - Number(payoutPercent)).toFixed(2) : '—'}%
              </span>
            </label>
            <label className="block text-sm col-span-2">
              <span className="block text-gray-700 mb-1">Notes</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Items on this agreement</h3>
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2">Title *</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2">Condition</th>
                    <th className="text-right px-3 py-2">Min Price *</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row) => (
                    <tr key={row._rowId}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          required
                          value={row.title}
                          onChange={(e) => updateRow(row._rowId, { title: e.target.value })}
                          className="w-full border rounded-md px-2 py-1.5"
                          placeholder="e.g., Mike Trout Signed Rookie Card"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.description ?? ''}
                          onChange={(e) =>
                            updateRow(row._rowId, { description: e.target.value })
                          }
                          className="w-full border rounded-md px-2 py-1.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.condition ?? ''}
                          onChange={(e) =>
                            updateRow(row._rowId, { condition: e.target.value })
                          }
                          className="w-28 border rounded-md px-2 py-1.5"
                          placeholder="NM, PSA 9…"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={row.minimum_price}
                          onChange={(e) =>
                            updateRow(row._rowId, { minimum_price: e.target.value })
                          }
                          className="w-28 border rounded-md px-2 py-1.5 text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-1 py-2 text-right">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row._rowId)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove row"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {createMut.isError && (
            <div className="text-sm text-red-600">
              {(createMut.error as Error)?.message || 'Failed to create agreement'}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-600 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || createMut.isPending}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Creating…' : 'Create Agreement'}
          </button>
        </div>
      </form>
    </div>
  );
}
