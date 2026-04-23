// src/pages/EbayPayouts.tsx
// Generate and review monthly payout statements for consignment clients.

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Download, FileText, BadgeDollarSign, RefreshCw, CheckCircle2, Trash2,
} from 'lucide-react';
import {
  deleteEbayPayout,
  downloadPayoutStatementPdf,
  generateEbayPayout,
  listEbayConsigners,
  listEbayPayouts,
  markEbayPayoutPaid,
  previewEbayPayout,
} from '../api/ebayConsignmentsApi';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const money = (v: string | number | null | undefined) =>
  v == null || v === '' ? '—' : `$${Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

export default function EbayPayouts() {
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const now = new Date();

  const [consignerId, setConsignerId] = useState<string>(sp.get('consigner_id') || '');
  const [year, setYear] = useState<number>(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [month, setMonth] = useState<number>(
    now.getMonth() === 0 ? 12 : now.getMonth(), // default to previous month
  );

  const { data: consigners } = useQuery({
    queryKey: ['ebay-consigners'],
    queryFn: () => listEbayConsigners({ active_only: false, limit: 200 }),
  });

  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ['ebay-payouts', consignerId],
    queryFn: () =>
      listEbayPayouts({ consigner_id: consignerId || undefined, limit: 100 }),
  });

  const preview = useQuery({
    queryKey: ['ebay-payout-preview', consignerId, year, month],
    queryFn: () => previewEbayPayout(consignerId, year, month),
    enabled: !!consignerId && !!year && !!month,
  });

  const generateMut = useMutation({
    mutationFn: () =>
      generateEbayPayout({
        consigner_id: consignerId,
        period_year: year,
        period_month: month,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ebay-payouts'] });
      qc.invalidateQueries({ queryKey: ['ebay-payout-preview'] });
    },
  });

  const consignerName = useMemo(
    () => consigners?.find((c) => c.id === consignerId)?.name,
    [consigners, consignerId],
  );

  const download = async (id: string, label: string) => {
    const blob = await downloadPayoutStatementPdf(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${label}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Payouts</h1>
        <p className="text-gray-500 mt-1">
          Generate monthly statements and track payouts to consignment clients
        </p>
      </div>

      {/* Generator card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BadgeDollarSign size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-900">Generate Statement</h2>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <label className="block text-sm col-span-2">
            <span className="block text-gray-700 mb-1">Client</span>
            <select
              value={consignerId}
              onChange={(e) => setConsignerId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select client…</option>
              {(consigners ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Year</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        {consignerId && (
          <div className="border border-gray-100 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Preview for <strong>{consignerName}</strong> · {MONTHS[month - 1]} {year}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => preview.refetch()}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <button
                  onClick={() => generateMut.mutate()}
                  disabled={
                    generateMut.isPending ||
                    !preview.data ||
                    preview.data.item_count === 0
                  }
                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {generateMut.isPending ? 'Generating…' : 'Generate Statement'}
                </button>
              </div>
            </div>

            {preview.isLoading && <div className="p-4 text-gray-500">Loading preview…</div>}
            {preview.data && (
              <div className="p-4">
                {preview.data.item_count === 0 ? (
                  <div className="text-sm text-gray-500">
                    No unclaimed sold items in this period. Nothing to pay out.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-4 mb-3 text-sm">
                      <Stat label="Items" value={String(preview.data.item_count)} />
                      <Stat label="Gross" value={money(preview.data.total_gross)} />
                      <Stat label="eBay fees" value={money(preview.data.total_ebay_fees)} />
                      <Stat label="IDGAS fee" value={money(preview.data.total_idgas_fee)} />
                      <Stat label="Client Payout" value={money(preview.data.net_payout)} emphasis />
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-md">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                          <tr>
                            <th className="text-left px-3 py-2">Sold</th>
                            <th className="text-left px-3 py-2">Item</th>
                            <th className="text-right px-3 py-2">Price</th>
                            <th className="text-right px-3 py-2">eBay</th>
                            <th className="text-right px-3 py-2">Other</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {preview.data.items.map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2 text-gray-600">
                                {it.sold_at
                                  ? new Date(it.sold_at).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="px-3 py-2">{it.title}</td>
                              <td className="px-3 py-2 text-right">{money(it.sold_price)}</td>
                              <td className="px-3 py-2 text-right">{money(it.ebay_fees)}</td>
                              <td className="px-3 py-2 text-right">
                                {money(
                                  Number(it.payment_fees) + Number(it.shipping_cost),
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {generateMut.isError && (
          <div className="mt-3 text-sm text-red-600">
            {(generateMut.error as Error)?.message || 'Failed to generate payout'}
          </div>
        )}
      </div>

      {/* Past payouts */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <FileText size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">Statements History</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Period</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-right px-4 py-3">Items</th>
              <th className="text-right px-4 py-3">Gross</th>
              <th className="text-right px-4 py-3">IDGAS Fee</th>
              <th className="text-right px-4 py-3">Client Payout</th>
              <th className="text-center px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingPayouts && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loadingPayouts && (payouts ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  No statements yet.
                </td>
              </tr>
            )}
            {(payouts ?? []).map((p) => (
              <PayoutRow key={p.id} payout={p} onDownload={download} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div
        className={`mt-1 ${
          emphasis ? 'text-green-700 font-bold text-lg' : 'font-semibold text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PayoutRow({
  payout,
  onDownload,
}: {
  payout: Awaited<ReturnType<typeof listEbayPayouts>>[number];
  onDownload: (id: string, label: string) => void;
}) {
  const qc = useQueryClient();
  const markMut = useMutation({
    mutationFn: () =>
      markEbayPayoutPaid(payout.id, {
        paid_at: new Date().toISOString(),
        paid_method: 'manual',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebay-payouts'] }),
  });
  const delMut = useMutation({
    mutationFn: () => deleteEbayPayout(payout.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ebay-payouts'] }),
  });
  return (
    <tr>
      <td className="px-4 py-3">
        {MONTHS[payout.period_month - 1]} {payout.period_year}
      </td>
      <td className="px-4 py-3">{payout.consigner_name ?? '—'}</td>
      <td className="px-4 py-3 text-right">{payout.item_count}</td>
      <td className="px-4 py-3 text-right">{money(payout.total_gross)}</td>
      <td className="px-4 py-3 text-right">{money(payout.total_idgas_fee)}</td>
      <td className="px-4 py-3 text-right font-semibold">{money(payout.net_payout)}</td>
      <td className="px-4 py-3 text-center">
        {payout.is_paid ? (
          <span className="inline-flex items-center gap-1 text-green-700 text-xs">
            <CheckCircle2 size={14} /> Paid
          </span>
        ) : (
          <button
            onClick={() => markMut.mutate()}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Mark paid
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            title="Download statement"
            onClick={() =>
              onDownload(
                payout.id,
                `${payout.consigner_name ?? 'client'}-${payout.period_year}-${String(
                  payout.period_month,
                ).padStart(2, '0')}`,
              )
            }
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <Download size={14} />
          </button>
          {!payout.is_paid && (
            <button
              title="Delete (release items)"
              onClick={() => {
                if (confirm('Delete this statement and release items back to the pool?')) {
                  delMut.mutate();
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
  );
}
