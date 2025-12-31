/**
 * Submitters API Client
 * 
 * API functions for managing third-party submission services.
 */

import { apiRequest, buildQueryString } from './base';
import type {
  Submitter,
  SubmitterCreate,
  SubmitterUpdate,
  SubmitterSummary,
  SubmitterStats,
} from '../types';

// ============================================
// GET SUBMITTERS
// ============================================

export async function getSubmitters(params?: {
  active_only?: boolean;
  grading_only?: boolean;
  auth_only?: boolean;
}): Promise<Submitter[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Submitter[]>(`/submitters${query}`);
}

export async function getSubmittersSummary(params?: {
  grading_only?: boolean;
  auth_only?: boolean;
}): Promise<SubmitterSummary[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<SubmitterSummary[]>(`/submitters/summary${query}`);
}

export async function getDefaultSubmitter(): Promise<SubmitterSummary | null> {
  return apiRequest<SubmitterSummary | null>('/submitters/default');
}

export async function getSubmitter(id: string): Promise<Submitter> {
  return apiRequest<Submitter>(`/submitters/${id}`);
}

export async function getSubmitterStats(id: string): Promise<SubmitterStats> {
  return apiRequest<SubmitterStats>(`/submitters/${id}/stats`);
}

// ============================================
// CREATE / UPDATE / DELETE
// ============================================

export async function createSubmitter(data: SubmitterCreate): Promise<Submitter> {
  return apiRequest<Submitter>('/submitters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubmitter(id: string, data: SubmitterUpdate): Promise<Submitter> {
  return apiRequest<Submitter>(`/submitters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSubmitter(id: string): Promise<void> {
  return apiRequest<void>(`/submitters/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultSubmitter(id: string): Promise<Submitter> {
  return apiRequest<Submitter>(`/submitters/${id}/set-default`, {
    method: 'POST',
  });
}

// ============================================
// EXPORT BARREL
// ============================================

export const submittersApi = {
  getSubmitters,
  getSubmittersSummary,
  getDefaultSubmitter,
  getSubmitter,
  getSubmitterStats,
  createSubmitter,
  updateSubmitter,
  deleteSubmitter,
  setDefaultSubmitter,
};

export default submittersApi;