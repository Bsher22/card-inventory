/**
 * Financial API Client
 * Handles Purchases, Sales, and Analytics
 */

import { apiRequest, buildQueryString } from './base';
import type {
  Purchase,
  PurchaseCreate,
  Sale,
  SaleCreate,
  SalesAnalytics,
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
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Purchase[]>(`/purchases${query}`);
}

export async function getPurchase(id: string): Promise<Purchase> {
  return apiRequest<Purchase>(`/purchases/${id}`);
}

export async function createPurchase(data: PurchaseCreate, addToInventory = true): Promise<Purchase> {
  return apiRequest<Purchase>(`/purchases?add_to_inventory=${addToInventory}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deletePurchase(id: string): Promise<void> {
  return apiRequest<void>(`/purchases/${id}`, { method: 'DELETE' });
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
  const query = params ? buildQueryString(params) : '';
  return apiRequest<Sale[]>(`/sales${query}`);
}

export async function getSale(id: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${id}`);
}

export async function getSalesAnalytics(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<SalesAnalytics> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<SalesAnalytics>(`/sales/analytics${query}`);
}

export async function createSale(data: SaleCreate, removeFromInventory = true): Promise<Sale> {
  return apiRequest<Sale>(`/sales?remove_from_inventory=${removeFromInventory}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSale(id: string): Promise<void> {
  return apiRequest<void>(`/sales/${id}`, { method: 'DELETE' });
}

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>('/dashboard/stats');
}

export const financialApi = {
  // Purchases
  getPurchases,
  getPurchase,
  createPurchase,
  deletePurchase,
  // Sales
  getSales,
  getSale,
  getSalesAnalytics,
  createSale,
  deleteSale,
  // Dashboard
  getDashboardStats,
};
