/**
 * Card Grading Page
 * 
 * Manages PSA/BGS/SGC card grading submissions
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Award,
  TrendingUp,
  DollarSign,
  BarChart3,
  ChevronRight,
} from 'lucide-react';

import { cardGradingApi } from '@/api/gradingApi';
import type { CardGradingSubmission, CardGradingStats } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  received: 'bg-purple-100 text-purple-800',
  grading: 'bg-orange-100 text-orange-800',
  shipped_back: 'bg-indigo-100 text-indigo-800',
  returned: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  received: <Package className="h-4 w-4" />,
  grading: <Award className="h-4 w-4" />,
  shipped_back: <Truck className="h-4 w-4" />,
  returned: <CheckCircle className="h-4 w-4" />,
};

export default function CardGradingPage() {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch submissions
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['card-grading-submissions'],
    queryFn: () => cardGradingApi.getSubmissions(),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['card-grading-stats'],
    queryFn: () => cardGradingApi.getStats(),
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['grading-companies'],
    queryFn: () => cardGradingApi.getCompanies(),
  });

  // Fetch pending by company
  const { data: pendingByCompany = [] } = useQuery({
    queryKey: ['card-grading-pending-by-company'],
    queryFn: () => cardGradingApi.getPendingByCompany(),
  });

  // Group submissions by status
  const activeSubmissions = submissions.filter(s => 
    ['pending', 'shipped', 'received', 'grading', 'shipped_back'].includes(s.status)
  );
  const completedSubmissions = submissions.filter(s => s.status === 'returned');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Card Grading</h1>
          <p className="text-gray-500">PSA, BGS, SGC submissions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Submission
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Out for Grading</p>
                  <p className="text-2xl font-bold">{stats.cards_out_for_grading}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Fees</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.pending_fees)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Graded</p>
                  <p className="text-2xl font-bold">{stats.total_graded}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gem Rate (PSA 10)</p>
                  <p className="text-2xl font-bold">{stats.gem_rate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending by Company */}
      {pendingByCompany.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending by Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingByCompany.map((company) => (
                <div 
                  key={company.company_id} 
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{company.company_code}</p>
                    <p className="text-sm text-gray-500">
                      {company.pending_count} submission{company.pending_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(company.pending_value)}</p>
                    {company.oldest_submission_date && (
                      <p className="text-xs text-gray-400">
                        Since {formatDate(company.oldest_submission_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <SubmissionsList 
            submissions={activeSubmissions} 
            onSelect={setSelectedSubmission}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <SubmissionsList 
            submissions={completedSubmissions} 
            onSelect={setSelectedSubmission}
          />
        </TabsContent>
      </Tabs>

      {/* Grade Distribution */}
      {stats && Object.keys(stats.grade_distribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(stats.grade_distribution)
                .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                .map(([grade, count]) => {
                  const maxCount = Math.max(...Object.values(stats.grade_distribution));
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={grade} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs mt-1">{grade}</span>
                      <span className="text-xs text-gray-500">{count}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Submissions List Component
function SubmissionsList({ 
  submissions, 
  onSelect 
}: { 
  submissions: CardGradingSubmission[];
  onSelect: (id: string) => void;
}) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No submissions found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <Card 
          key={submission.id} 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onSelect(submission.id)}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${statusColors[submission.status]}`}>
                  {statusIcons[submission.status]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{submission.company_code}</span>
                    {submission.submission_number && (
                      <span className="text-gray-500">#{submission.submission_number}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {submission.total_cards} card{submission.total_cards !== 1 ? 's' : ''} • 
                    Submitted {formatDate(submission.date_submitted)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge className={statusColors[submission.status]}>
                    {submission.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(submission.total_declared_value)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Progress indicator for active submissions */}
            {submission.status !== 'returned' && submission.status !== 'cancelled' && (
              <div className="mt-3 flex items-center gap-1">
                {['pending', 'shipped', 'received', 'grading', 'shipped_back', 'returned'].map((step, idx) => {
                  const currentIdx = ['pending', 'shipped', 'received', 'grading', 'shipped_back', 'returned'].indexOf(submission.status);
                  const isComplete = idx <= currentIdx;
                  return (
                    <div 
                      key={step}
                      className={`h-1 flex-1 rounded ${isComplete ? 'bg-blue-500' : 'bg-gray-200'}`}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}