/**
 * eBay Consignments API client
 *
 * Covers:
 *   - Consigners (clients whose items we sell on eBay)
 *   - Consignment agreements + items
 *   - Monthly payout statements
 */

import { API_BASE, apiRequest, buildQueryString } from './base';
import { getAuthToken } from '../context/AuthContext';

// ============================================
// Types
// ============================================

export interface EbayConsigner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  default_fee_percent: string | null;
  payment_method: string | null;
  payment_details: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EbayConsignerCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  default_fee_percent?: string | number | null;
  payment_method?: string | null;
  payment_details?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export type EbayConsignerUpdate = Partial<EbayConsignerCreate>;

export interface EbayConsignerStats {
  consigner_id: string;
  total_agreements: number;
  active_agreements: number;
  items_listed: number;
  items_sold: number;
  items_pending: number;
  lifetime_gross: string;
  lifetime_idgas_fees: string;
  lifetime_payout: string;
  unpaid_balance: string;
}

export type EbayItemStatus =
  | 'pending'
  | 'listed'
  | 'sold'
  | 'unsold'
  | 'returned'
  | 'cancelled';

export interface EbayConsignmentItem {
  id: string;
  agreement_id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  minimum_price: string;
  status: EbayItemStatus;
  ebay_listing_id: string | null;
  listed_at: string | null;
  sold_at: string | null;
  sold_price: string | null;
  ebay_fees: string;
  payment_fees: string;
  shipping_cost: string;
  buyer_info: string | null;
  payout_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EbayConsignmentItemWithContext extends EbayConsignmentItem {
  agreement_number: string | null;
  agreement_status: string | null;
  fee_percent: string | null;
  consigner_id: string | null;
  consigner_name: string | null;
}

export interface EbayConsignmentItemCreate {
  title: string;
  description?: string | null;
  category?: string | null;
  condition?: string | null;
  minimum_price: string | number;
  notes?: string | null;
}

export type EbayConsignmentItemUpdate = Partial<EbayConsignmentItemCreate> & {
  status?: EbayItemStatus;
  ebay_listing_id?: string | null;
  listed_at?: string | null;
};

export interface EbayItemSaleInput {
  sold_price: string | number;
  sold_at?: string | null;
  ebay_fees?: string | number;
  payment_fees?: string | number;
  shipping_cost?: string | number;
  buyer_info?: string | null;
  notes?: string | null;
}

export type EbayAgreementStatus =
  | 'draft'
  | 'sent'
  | 'signed'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface EbayConsignmentAgreement {
  id: string;
  consigner_id: string;
  agreement_number: string | null;
  agreement_date: string;
  fee_percent: string;
  status: EbayAgreementStatus;
  client_signature_name: string | null;
  client_signed_at: string | null;
  idgas_signature_name: string | null;
  idgas_signed_at: string | null;
  pdf_path: string | null;
  docusign_envelope_id: string | null;
  docusign_status: string | null;
  notes: string | null;
  consigner_name?: string | null;
  items: EbayConsignmentItem[];
  created_at: string;
  updated_at: string;
}

export interface EbayConsignmentAgreementCreate {
  consigner_id: string;
  agreement_date: string;
  fee_percent: string | number;
  items?: EbayConsignmentItemCreate[];
  notes?: string | null;
}

export interface EbayConsignmentAgreementUpdate {
  agreement_date?: string;
  fee_percent?: string | number;
  status?: EbayAgreementStatus;
  client_signature_name?: string | null;
  client_signed_at?: string | null;
  idgas_signature_name?: string | null;
  idgas_signed_at?: string | null;
  notes?: string | null;
}

export interface EbayAgreementSignInput {
  party: 'client' | 'idgas';
  signature_name: string;
}

export interface EbayPayoutPreview {
  consigner_id: string;
  period_year: number;
  period_month: number;
  total_gross: string;
  total_idgas_fee: string;
  total_ebay_fees: string;
  total_other_fees: string;
  net_payout: string;
  item_count: number;
  items: EbayConsignmentItem[];
}

export interface EbayConsignmentPayout {
  id: string;
  consigner_id: string;
  consigner_name?: string | null;
  period_year: number;
  period_month: number;
  total_gross: string;
  total_idgas_fee: string;
  total_ebay_fees: string;
  total_other_fees: string;
  net_payout: string;
  item_count: number;
  is_paid: boolean;
  paid_at: string | null;
  paid_method: string | null;
  paid_reference: string | null;
  statement_pdf_path: string | null;
  notes: string | null;
  items: EbayConsignmentItem[];
  created_at: string;
  updated_at: string;
}

export interface EbayPayoutGenerateInput {
  consigner_id: string;
  period_year: number;
  period_month: number;
  notes?: string | null;
}

export interface EbayPayoutMarkPaidInput {
  paid_at?: string;
  paid_method?: string;
  paid_reference?: string;
}

// ============================================
// Consigner endpoints
// ============================================

export const listEbayConsigners = (params?: { active_only?: boolean; skip?: number; limit?: number }) =>
  apiRequest<EbayConsigner[]>(`/ebay-consigners${buildQueryString(params || {})}`);

export const getEbayConsigner = (id: string) =>
  apiRequest<EbayConsigner>(`/ebay-consigners/${id}`);

export const getEbayConsignerStats = (id: string) =>
  apiRequest<EbayConsignerStats>(`/ebay-consigners/${id}/stats`);

export const createEbayConsigner = (data: EbayConsignerCreate) =>
  apiRequest<EbayConsigner>(`/ebay-consigners`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEbayConsigner = (id: string, data: EbayConsignerUpdate) =>
  apiRequest<EbayConsigner>(`/ebay-consigners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// ============================================
// Agreement endpoints
// ============================================

export const listEbayAgreements = (params?: {
  consigner_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}) =>
  apiRequest<EbayConsignmentAgreement[]>(
    `/ebay-consignment-agreements${buildQueryString(params || {})}`,
  );

export const getEbayAgreement = (id: string) =>
  apiRequest<EbayConsignmentAgreement>(`/ebay-consignment-agreements/${id}`);

export const createEbayAgreement = (data: EbayConsignmentAgreementCreate) =>
  apiRequest<EbayConsignmentAgreement>(`/ebay-consignment-agreements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEbayAgreement = (id: string, data: EbayConsignmentAgreementUpdate) =>
  apiRequest<EbayConsignmentAgreement>(`/ebay-consignment-agreements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteEbayAgreement = (id: string) =>
  apiRequest<void>(`/ebay-consignment-agreements/${id}`, { method: 'DELETE' });

export const signEbayAgreement = (id: string, data: EbayAgreementSignInput) =>
  apiRequest<EbayConsignmentAgreement>(`/ebay-consignment-agreements/${id}/sign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

/**
 * Build a PDF download URL (browser handles auth via Bearer header, but this
 * endpoint returns a PDF directly so we expose a fetch helper for downloads).
 */
export const downloadAgreementPdf = async (id: string): Promise<Blob> => {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/ebay-consignment-agreements/${id}/agreement.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
  return res.blob();
};

// ============================================
// Item endpoints
// ============================================

export const listEbayItems = (params?: {
  consigner_id?: string;
  agreement_id?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) =>
  apiRequest<EbayConsignmentItemWithContext[]>(
    `/ebay-consignment-items${buildQueryString(params || {})}`,
  );

export const addEbayItem = (agreementId: string, data: EbayConsignmentItemCreate) =>
  apiRequest<EbayConsignmentItem>(
    `/ebay-consignment-agreements/${agreementId}/items`,
    { method: 'POST', body: JSON.stringify(data) },
  );

export const updateEbayItem = (itemId: string, data: EbayConsignmentItemUpdate) =>
  apiRequest<EbayConsignmentItem>(`/ebay-consignment-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteEbayItem = (itemId: string) =>
  apiRequest<void>(`/ebay-consignment-items/${itemId}`, { method: 'DELETE' });

export const recordEbayItemSale = (itemId: string, data: EbayItemSaleInput) =>
  apiRequest<EbayConsignmentItem>(`/ebay-consignment-items/${itemId}/sale`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ============================================
// Payout endpoints
// ============================================

export const listEbayPayouts = (params?: {
  consigner_id?: string;
  year?: number;
  is_paid?: boolean;
  skip?: number;
  limit?: number;
}) =>
  apiRequest<EbayConsignmentPayout[]>(
    `/ebay-consignment-payouts${buildQueryString(params || {})}`,
  );

export const previewEbayPayout = (consignerId: string, year: number, month: number) =>
  apiRequest<EbayPayoutPreview>(
    `/ebay-consignment-payouts/preview${buildQueryString({
      consigner_id: consignerId,
      year,
      month,
    })}`,
  );

export const generateEbayPayout = (data: EbayPayoutGenerateInput) =>
  apiRequest<EbayConsignmentPayout>(`/ebay-consignment-payouts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getEbayPayout = (id: string) =>
  apiRequest<EbayConsignmentPayout>(`/ebay-consignment-payouts/${id}`);

export const markEbayPayoutPaid = (id: string, data: EbayPayoutMarkPaidInput) =>
  apiRequest<EbayConsignmentPayout>(`/ebay-consignment-payouts/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteEbayPayout = (id: string) =>
  apiRequest<void>(`/ebay-consignment-payouts/${id}`, { method: 'DELETE' });

export const downloadPayoutStatementPdf = async (id: string): Promise<Blob> => {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/ebay-consignment-payouts/${id}/statement.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Statement download failed (${res.status})`);
  return res.blob();
};

// ============================================
// Barrel
// ============================================

export const ebayConsignmentsApi = {
  // Consigners
  listConsigners: listEbayConsigners,
  getConsigner: getEbayConsigner,
  getConsignerStats: getEbayConsignerStats,
  createConsigner: createEbayConsigner,
  updateConsigner: updateEbayConsigner,
  // Agreements
  listAgreements: listEbayAgreements,
  getAgreement: getEbayAgreement,
  createAgreement: createEbayAgreement,
  updateAgreement: updateEbayAgreement,
  deleteAgreement: deleteEbayAgreement,
  signAgreement: signEbayAgreement,
  downloadAgreementPdf,
  // Items
  listItems: listEbayItems,
  addItem: addEbayItem,
  updateItem: updateEbayItem,
  deleteItem: deleteEbayItem,
  recordSale: recordEbayItemSale,
  // Payouts
  listPayouts: listEbayPayouts,
  previewPayout: previewEbayPayout,
  generatePayout: generateEbayPayout,
  getPayout: getEbayPayout,
  markPayoutPaid: markEbayPayoutPaid,
  deletePayout: deleteEbayPayout,
  downloadPayoutStatementPdf,
};

export default ebayConsignmentsApi;
