/**
 * Inventory API Client
 */

import { apiRequest, buildQueryString } from './base';
import type {
  Inventory,
  InventoryCreate,
  InventoryUpdate,
  InventoryWithCard,
  InventoryAnalytics,
  BulkInventoryResult,
  PlayerInventorySummary,
} from '../types';

export async function getInventory(params?: {
  product_line_id?: string;
  player_id?: string;
  brand_id?: string;
  in_stock_only?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<InventoryWithCard[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<InventoryWithCard[]>(`/inventory${query}`);
}

export async function getInventoryItem(id: string): Promise<InventoryWithCard> {
  return apiRequest<InventoryWithCard>(`/inventory/${id}`);
}

export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  return apiRequest<InventoryAnalytics>('/inventory/analytics');
}

export async function getPlayerInventorySummary(params?: {
  limit?: number;
  min_cards?: number;
}): Promise<PlayerInventorySummary[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<PlayerInventorySummary[]>(`/inventory/players${query}`);
}

export async function createInventory(data: InventoryCreate): Promise<InventoryWithCard> {
  return apiRequest<InventoryWithCard>('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInventory(id: string, data: InventoryUpdate): Promise<InventoryWithCard> {
  return apiRequest<InventoryWithCard>(`/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adjustInventory(id: string, adjustment: number): Promise<InventoryWithCard> {
  return apiRequest<InventoryWithCard>(`/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ adjustment }),
  });
}

export async function bulkAddInventory(items: {
  checklist_id: string;
  quantity: number;
  condition?: string;
}[]): Promise<BulkInventoryResult> {
  return apiRequest<BulkInventoryResult>('/inventory/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function deleteInventory(id: string): Promise<void> {
  return apiRequest<void>(`/inventory/${id}`, { method: 'DELETE' });
}

export const inventoryApi = {
  getInventory,
  getInventoryItem,
  getInventoryAnalytics,
  getPlayerInventorySummary,
  createInventory,
  updateInventory,
  adjustInventory,
  bulkAddInventory,
  deleteInventory,
};
