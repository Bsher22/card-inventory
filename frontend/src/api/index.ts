/**
 * API Package - Barrel Exports
 * ============================
 *
 * All API clients exported from a single location.
 *
 * Usage:
 *   import { productsApi, inventoryApi, getBrands } from '@/api';
 */

// Base utilities
export { API_BASE, handleResponse, buildQueryString, apiRequest, apiFormRequest } from './base';

// Products API
export * from './productsApi';
export { productsApi } from './productsApi';

// Players API
export * from './playersApi';
export { playersApi } from './playersApi';

// Checklists API
export * from './checklistsApi';
export { checklistsApi } from './checklistsApi';

// Inventory API
export * from './inventoryApi';
export { inventoryApi } from './inventoryApi';

// Standalone Items API (Memorabilia & Collectibles)
export * from './standaloneItemsApi';
export { standaloneItemsApi } from './standaloneItemsApi';

// Consignments API
export * from './consignmentsApi';
export { consignmentsApi } from './consignmentsApi';

// Grading API
export * from './gradingApi';
export { gradingApi } from './gradingApi';

// Financial API
export * from './financialApi';
export { financialApi } from './financialApi';

// Beckett API
export * from './beckettApi';
export { beckettApi } from './beckettApi';

// Card Types API
export * from './cardTypesApi';
export { cardTypesApi } from './cardTypesApi';

// eBay API
export * from './ebayApi';
export { ebayApi } from './ebayApi';

// Consigner Pricing API
export * from './consignerPricingApi';
export { consignerPricingApi } from './consignerPricingApi';

// ============================================
// UNIFIED API OBJECT (Optional)
// ============================================

import { productsApi } from './productsApi';
import { playersApi } from './playersApi';
import { checklistsApi } from './checklistsApi';
import { inventoryApi } from './inventoryApi';
import { standaloneItemsApi } from './standaloneItemsApi';
import { consignmentsApi } from './consignmentsApi';
import { gradingApi } from './gradingApi';
import { financialApi } from './financialApi';
import { beckettApi } from './beckettApi';
import { cardTypesApi } from './cardTypesApi';
import { ebayApi } from './ebayApi';
import { consignerPricingApi } from './consignerPricingApi';

/**
 * Unified API client with all domain APIs
 *
 * Usage:
 *   import { api } from '@/api';
 *   const brands = await api.products.getBrands();
 *   const inventory = await api.inventory.getInventory();
 */
export const api = {
  products: productsApi,
  players: playersApi,
  checklists: checklistsApi,
  inventory: inventoryApi,
  standaloneItems: standaloneItemsApi,
  consignments: consignmentsApi,
  grading: gradingApi,
  financial: financialApi,
  beckett: beckettApi,
  cardTypes: cardTypesApi,
  ebay: ebayApi,
  consignerPricing: consignerPricingApi,
};

export default api;
