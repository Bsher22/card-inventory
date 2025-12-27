/**
 * Consignments API Client
 */

import { apiRequest, buildQueryString } from './base';
import type {
  Consigner,
  ConsignerCreate,
  ConsignerUpdate,
  ConsignerStats,
  Consignment,
  ConsignmentCreate,
  ConsignmentReturn,
  PendingConsignmentsValue,
} from '../types';

// ============================================
// CONSIGNERS
// ============================================

export async function getConsigners(params?: {
  active_only?: boolean;
  skip?: number;
  limit?: number;
}): Promise<Consigner[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Consigner[]>(`/consigners${query}`);
}

export async function getConsigner(id: string): Promise<Consigner> {
  return apiRequest<Consigner>(`/consigners/${id}`);
}

export async function getConsignerStats(id: string): Promise<ConsignerStats> {
  return apiRequest<ConsignerStats>(`/consigners/${id}/stats`);
}

export async function createConsigner(data: ConsignerCreate): Promise<Consigner> {
  return apiRequest<Consigner>('/consigners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateConsigner(id: string, data: ConsignerUpdate): Promise<Consigner> {
  return apiRequest<Consigner>(`/consigners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================
// CONSIGNMENTS
// ============================================

export async function getConsignments(params?: {
  consigner_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<Consignment[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Consignment[]>(`/consignments${query}`);
}

export async function getConsignment(id: string): Promise<Consignment> {
  return apiRequest<Consignment>(`/consignments/${id}`);
}

export async function getPendingConsignmentsValue(): Promise<PendingConsignmentsValue> {
  return apiRequest<PendingConsignmentsValue>('/consignments/pending-value');
}

export async function createConsignment(data: ConsignmentCreate): Promise<Consignment> {
  return apiRequest<Consignment>('/consignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function processConsignmentReturn(id: string, data: ConsignmentReturn): Promise<Consignment> {
  return apiRequest<Consignment>(`/consignments/${id}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markConsignmentFeePaid(id: string, feePaidDate?: string): Promise<Consignment> {
  const params = feePaidDate ? `?fee_paid_date=${feePaidDate}` : '';
  return apiRequest<Consignment>(`/consignments/${id}/mark-paid${params}`, {
    method: 'POST',
  });
}

export const consignmentsApi = {
  // Consigners
  getConsigners,
  getConsigner,
  getConsignerStats,
  createConsigner,
  updateConsigner,
  // Consignments
  getConsignments,
  getConsignment,
  getPendingConsignmentsValue,
  createConsignment,
  processConsignmentReturn,
  markConsignmentFeePaid,
};
