import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Award, Calendar, DollarSign, Truck, 
  ChevronDown, ChevronRight, Check, Clock,
  AlertCircle, Star, BarChart3
} from 'lucide-react';
import { api } from '../api/client';
import type { GradingSubmission, GradingStats, PendingByCompany } from '../types';

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  preparing: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Preparing' },
  shipped: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Shipped' },
  received: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Received' },
  grading: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Grading' },
  shipped_back: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Shipped Back' },
  complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

export default function GradingSubmissions() {
  const queryClient = useQueryClient();
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['grading-companies'],
    queryFn: () => api.getGradingCompanies(),
  });

  const { data: stats } = useQuery({
    queryKey: ['grading-stats'],
    queryFn: () => api.getGradingStats(),
  });

  const { data: pendingByCompany } = useQuery({
    queryKey: ['pending-by-company'],
    queryFn: () => api.getPendingByCompany(),
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['grading-submissions', filterCompany, filterStatus],
    queryFn: () => api.getGradingSubmissions({
      grading_company_id: filterCompany || undefined,
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Award size={18} />
              <span className="font-medium">Cards Out</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.cards_out_for_grading}</p>
            <p className="text-sm text-purple-600">{stats.pending_submissions} submissions</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <DollarSign size={18} />
              <span className="font-medium">Pending Fees</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.pending_fees)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <BarChart3 size={18} />
              <span className="font-medium">Total Graded</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{stats.total_graded}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <Star size={18} />
              <span className="font-medium">Gem Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.gem_rate}%</p>
            <p className="text-sm text-green-600">PSA 10 / BGS 10</p>
          </div>
        </div>
      )}

      {/* Pending by Company */}
      {pendingByCompany && pendingByCompany.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Pending by Company</h3>
          <div className="flex flex-wrap gap-3">
            {pendingByCompany.map((company) => (
              <div key={company.code} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-900">{company.code}</span>
                <span className="text-gray-500">{company.cards_out} cards</span>
                <span className="text-gray-400">({company.pending_submissions} subs)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      {stats && Object.keys(stats.grade_distribution).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Grade Distribution</h3>
          <div className="flex items-end gap-1 h-24">
            {['10', '9.5', '9', '8.5', '8', '7', '6', '5', '4', '3', '2', '1'].map((grade) => {
              const count = stats.grade_distribution[grade] || 0;
              const maxCount = Math.max(...Object.values(stats.grade_distribution));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={grade} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t transition-all ${
                      grade === '10' ? 'bg-green-500' :
                      parseFloat(grade) >= 9 ? 'bg-blue-500' :
                      parseFloat(grade) >= 7 ? 'bg-amber-500' :
                      'bg-gray-400'
                    }`}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${grade}: ${count}`}
                  />
                  <span className="text-xs text-gray-500 mt-1">{grade}</span>
                </div>
              );
            })}
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
            {companies?.map((c) => (
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
            <option value="preparing">Preparing</option>
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
            <option value="grading">Grading</option>
            <option value="shipped_back">Shipped Back</option>
            <option value="complete">Complete</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {submissions?.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isExpanded={expandedId === submission.id}
              onToggle={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['grading-submissions'] });
                queryClient.invalidateQueries({ queryKey: ['grading-stats'] });
              }}
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
  onUpdate,
}: {
  submission: GradingSubmission;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const status = STATUS_STYLES[submission.status] || STATUS_STYLES.preparing;
  const companyName = submission.grading_company?.name || 'Unknown';

  const totalFees = submission.grading_fee + submission.shipping_to_cost + 
    submission.shipping_return_cost + submission.insurance_cost;

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
            <div className="p-2 bg-gray-100 rounded-lg">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">
                  {companyName}
                  {submission.service_level && ` - ${submission.service_level.name}`}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Submitted {formatDate(submission.date_submitted)}
                </span>
                {submission.submission_number && (
                  <span>#{submission.submission_number}</span>
                )}
                {submission.reference_number && (
                  <span>Ref: {submission.reference_number}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-gray-900">{submission.total_cards} cards</p>
            {submission.cards_graded > 0 && (
              <p className="text-sm text-green-600">{submission.cards_graded} graded</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 flex items-center gap-2">
          <TimelineStep 
            label="Submitted" 
            date={submission.date_submitted}
            isComplete={true}
          />
          <div className="flex-1 h-0.5 bg-gray-200" />
          <TimelineStep 
            label="Received" 
            date={submission.date_received}
            isComplete={!!submission.date_received}
          />
          <div className="flex-1 h-0.5 bg-gray-200" />
          <TimelineStep 
            label="Graded" 
            date={submission.date_graded}
            isComplete={!!submission.date_graded}
          />
          <div className="flex-1 h-0.5 bg-gray-200" />
          <TimelineStep 
            label="Returned" 
            date={submission.date_returned}
            isComplete={!!submission.date_returned}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Grading Fee</p>
              <p className="font-bold text-gray-900">{formatCurrency(submission.grading_fee)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping To</p>
              <p className="font-bold text-gray-900">{formatCurrency(submission.shipping_to_cost)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Shipping Back</p>
              <p className="font-bold text-gray-900">{formatCurrency(submission.shipping_return_cost)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Insurance</p>
              <p className="font-bold text-gray-900">{formatCurrency(submission.insurance_cost)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Cost</p>
              <p className="font-bold text-blue-900">{formatCurrency(totalFees)}</p>
            </div>
          </div>

          {/* Declared Value */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              <DollarSign size={14} className="inline mr-1" />
              Total Declared Value: {formatCurrency(submission.total_declared_value)}
            </p>
          </div>

          {/* Tracking Info */}
          {(submission.shipping_to_tracking || submission.shipping_return_tracking) && (
            <div className="flex gap-4 mb-6 text-sm">
              {submission.shipping_to_tracking && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} />
                  To: {submission.shipping_to_tracking}
                </div>
              )}
              {submission.shipping_return_tracking && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} />
                  Return: {submission.shipping_return_tracking}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <h4 className="font-medium text-gray-900 mb-3">Cards ({submission.items.length})</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium text-center">Signed</th>
                  <th className="px-3 py-2 font-medium text-right">Value</th>
                  <th className="px-3 py-2 font-medium text-center">Grade</th>
                  <th className="px-3 py-2 font-medium">Cert #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submission.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-500">{item.line_number}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {item.checklist?.player?.name || item.checklist?.player_name_raw || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.was_signed ? (
                        <span className="text-purple-600">✓</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {item.declared_value ? formatCurrency(item.declared_value) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.grade_value ? (
                        <span className={`font-bold ${
                          item.grade_value >= 10 ? 'text-green-600' :
                          item.grade_value >= 9 ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {item.grade_value}
                          {item.auto_grade && ` / ${item.auto_grade}`}
                        </span>
                      ) : (
                        <GradeStatusBadge status={item.status} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                      {item.cert_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {submission.status === 'preparing' && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark as Shipped
              </button>
            )}
            {submission.status === 'shipped_back' && (
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Enter Grades
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineStep({ 
  label, 
  date, 
  isComplete 
}: { 
  label: string; 
  date: string | null; 
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-3 h-3 rounded-full ${
        isComplete ? 'bg-green-500' : 'bg-gray-300'
      }`} />
      <span className={`text-xs mt-1 ${
        isComplete ? 'text-gray-700' : 'text-gray-400'
      }`}>
        {label}
      </span>
      {date && (
        <span className="text-xs text-gray-400">
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

function GradeStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-600' },
    graded: { bg: 'bg-green-100', text: 'text-green-700' },
    authentic: { bg: 'bg-blue-100', text: 'text-blue-700' },
    altered: { bg: 'bg-red-100', text: 'text-red-700' },
    counterfeit: { bg: 'bg-red-100', text: 'text-red-700' },
    ungradeable: { bg: 'bg-amber-100', text: 'text-amber-700' },
    lost: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  const style = styles[status] || styles.pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}
