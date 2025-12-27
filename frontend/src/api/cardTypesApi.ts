/**
 * Card Types API Client
 * Handles base types, parallels, and categories
 */

import { apiRequest, buildQueryString } from './base';
import type {
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
} from '../types';

// ============================================
// CARD BASE TYPES
// ============================================

export async function getBaseTypes(): Promise<CardBaseType[]> {
  return apiRequest<CardBaseType[]>('/base-types');
}

export async function getBaseTypesWithCounts(): Promise<CardBaseTypeWithCounts[]> {
  return apiRequest<CardBaseTypeWithCounts[]>('/base-types/with-counts');
}

export async function getBaseType(id: string): Promise<CardBaseType> {
  return apiRequest<CardBaseType>(`/base-types/${id}`);
}

export async function createBaseType(data: CardBaseTypeCreate): Promise<CardBaseType> {
  return apiRequest<CardBaseType>('/base-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBaseType(id: string, data: CardBaseTypeUpdate): Promise<CardBaseType> {
  return apiRequest<CardBaseType>(`/base-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================
// PARALLEL CATEGORIES
// ============================================

export async function getParallelCategories(): Promise<ParallelCategory[]> {
  return apiRequest<ParallelCategory[]>('/parallel-categories');
}

export async function getParallelCategoriesWithParallels(): Promise<ParallelCategoryWithParallels[]> {
  return apiRequest<ParallelCategoryWithParallels[]>('/parallel-categories/with-parallels');
}

export async function getParallelCategory(id: string): Promise<ParallelCategoryWithParallels> {
  return apiRequest<ParallelCategoryWithParallels>(`/parallel-categories/${id}`);
}

export async function createParallelCategory(data: ParallelCategoryCreate): Promise<ParallelCategory> {
  return apiRequest<ParallelCategory>('/parallel-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// PARALLELS
// ============================================

export async function getParallels(filters?: ParallelFilter): Promise<ParallelWithCategory[]> {
  const query = filters ? buildQueryString(filters) : '';
  return apiRequest<ParallelWithCategory[]>(`/parallels${query}`);
}

export async function getParallelsByRarity(maxPrintRun = 50): Promise<ParallelWithCategory[]> {
  return apiRequest<ParallelWithCategory[]>(`/parallels/by-rarity?max_print_run=${maxPrintRun}`);
}

export async function getParallel(id: string): Promise<ParallelWithCategory> {
  return apiRequest<ParallelWithCategory>(`/parallels/${id}`);
}

export async function createParallel(data: ParallelCreate): Promise<Parallel> {
  return apiRequest<Parallel>('/parallels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateParallel(id: string, data: ParallelUpdate): Promise<Parallel> {
  return apiRequest<Parallel>(`/parallels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteParallel(id: string): Promise<void> {
  return apiRequest<void>(`/parallels/${id}`, { method: 'DELETE' });
}

// ============================================
// PREFIX MAPPINGS
// ============================================

export async function getPrefixMappings(
  productType?: string,
  isProspect?: boolean
): Promise<CardPrefixMapping[]> {
  const params: Record<string, unknown> = {};
  if (productType) params.product_type = productType;
  if (isProspect !== undefined) params.is_prospect = isProspect;
  const query = buildQueryString(params);
  return apiRequest<CardPrefixMapping[]>(`/prefix-mappings${query}`);
}

export async function createPrefixMapping(data: CardPrefixMappingCreate): Promise<CardPrefixMapping> {
  return apiRequest<CardPrefixMapping>('/prefix-mappings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// COMBINED EXPORT
// ============================================

export const cardTypesApi = {
  // Base Types
  getBaseTypes,
  getBaseTypesWithCounts,
  getBaseType,
  createBaseType,
  updateBaseType,
  // Parallel Categories
  getParallelCategories,
  getParallelCategoriesWithParallels,
  getParallelCategory,
  createParallelCategory,
  // Parallels
  getParallels,
  getParallelsByRarity,
  getParallel,
  createParallel,
  updateParallel,
  deleteParallel,
  // Prefix Mappings
  getPrefixMappings,
  createPrefixMapping,
};
