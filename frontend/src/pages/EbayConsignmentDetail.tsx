// src/pages/EbayConsignmentDetail.tsx
// View a single agreement: item details, record sales, sign, download PDF.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, PenLine, Plus, Trash2, X, CheckCircle2,
} from 'lucide-react';
import {
  addEbayItem,
  deleteEbayItem,
  downloadAgreementPdf,
  getEbayAgreement,
  recordEbayItemSale,
  signEbayAgreement,
  updateEbayAgreement,
  updateEbayItem,
  type EbayConsignmentItem,
  type EbayItemSaleInput,
} from '../api/ebayConsignmentsApi';

const STATUS_PILL: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-yellow-50 text-yellow-700',
  signed:    'bg-blue-50 text-blue-700',
  active:    'bg-green-50 text-green-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-50 text-red-600',
  pending:   'bg-gray-100 text-gray-600',
  listed:    'bg-yellow-50 text-yellow-700',
  sold:      'bg-green-50 text-green-700',
  unsold:    'bg-orange-50 text-orange-600',
  returned:  'bg-slate-100 text-slate-600',
};

const money = (v: string | number | null | undefined) =>
  v == null || v === '' ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EbayConsignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: agreement, isLoading } = useQuery({
    queryKey: ['ebay-agreement', id],
    queryFn: () => getEbayAgreement(id!),
    enabled: !!id,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [recordingSaleFor, setRecordingSaleFor] = useState<EbayConsignmentItem | null>(null);
  const [signingAs, setSigningAs] = useState<'client' | 'idgas' | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ebay-agreement', id] });

  const updateAgreementMut = useMutation({
    mutationFn: (patch: { status?: 'sent' | 'active' | 'completed' | 'cancelled' }) =>
      updateEbayAgreement(id!, patch),
    onSuccess: invalidate,
  });

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) => deleteEbayItem(itemId),
    onSuccess: invalidate,
  });

  const downloadPdf = async () => {
    if (!agreement) return;
    const blob = await downloadAgreementPdf(agreement.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consignment-${agreement.agreement_number || agreement.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }
  if (!agreement) {
    return <div className="p-8 text-gray-500">Agreement not found.</div>;
  }

  const canSign = agreement.status !== 'cancelled' && agreement.status !== 'completed';

  return (
    <div className="p-8">
      <Link to="/ebay-consignments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
        <ArrowLeft size={14} /> All agreements
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {agreement.agreement_number || 'Draft Agreement'}
          </h1>
          <p className="text-gray-500 mt-1">
            {agreement.consigner_name ?? 'Client'} &nbsp;·&nbsp; Agreement date{' '}
            {agreement.agreement_date} &nbsp;·&nbsp; Consigner payout{' '}
            <strong>{agreement.payout_percent}%</strong>
            <span className="text-gray-400">
              {' '}(IDGAS keeps {(100 - Number(agreement.payout_percent)).toFixed(2)}%)
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium self-center ${STATUS_PILL[agreement.status]}`}>
            {agreement.status}
          </span>
          <button
            onClick={downloadPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Signatures panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SignatureCard
          role="Consigner"
          signedName={agreement.client_signature_name}
          signedAt={agreement.client_signed_at}
          canSign={canSign}
          onSign={() => setSigningAs('client')}
        />
        <SignatureCard
          role="IDGAS Representative"
          signedName={agreement.idgas_signature_name}
          signedAt={agreement.idgas_signed_at}
          canSign={canSign}
          onSign={() => setSigningAs('idgas')}
        />
      </div>

      {/* Workflow quick-actions */}
      <div className="flex gap-2 mb-6">
        {agreement.status === 'draft' && (
          <button
            onClick={() => updateAgreementMut.mutate({ status: 'sent' })}
            className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Mark as Sent to Client
          </button>
        )}
        {(agreement.status === 'signed' || agreement.status === 'sent') && (
          <button
            onClick={() => updateAgreementMut.mutate({ status: 'active' })}
            className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Activate
          </button>
        )}
        {agreement.status !== 'completed' && agreement.status !== 'cancelled' && (
          <button
            onClick={() => {
              if (confirm('Mark this agreement as completed?')) {
                updateAgreementMut.mutate({ status: 'completed' });
              }
            }}
            className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Complete
          </button>
        )}
        {agreement.status !== 'cancelled' && (
          <button
            onClick={() => {
              if (confirm('Cancel this agreement? Items remain but nothing new can be recorded.')) {
                updateAgreementMut.mutate({ status: 'cancelled' });
              }
            }}
            className="px-3 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Items table */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-900">Items</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus size={14} /> Add item
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2">Condition</th>
              <th className="text-right px-3 py-2">Min Price</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Sold For</th>
              <th className="text-left px-3 py-2">Sold</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agreement.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  No items yet.
                </td>
              </tr>
            )}
            {agreement.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{item.title}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500">{item.description}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">{item.condition ?? '—'}</td>
                <td className="px-3 py-2 text-right">{money(item.minimum_price)}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      STATUS_PILL[item.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{money(item.sold_price)}</td>
                <td className="px-3 py-2 text-gray-600">
                  {item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {item.status !== 'sold' && item.status !== 'cancelled' && (
                      <button
                        onClick={() => setRecordingSaleFor(item)}
                        className="px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                      >
                        Record Sale
                      </button>
                    )}
                    {item.status !== 'sold' && !item.payout_id && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${item.title}"?`)) deleteItemMut.mutate(item.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                        title="Delete"
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

      {addOpen && (
        <AddItemModal
          agreementId={agreement.id}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            invalidate();
          }}
        />
      )}
      {recordingSaleFor && (
        <RecordSaleModal
          item={recordingSaleFor}
          onClose={() => setRecordingSaleFor(null)}
          onDone={() => {
            setRecordingSaleFor(null);
            invalidate();
          }}
        />
      )}
      {signingAs && (
        <SignModal
          party={signingAs}
          onClose={() => setSigningAs(null)}
          onDone={async (name) => {
            await signEbayAgreement(agreement.id, { party: signingAs, signature_name: name });
            setSigningAs(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------
// Signature card
// ------------------------------------------
function SignatureCard({
  role,
  signedName,
  signedAt,
  canSign,
  onSign,
}: {
  role: string;
  signedName: string | null;
  signedAt: string | null;
  canSign: boolean;
  onSign: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">{role}</div>
      {signedName ? (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={16} />
            <span className="font-semibold">{signedName}</span>
          </div>
          {signedAt && (
            <div className="text-xs text-gray-500 mt-1">
              Signed {new Date(signedAt).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-gray-400 italic text-sm">Not yet signed</span>
          {canSign && (
            <button
              onClick={onSign}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <PenLine size={14} />
              Sign
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------
// Sign modal
// ------------------------------------------
function SignModal({
  party,
  onClose,
  onDone,
}: {
  party: 'client' | 'idgas';
  onClose: () => void;
  onDone: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onDone(name.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">
            {party === 'client' ? 'Consigner Signature' : 'IDGAS Signature'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-3">
            Type the full legal name of the signer. This will be recorded as the electronic
            signature on the agreement PDF.
          </p>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 hover:bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Signing…' : 'Sign'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------
// Add item modal
// ------------------------------------------
function AddItemModal({
  agreementId,
  onClose,
  onDone,
}: {
  agreementId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      addEbayItem(agreementId, {
        title: title.trim(),
        description: description || null,
        condition: condition || null,
        minimum_price: minPrice,
      }),
    onSuccess: onDone,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !minPrice) return;
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Add Item</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Title *</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Description</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Condition</span>
              <input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Min Price *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 hover:bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mut.isPending}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------
// Record sale modal
// ------------------------------------------
function RecordSaleModal({
  item,
  onClose,
  onDone,
}: {
  item: EbayConsignmentItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<EbayItemSaleInput>({
    sold_price: '',
    sold_at: new Date().toISOString().slice(0, 10),
    ebay_fees: '',
    payment_fees: '',
    shipping_cost: '',
    buyer_info: '',
  });
  const [listingId, setListingId] = useState(item.ebay_listing_id ?? '');

  const mut = useMutation({
    mutationFn: async () => {
      if (listingId && listingId !== item.ebay_listing_id) {
        await updateEbayItem(item.id, { ebay_listing_id: listingId });
      }
      return recordEbayItemSale(item.id, {
        sold_price: form.sold_price,
        sold_at: form.sold_at || null,
        ebay_fees: form.ebay_fees || 0,
        payment_fees: form.payment_fees || 0,
        shipping_cost: form.shipping_cost || 0,
        buyer_info: form.buyer_info || null,
      });
    },
    onSuccess: onDone,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sold_price) return;
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Record Sale &mdash; {item.title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Sold price *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.sold_price as string}
                onChange={(e) => setForm({ ...form, sold_price: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Sold date</span>
              <input
                type="date"
                value={(form.sold_at as string) ?? ''}
                onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">eBay fees</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.ebay_fees as string}
                onChange={(e) => setForm({ ...form, ebay_fees: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Payment fees</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.payment_fees as string}
                onChange={(e) => setForm({ ...form, payment_fees: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1">Shipping</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.shipping_cost as string}
                onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">eBay listing ID (optional)</span>
            <input
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Buyer info (optional)</span>
            <input
              value={(form.buyer_info as string) ?? ''}
              onChange={(e) => setForm({ ...form, buyer_info: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Buyer name or eBay username"
            />
          </label>

          {mut.isError && (
            <div className="text-sm text-red-600">
              {(mut.error as Error)?.message || 'Failed to record sale'}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 hover:bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mut.isPending || !form.sold_price}
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Saving…' : 'Record Sale'}
          </button>
        </div>
      </form>
    </div>
  );
}
