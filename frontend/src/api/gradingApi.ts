/**
 * Grading & Signature Authentication API Client
 * 
 * Consolidated API for:
 * - Card Grading (PSA/BGS/SGC) - numeric grades
 * - Signature Authentication (PSA/DNA, JSA) - autograph verification
 * 
 * Replaces: grading.ts, gradingApi.ts
 */

import { apiRequest, buildQueryString } from './base';
import type {
  // Shared types
  GradingCompanyWithLevels,
  GradingServiceLevel,
  PendingByCompany,
  // Card Grading types
  CardGradingSubmission,
  CardGradingSubmissionCreate,
  CardGradingStatusUpdate,
  CardGradingResultsSubmit,
  CardGradingStats,
  // Signature Authentication types
  AuthSubmission,
  AuthSubmissionCreate,
  AuthStatusUpdate,
  AuthResultsSubmit,
  AuthStats,
  AuthItem,
} from '../types';

// ============================================
// CARD GRADING - Companies & Service Levels
// ============================================

export async function getGradingCompanies(activeOnly = true): Promise<GradingCompanyWithLevels[]> {
  return apiRequest<GradingCompanyWithLevels[]>(`/grading/companies?active_only=${activeOnly}`);
}

export async function getGradingServiceLevels(companyId: string, activeOnly = true): Promise<GradingServiceLevel[]> {
  return apiRequest<GradingServiceLevel[]>(
    `/grading/companies/${companyId}/service-levels?active_only=${activeOnly}`
  );
}

// ============================================
// CARD GRADING - Submissions
// ============================================

export async function getGradingSubmissions(params?: {
  company_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<CardGradingSubmission[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<CardGradingSubmission[]>(`/grading/submissions${query}`);
}

export async function getGradingSubmission(id: string): Promise<CardGradingSubmission> {
  return apiRequest<CardGradingSubmission>(`/grading/submissions/${id}`);
}

export async function createGradingSubmission(data: CardGradingSubmissionCreate): Promise<CardGradingSubmission> {
  return apiRequest<CardGradingSubmission>('/grading/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGradingStatus(
  id: string,
  data: CardGradingStatusUpdate
): Promise<CardGradingSubmission> {
  return apiRequest<CardGradingSubmission>(`/grading/submissions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function submitGradingResults(
  id: string,
  data: CardGradingResultsSubmit
): Promise<CardGradingSubmission> {
  return apiRequest<CardGradingSubmission>(`/grading/submissions/${id}/results`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteGradingSubmission(id: string): Promise<void> {
  return apiRequest<void>(`/grading/submissions/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// CARD GRADING - Stats
// ============================================

export async function getGradingStats(): Promise<CardGradingStats> {
  return apiRequest<CardGradingStats>('/grading/submissions/stats');
}

export async function getGradingPendingByCompany(): Promise<PendingByCompany[]> {
  return apiRequest<PendingByCompany[]>('/grading/submissions/pending-by-company');
}

// ============================================
// SIGNATURE AUTH - Companies & Service Levels
// ============================================

export async function getAuthCompanies(activeOnly = true): Promise<GradingCompanyWithLevels[]> {
  return apiRequest<GradingCompanyWithLevels[]>(`/signature-auth/companies?active_only=${activeOnly}`);
}

export async function getAuthServiceLevels(companyId: string, activeOnly = true): Promise<GradingServiceLevel[]> {
  return apiRequest<GradingServiceLevel[]>(
    `/signature-auth/companies/${companyId}/service-levels?active_only=${activeOnly}`
  );
}

// ============================================
// SIGNATURE AUTH - Submissions
// ============================================

export async function getAuthSubmissions(params?: {
  company_id?: string;
  status?: string;
  item_type?: string; // 'card', 'memorabilia', 'collectible'
  skip?: number;
  limit?: number;
}): Promise<AuthSubmission[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<AuthSubmission[]>(`/signature-auth/submissions${query}`);
}

export async function getAuthSubmission(id: string): Promise<AuthSubmission> {
  return apiRequest<AuthSubmission>(`/signature-auth/submissions/${id}`);
}

export async function createAuthSubmission(data: AuthSubmissionCreate): Promise<AuthSubmission> {
  return apiRequest<AuthSubmission>('/signature-auth/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAuthStatus(id: string, data: AuthStatusUpdate): Promise<AuthSubmission> {
  return apiRequest<AuthSubmission>(`/signature-auth/submissions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function submitAuthResults(id: string, data: AuthResultsSubmit): Promise<AuthSubmission> {
  return apiRequest<AuthSubmission>(`/signature-auth/submissions/${id}/results`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAuthSubmission(id: string): Promise<void> {
  return apiRequest<void>(`/signature-auth/submissions/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// SIGNATURE AUTH - Stats
// ============================================

export async function getAuthStats(): Promise<AuthStats> {
  return apiRequest<AuthStats>('/signature-auth/submissions/stats');
}

export async function getAuthPendingByCompany(): Promise<PendingByCompany[]> {
  return apiRequest<PendingByCompany[]>('/signature-auth/submissions/pending-by-company');
}

// ============================================
// SIGNATURE AUTH - Items by Type (for tabs)
// ============================================

export async function getAuthCardItems(params?: {
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AuthItem[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<AuthItem[]>(`/signature-auth/items/cards${query}`);
}

export async function getAuthMemorabiliaItems(params?: {
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AuthItem[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<AuthItem[]>(`/signature-auth/items/memorabilia${query}`);
}

export async function getAuthCollectibleItems(params?: {
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AuthItem[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<AuthItem[]>(`/signature-auth/items/collectibles${query}`);
}

// ============================================
// EXPORTED API OBJECTS
// ============================================

export const cardGradingApi = {
  // Companies
  getCompanies: getGradingCompanies,
  getServiceLevels: getGradingServiceLevels,
  // Submissions
  getSubmissions: getGradingSubmissions,
  getSubmission: getGradingSubmission,
  createSubmission: createGradingSubmission,
  updateStatus: updateGradingStatus,
  submitResults: submitGradingResults,
  deleteSubmission: deleteGradingSubmission,
  // Stats
  getStats: getGradingStats,
  getPendingByCompany: getGradingPendingByCompany,
};

export const signatureAuthApi = {
  // Companies
  getCompanies: getAuthCompanies,
  getServiceLevels: getAuthServiceLevels,
  // Submissions
  getSubmissions: getAuthSubmissions,
  getSubmission: getAuthSubmission,
  createSubmission: createAuthSubmission,
  updateStatus: updateAuthStatus,
  submitResults: submitAuthResults,
  deleteSubmission: deleteAuthSubmission,
  // Stats
  getStats: getAuthStats,
  getPendingByCompany: getAuthPendingByCompany,
  // Items by type (for tabs)
  getCardItems: getAuthCardItems,
  getMemorabiliaItems: getAuthMemorabiliaItems,
  getCollectibleItems: getAuthCollectibleItems,
};

// Legacy export for backwards compatibility
export const gradingApi = cardGradingApi;