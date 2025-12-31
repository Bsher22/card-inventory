import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, Package, Calendar, 
  ChevronDown, ChevronRight, Award
} from 'lucide-react';
import { api } from '../api';
import type { 
  CardGradingSubmission, 
  CardGradingItem,
  GradingCompanyWithLevels,
  PendingByCompany 
} from '../types';

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

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  shipped: { bg: 'bg-blue-100', text: 'text-blue-700' },
  received: { bg: 'bg-purple-100', text: 'text-purple-700' },
  graded: { bg: 'bg-green-100', text: 'text-green-700' },
  returned: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function GradingSubmissions() {
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['grading-companies'],
    queryFn: () => api.grading.getCompanies(),
  });

  const { data: stats } = useQuery({
    queryKey: ['grading-stats'],
    queryFn: () => api.grading.getStats(),
  });

  const { data: pendingByCompany } = useQuery({
    queryKey: ['pending-by-company'],
    queryFn: () => api.grading.getPendingByCompany(),
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['grading-submissions', filterCompany, filterStatus],
    queryFn: () => api.grading.getSubmissions({
      company_id: filterCompany || undefined,
      status: filterStatus || undefined,
    }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grading Submissions</h1>
          <p className="text-gray-500 mt-1">Track PSA, BGS, and other grading submissions</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Submission
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Out</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.cards_out_for_grading || 0}</p>
          <p className="text-xs text-gray-500">{stats?.pending_submissions || 0} submissions</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Pending Fees</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(Number(stats?.pending_fees) || 0)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Cards Graded</p>
          <p className="text-2xl font-bold text-green-600">{stats?.total_graded || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-500">Gem Rate</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.gem_rate?.toFixed(1) || '-'}%</p>
        </div>
      </div>

      {/* Pending by Company */}
      {pendingByCompany && pendingByCompany.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Pending by Company</h3>
          <div className="flex flex-wrap gap-3">
            {pendingByCompany.map((pending: PendingByCompany) => (
              <div key={pending.company_id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{pending.company_name}</span>
                <span className="text-sm text-gray-500">{pending.pending_count} cards</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative">
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {companies?.map((c: GradingCompanyWithLevels) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
            <option value="graded">Graded</option>
            <option value="returned">Returned</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i: number) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {submissions?.map((submission: CardGradingSubmission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isExpanded={expandedId === submission.id}
              onToggle={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
            />
          ))}

          {submissions?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No submissions found. Create one to start tracking.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  isExpanded,
  onToggle,
}: {
  submission: CardGradingSubmission;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[submission.status] || STATUS_STYLES.pending;
  const totalCards = submission.total_cards || submission.items?.length || 0;
  const gradedCards = submission.cards_graded || submission.items?.filter((i: CardGradingItem) => i.grade_value !== null).length || 0;
  const totalCost = Number(submission.grading_fee || 0) + Number(submission.shipping_to_cost || 0);

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-100'
    }`}>
      <div 
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              {isExpanded ? <ChevronDown className="text-blue-600" size={20} /> : <ChevronRight className="text-blue-600" size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">
                  {submission.company_code || submission.company_name || 'Unknown'}
                </h3>
                {submission.submission_number && (
                  <span className="text-sm text-gray-500">#{submission.submission_number}</span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                  {submission.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(submission.date_submitted)}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {totalCards} cards
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-sm text-gray-500">
              {gradedCards}/{totalCards} graded
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="font-medium text-gray-900">{formatDate(submission.date_submitted)}</p>
            </div>
            {submission.date_returned && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Returned</p>
                <p className="font-medium text-gray-900">{formatDate(submission.date_returned)}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Grading Fee</p>
              <p className="font-medium text-gray-900">{formatCurrency(Number(submission.grading_fee) || 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping</p>
              <p className="font-medium text-gray-900">{formatCurrency(Number(submission.shipping_to_cost) || 0)}</p>
            </div>
          </div>

          {submission.notes && (
            <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
              {submission.notes}
            </p>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Items ({submission.items?.length || 0})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Declared</th>
                  <th className="px-3 py-2 font-medium text-center">Grade</th>
                  <th className="px-3 py-2 font-medium text-right">Cert #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submission.items?.map((item: CardGradingItem) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.player_name || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {formatCurrency(Number(item.declared_value) || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.grade_value !== null ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          Number(item.grade_value) >= 9 ? 'bg-green-100 text-green-700' :
                          Number(item.grade_value) >= 7 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          <Award size={12} />
                          {item.grade_value}
                          {item.auto_grade && ` / ${item.auto_grade}`}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {item.cert_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}