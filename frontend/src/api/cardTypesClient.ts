/**
 * Card Types and Parallels API Client
 * API functions for managing base types, parallels, and checklist parsing
 */

import {
  CardBaseType,
  CardBaseTypeCreate,
  CardBaseTypeUpdate,
  CardBaseTypeWithCounts,
  ParallelCategory,
  ParallelCategoryCreate,
  ParallelCategoryWithParallels,
  Parallel,
  ParallelCreate,
  ParallelUpdate,
  ParallelWithCategory,
  ParallelFilter,
  CardPrefixMapping,
  CardPrefixMappingCreate,
  ChecklistParseResult,
  BulkChecklistImportResult,
  ChecklistCreateWithTypes,
} from '../types/cardTypes';

// Use environment variable or default to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

// ============================================
// CARD BASE TYPES API
// ============================================

export const baseTypesApi = {
  /**
   * Get all base types
   */
  async list(): Promise<CardBaseType[]> {
    const response = await fetch(`${API_BASE}/base-types`);
    return handleResponse<CardBaseType[]>(response);
  },

  /**
   * Get all base types with counts
   */
  async listWithCounts(): Promise<CardBaseTypeWithCounts[]> {
    const response = await fetch(`${API_BASE}/base-types/with-counts`);
    return handleResponse<CardBaseTypeWithCounts[]>(response);
  },

  /**
   * Get a specific base type
   */
  async get(id: string): Promise<CardBaseType> {
    const response = await fetch(`${API_BASE}/base-types/${id}`);
    return handleResponse<CardBaseType>(response);
  },

  /**
   * Create a new base type
   */
  async create(data: CardBaseTypeCreate): Promise<CardBaseType> {
    const response = await fetch(`${API_BASE}/base-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CardBaseType>(response);
  },

  /**
   * Update a base type
   */
  async update(id: string, data: CardBaseTypeUpdate): Promise<CardBaseType> {
    const response = await fetch(`${API_BASE}/base-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CardBaseType>(response);
  },
};

// ============================================
// PARALLEL CATEGORIES API
// ============================================

export const parallelCategoriesApi = {
  /**
   * Get all parallel categories
   */
  async list(): Promise<ParallelCategory[]> {
    const response = await fetch(`${API_BASE}/parallel-categories`);
    return handleResponse<ParallelCategory[]>(response);
  },

  /**
   * Get all categories with their parallels
   */
  async listWithParallels(): Promise<ParallelCategoryWithParallels[]> {
    const response = await fetch(`${API_BASE}/parallel-categories/with-parallels`);
    return handleResponse<ParallelCategoryWithParallels[]>(response);
  },

  /**
   * Get a specific category with parallels
   */
  async get(id: string): Promise<ParallelCategoryWithParallels> {
    const response = await fetch(`${API_BASE}/parallel-categories/${id}`);
    return handleResponse<ParallelCategoryWithParallels>(response);
  },

  /**
   * Create a new category
   */
  async create(data: ParallelCategoryCreate): Promise<ParallelCategory> {
    const response = await fetch(`${API_BASE}/parallel-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ParallelCategory>(response);
  },
};

// ============================================
// PARALLELS API
// ============================================

export const parallelsApi = {
  /**
   * Get all parallels with optional filtering
   */
  async list(filters?: ParallelFilter): Promise<ParallelWithCategory[]> {
    const queryString = filters ? buildQueryString(filters) : '';
    const response = await fetch(`${API_BASE}/parallels${queryString}`);
    return handleResponse<ParallelWithCategory[]>(response);
  },

  /**
   * Get parallels by rarity (limited print runs)
   */
  async listByRarity(maxPrintRun: number = 50): Promise<ParallelWithCategory[]> {
    const response = await fetch(`${API_BASE}/parallels/by-rarity?max_print_run=${maxPrintRun}`);
    return handleResponse<ParallelWithCategory[]>(response);
  },

  /**
   * Get a specific parallel
   */
  async get(id: string): Promise<ParallelWithCategory> {
    const response = await fetch(`${API_BASE}/parallels/${id}`);
    return handleResponse<ParallelWithCategory>(response);
  },

  /**
   * Create a new parallel
   */
  async create(data: ParallelCreate): Promise<Parallel> {
    const response = await fetch(`${API_BASE}/parallels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Parallel>(response);
  },

  /**
   * Update a parallel
   */
  async update(id: string, data: ParallelUpdate): Promise<Parallel> {
    const response = await fetch(`${API_BASE}/parallels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Parallel>(response);
  },

  /**
   * Delete a parallel
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/parallels/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to delete parallel');
    }
  },
};

// ============================================
// PREFIX MAPPINGS API
// ============================================

export const prefixMappingsApi = {
  /**
   * Get all prefix mappings
   */
  async list(productType?: string, isProspect?: boolean): Promise<CardPrefixMapping[]> {
    const params: Record<string, any> = {};
    if (productType) params.product_type = productType;
    if (isProspect !== undefined) params.is_prospect = isProspect;
    
    const queryString = buildQueryString(params);
    const response = await fetch(`${API_BASE}/prefix-mappings${queryString}`);
    return handleResponse<CardPrefixMapping[]>(response);
  },

  /**
   * Create a new prefix mapping
   */
  async create(data: CardPrefixMappingCreate): Promise<CardPrefixMapping> {
    const response = await fetch(`${API_BASE}/prefix-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<CardPrefixMapping>(response);
  },
};

// ============================================
// CHECKLIST PARSING API
// ============================================

export const checklistParserApi = {
  /**
   * Parse a checklist PDF and return extracted prospect cards
   * Does NOT save to database - returns for review first
   */
  async parsePdf(file: File): Promise<ChecklistParseResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/checklists/parse-pdf`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ChecklistParseResult>(response);
  },

  /**
   * Import previously parsed checklist cards into database
   */
  async importParsed(
    productLineId: string,
    parsedCards: ChecklistCreateWithTypes[]
  ): Promise<BulkChecklistImportResult> {
    const response = await fetch(`${API_BASE}/checklists/import-parsed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_line_id: productLineId,
        parsed_cards: parsedCards,
      }),
    });
    return handleResponse<BulkChecklistImportResult>(response);
  },
};

// ============================================
// COMBINED EXPORT
// ============================================

export const cardTypesClient = {
  baseTypes: baseTypesApi,
  parallelCategories: parallelCategoriesApi,
  parallels: parallelsApi,
  prefixMappings: prefixMappingsApi,
  checklistParser: checklistParserApi,
};

export default cardTypesClient;