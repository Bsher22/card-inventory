// src/api/consignmentsApi.ts
// API client for consignment operations

import { apiRequest, buildQueryString } from './base';
import type {
  Consigner,
  ConsignerCreate,
  ConsignerUpdate,
  ConsignerSummary,
  Consignment,
  ConsignmentCreate,
  ConsignmentUpdate,
  ConsignmentItem,
  ConsignmentItemCreate,
} from '../types/consignment';

// ============================================
// CONSIGNER STATS TYPE
// ============================================

export interface ConsignerStats {
  total_consignments: number;
  total_cards_sent: number;
  cards_signed: number;
  cards_refused: number;
  cards_pending: number;
  total_fees_paid: number;
  success_rate: number;
}

export interface PendingConsignmentsValue {
  total_cards_out: number;
  total_pending_fees: number;
  consignments_out: number;
}

export interface ConsignmentReturn {
  date_returned: string;
  items: Array<{
    consignment_item_id: string;
    status: 'signed' | 'rejected' | 'lost';
    date_signed?: string;
    inscription?: string;
    condition_notes?: string;
  }>;
}

// ============================================
// CONSIGNERS API
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
// CONSIGNMENTS API
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

export async function updateConsignment(id: string, data: ConsignmentUpdate): Promise<Consignment> {
  return apiRequest<Consignment>(`/consignments/${id}`, {
    method: 'PATCH',
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

// ============================================
// CONSIGNMENT ITEMS API
// ============================================

export async function getConsignmentItems(consignmentId: string): Promise<ConsignmentItem[]> {
  return apiRequest<ConsignmentItem[]>(`/consignments/${consignmentId}/items`);
}

export async function addConsignmentItem(
  consignmentId: string, 
  data: ConsignmentItemCreate
): Promise<ConsignmentItem> {
  return apiRequest<ConsignmentItem>(`/consignments/${consignmentId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// EXPORT BARREL
// ============================================

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
  updateConsignment,
  processConsignmentReturn,
  markConsignmentFeePaid,
  // Items
  getConsignmentItems,
  addConsignmentItem,
};

export default consignmentsApi;