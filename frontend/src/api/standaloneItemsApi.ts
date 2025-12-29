/**
 * Standalone Items API Client
 * 
 * API functions for item categories, standalone items, and related operations.
 */

import { apiRequest, buildQueryString } from './base';
import type {
  ItemCategory,
  ItemCategoryCreate,
  ItemCategoryUpdate,
  StandaloneItem,
  StandaloneItemCreate,
  StandaloneItemUpdate,
  StandaloneItemSummary,
  StandaloneItemFilters,
  StandaloneItemStats,
  Sport,
} from '../types';

// ============================================
// ITEM CATEGORIES
// ============================================

export async function getItemCategories(activeOnly = true): Promise<ItemCategory[]> {
  const query = buildQueryString({ active_only: activeOnly });
  return apiRequest<ItemCategory[]>(`/item-categories${query}`);
}

export async function getItemCategory(id: string): Promise<ItemCategory> {
  return apiRequest<ItemCategory>(`/item-categories/${id}`);
}

export async function createItemCategory(data: ItemCategoryCreate): Promise<ItemCategory> {
  return apiRequest<ItemCategory>('/item-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItemCategory(id: string, data: ItemCategoryUpdate): Promise<ItemCategory> {
  return apiRequest<ItemCategory>(`/item-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================
// SPORTS
// ============================================

export async function getSports(): Promise<Sport[]> {
  return apiRequest<Sport[]>('/sports');
}

// ============================================
// STANDALONE ITEMS
// ============================================

export async function getStandaloneItems(filters?: StandaloneItemFilters): Promise<StandaloneItem[]> {
  const query = filters ? buildQueryString(filters as Record<string, unknown>) : '';
  return apiRequest<StandaloneItem[]>(`/standalone-items${query}`);
}

export async function getStandaloneItemsSummary(params?: {
  category_id?: string;
  sport?: string;
  search?: string;
  limit?: number;
}): Promise<StandaloneItemSummary[]> {
  const query = params ? buildQueryString(params as Record<string, unknown>) : '';
  return apiRequest<StandaloneItemSummary[]>(`/standalone-items/summary${query}`);
}

export async function getStandaloneItem(id: string): Promise<StandaloneItem> {
  return apiRequest<StandaloneItem>(`/standalone-items/${id}`);
}

export async function createStandaloneItem(data: StandaloneItemCreate): Promise<StandaloneItem> {
  return apiRequest<StandaloneItem>('/standalone-items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStandaloneItem(id: string, data: StandaloneItemUpdate): Promise<StandaloneItem> {
  return apiRequest<StandaloneItem>(`/standalone-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteStandaloneItem(id: string): Promise<void> {
  return apiRequest<void>(`/standalone-items/${id}`, { method: 'DELETE' });
}

export async function getStandaloneItemStats(): Promise<StandaloneItemStats> {
  return apiRequest<StandaloneItemStats>('/standalone-items/stats');
}

// ============================================
// OPTIONS/CONSTANTS
// ============================================

export async function getItemTypes(): Promise<string[]> {
  return apiRequest<string[]>('/options/item-types');
}

export async function getSportsList(): Promise<string[]> {
  return apiRequest<string[]>('/options/sports');
}

export async function getAuthenticators(): Promise<string[]> {
  return apiRequest<string[]>('/options/authenticators');
}

export async function getMemorabiliaTypes(): Promise<string[]> {
  return apiRequest<string[]>('/options/memorabilia-types');
}

export async function getCollectibleTypes(): Promise<string[]> {
  return apiRequest<string[]>('/options/collectible-types');
}

export async function getConditions(): Promise<string[]> {
  return apiRequest<string[]>('/options/conditions');
}

// ============================================
// EXPORT BARREL
// ============================================

export const standaloneItemsApi = {
  // Categories
  getItemCategories,
  getItemCategory,
  createItemCategory,
  updateItemCategory,
  
  // Sports
  getSports,
  
  // Standalone Items
  getStandaloneItems,
  getStandaloneItemsSummary,
  getStandaloneItem,
  createStandaloneItem,
  updateStandaloneItem,
  deleteStandaloneItem,
  getStandaloneItemStats,
  
  // Options
  getItemTypes,
  getSportsList,
  getAuthenticators,
  getMemorabiliaTypes,
  getCollectibleTypes,
  getConditions,
};

export default standaloneItemsApi;