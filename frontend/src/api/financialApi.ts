/**
 * Financial API Client
 * Handles Purchases, Sales, and Analytics
 */

import { apiGet, apiPost, apiDelete } from './base';
import type {
  Purchase,
  PurchaseCreate,
  Sale,
  SaleCreate,
  SalesAnalytics,
  PurchaseAnalytics,
  DashboardStats,
} from '../types';

// ============================================
// PURCHASES
// ============================================

export async function getPurchases(params?: {
  vendor?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}): Promise<Purchase[]> {
  const searchParams = new URLSearchParams();
  if (params?.vendor) searchParams.set('vendor', params.vendor);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return apiGet<Purchase[]>(`/purchases${query ? `?${query}` : ''}`);
}

export async function getPurchase(id: string): Promise<Purchase> {
  return apiGet<Purchase>(`/purchases/${id}`);
}

export async function createPurchase(
  data: PurchaseCreate,
  addToInventory = true
): Promise<Purchase> {
  return apiPost<Purchase>(`/purchases?add_to_inventory=${addToInventory}`, data);
}

export async function deletePurchase(id: string): Promise<void> {
  return apiDelete<void>(`/purchases/${id}`);
}

// ============================================
// SALES
// ============================================

export async function getSales(params?: {
  platform?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}): Promise<Sale[]> {
  const searchParams = new URLSearchParams();
  if (params?.platform) searchParams.set('platform', params.platform);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return apiGet<Sale[]>(`/sales${query ? `?${query}` : ''}`);
}

export async function getSale(id: string): Promise<Sale> {
  return apiGet<Sale>(`/sales/${id}`);
}

export async function createSale(
  data: SaleCreate,
  removeFromInventory = true
): Promise<Sale> {
  return apiPost<Sale>(`/sales?remove_from_inventory=${removeFromInventory}`, data);
}

export async function deleteSale(id: string): Promise<void> {
  return apiDelete<void>(`/sales/${id}`);
}

// ============================================
// ANALYTICS
// ============================================

export async function getSalesAnalytics(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<SalesAnalytics> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiGet<SalesAnalytics>(`/sales/analytics${query ? `?${query}` : ''}`);
}

export async function getPurchaseAnalytics(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<PurchaseAnalytics> {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiGet<PurchaseAnalytics>(`/purchases/analytics${query ? `?${query}` : ''}`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>(`/inventory/analytics`);
}

// ============================================
// EXPORT
// ============================================

export const financialApi = {
  // Purchases
  getPurchases,
  getPurchase,
  createPurchase,
  deletePurchase,

  // Sales
  getSales,
  getSale,
  createSale,
  deleteSale,

  // Analytics
  getSalesAnalytics,
  getPurchaseAnalytics,
  getDashboardStats,
};

export default financialApi;
