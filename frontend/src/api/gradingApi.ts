/**
 * Grading API Client - FIXED to match backend endpoints
 */

import { apiRequest, buildQueryString } from './base';
import type {
  GradingCompanyWithLevels,
  GradingServiceLevel,
  GradingSubmission,
  GradingSubmissionCreate,
  SubmissionGradeResults,
  SubmissionStatusUpdate,
  GradingStats,
  PendingByCompany,
} from '../types';

// ============================================
// GRADING COMPANIES
// ============================================

export async function getGradingCompanies(activeOnly = true): Promise<GradingCompanyWithLevels[]> {
  return apiRequest<GradingCompanyWithLevels[]>(`/grading/companies?active_only=${activeOnly}`);
}

export async function getServiceLevels(companyId: string, activeOnly = true): Promise<GradingServiceLevel[]> {
  return apiRequest<GradingServiceLevel[]>(
    `/grading/companies/${companyId}/service-levels?active_only=${activeOnly}`
  );
}

// ============================================
// GRADING SUBMISSIONS
// ============================================

export async function getGradingSubmissions(params?: {
  grading_company_id?: string;  // FIXED: was company_id
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<GradingSubmission[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<GradingSubmission[]>(`/grading/submissions${query}`);
}

export async function getGradingSubmission(id: string): Promise<GradingSubmission> {
  return apiRequest<GradingSubmission>(`/grading/submissions/${id}`);
}

export async function getGradingStats(): Promise<GradingStats> {
  return apiRequest<GradingStats>('/grading/submissions/stats');
}

export async function getPendingByCompany(): Promise<PendingByCompany[]> {
  return apiRequest<PendingByCompany[]>('/grading/submissions/pending-by-company');
}

export async function createGradingSubmission(data: GradingSubmissionCreate): Promise<GradingSubmission> {
  return apiRequest<GradingSubmission>('/grading/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubmissionStatus(
  id: string,
  data: SubmissionStatusUpdate
): Promise<GradingSubmission> {
  return apiRequest<GradingSubmission>(`/grading/submissions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function processGradedItems(id: string, data: SubmissionGradeResults): Promise<GradingSubmission> {
  return apiRequest<GradingSubmission>(`/grading/submissions/${id}/grades`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const gradingApi = {
  // Companies
  getGradingCompanies,
  getServiceLevels,
  // Submissions
  getGradingSubmissions,
  getGradingSubmission,
  getGradingStats,
  getPendingByCompany,
  createGradingSubmission,
  updateSubmissionStatus,
  processGradedItems,
};
