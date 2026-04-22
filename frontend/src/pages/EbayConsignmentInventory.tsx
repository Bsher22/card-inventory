// src/pages/EbayConsignmentInventory.tsx
// Cross-agreement view of every item we're consigning on eBay.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ExternalLink, BadgeDollarSign } from 'lucide-react';
import {
  listEbayConsigners,
  listEbayItems,
  type EbayItemStatus,
} from '../api/ebayConsignmentsApi';

const STATUS_PILL: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600',
  listed:    'bg-yellow-50 text-yellow-700',
  sold:      'bg-green-50 text-green-700',
  unsold:    'bg-orange-50 text-orange-600',
  returned:  'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-600',
};

const STATUSES: EbayItemStatus[] = [
  'pending', 'listed', 'sold', 'unsold', 'returned', 'cancelled',
];

const money = (v: string | number | null | undefined) =>
  v == null || v === ''
    ? '—'
    : `$${Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function EbayConsignmentInventory() {
  const [sp] = useSearchParams();
  const [consignerId, setConsignerId] = useState<string>(sp.get('consigner_id') || '');
  const [status, setStatus] = useState<string>(sp.get('status') || '');
  const [search, setSearch] = useState<string>('');

  const { data: consigners } = useQuery({
    queryKey: ['ebay-consigners'],
    queryFn: () => listEbayConsigners({ active_only: false, limit: 200 }),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['ebay-items', consignerId, status, search],
    queryFn: () =>
      listEbayItems({
        consigner_id: consignerId || undefined,
        status: status || undefined,
        search: search || undefined,
        limit: 250,
      }),
  });

  const totals = useMemo(() => {
    const t = { count: 0, gross: 0, listed: 0, sold: 0, pending: 0, minSum: 0 };
    (items ?? []).forEach((it) => {
      t.count += 1;
      t.minSum += Number(it.minimum_price) || 0;
      if (it.status === 'sold') {
        t.sold += 1;
        t.gross += Number(it.sold_price ?? 0);
      } else if (it.status === 'listed') {
        t.listed += 1;
      } else if (it.status === 'pending') {
        t.pending += 1;
      }
    });
    return t;
  }, [items]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eBay Consignment Inventory</h1>
          <p className="text-gray-500 mt-1">
            Every item we're holding for clients, across all agreements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/ebay-payouts"
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
          >
            <BadgeDollarSign size={14} /> Monthly Payouts
          </Link>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Tile label="Total Items" value={String(totals.count)} />
        <Tile label="Pending" value={String(totals.pending)} />
        <Tile label="Listed" value={String(totals.listed)} accent="yellow" />
        <Tile label="Sold" value={String(totals.sold)} accent="green" />
        <Tile label="Sold $" value={money(totals.gross)} accent="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
            className="pl-8 pr-3 py-2 border rounded-md bg-white text-sm w-64"
          />
        </div>
        <select
          value={consignerId}
          onChange={(e) => setConsignerId(e.target.value)}
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
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-md px-3 py-2 bg-white text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(search || consignerId || status) && (
          <button
            onClick={() => {
              setSearch('');
              setConsignerId('');
              setStatus('');
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Agreement</th>
              <th className="text-right px-4 py-3">Min Price</th>
              <th className="text-right px-4 py-3">Sold For</th>
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
            {!isLoading && (items ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  No items match your filters.
                </td>
              </tr>
            )}
            {(items ?? []).map((it) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{it.title}</div>
                  {it.condition && (
                    <div className="text-xs text-gray-500">{it.condition}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{it.consigner_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">
                  <Link
                    to={`/ebay-consignments/${it.agreement_id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {it.agreement_number ?? it.agreement_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">{money(it.minimum_price)}</td>
                <td className="px-4 py-3 text-right">{money(it.sold_price)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      STATUS_PILL[it.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {it.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/ebay-consignments/${it.agreement_id}`}
                    className="p-1.5 inline-flex rounded hover:bg-gray-100 text-gray-500"
                    title="Open agreement"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(items ?? []).length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Showing {totals.count} item{totals.count === 1 ? '' : 's'}.
          Combined min-price floor: {money(totals.minSum)}.
        </p>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'yellow' | 'red';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-green-700'
      : accent === 'yellow'
      ? 'text-yellow-700'
      : accent === 'red'
      ? 'text-red-600'
      : 'text-gray-900';
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}
