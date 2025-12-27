/**
 * Products API Client
 * Handles Brand and ProductLine endpoints
 */

import { apiRequest, buildQueryString } from './base';
import type {
  Brand,
  BrandCreate,
  ProductLine,
  ProductLineCreate,
  ProductLineSummary,
  ProductLineWithBrand,
} from '../types';

// ============================================
// BRANDS
// ============================================

export async function getBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>('/brands');
}

export async function getBrand(id: string): Promise<Brand> {
  return apiRequest<Brand>(`/brands/${id}`);
}

export async function createBrand(data: BrandCreate): Promise<Brand> {
  return apiRequest<Brand>('/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// PRODUCT LINES
// ============================================

export async function getProductLines(params?: {
  brand_id?: string;
  year?: number;
  skip?: number;
  limit?: number;
}): Promise<ProductLineSummary[]> {
  const query = params ? buildQueryString(params) : '';
  return apiRequest<ProductLineSummary[]>(`/product-lines${query}`);
}

export async function getProductLine(id: string): Promise<ProductLineWithBrand> {
  return apiRequest<ProductLineWithBrand>(`/product-lines/${id}`);
}

export async function createProductLine(data: ProductLineCreate): Promise<ProductLineWithBrand> {
  return apiRequest<ProductLineWithBrand>('/product-lines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteProductLine(id: string): Promise<void> {
  return apiRequest<void>(`/product-lines/${id}`, { method: 'DELETE' });
}

// ============================================
// COMBINED EXPORT
// ============================================

export const productsApi = {
  // Brands
  getBrands,
  getBrand,
  createBrand,
  // Product Lines
  getProductLines,
  getProductLine,
  createProductLine,
  deleteProductLine,
};
