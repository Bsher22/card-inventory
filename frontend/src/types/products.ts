/**
 * Product Types: Brand and ProductLine - Aligned with Backend Schemas
 */

// ============================================
// BRAND TYPES
// ============================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface BrandCreate {
  name: string;
  slug: string;
}

export interface BrandUpdate {
  name?: string;
  slug?: string;
}

export interface BrandWithProducts extends Brand {
  product_lines: ProductLine[];
}

// ============================================
// PRODUCT LINE TYPES
// ============================================

export interface ProductLine {
  id: string;
  brand_id: string;
  name: string;
  year: number;
  release_date: string | null;
  sport: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  brand?: Brand;
  checklist_count?: number;
}

export interface ProductLineCreate {
  brand_id: string;
  name: string;
  year: number;
  release_date?: string | null;
  sport?: string;
  description?: string | null;
}

export interface ProductLineUpdate {
  name?: string;
  year?: number;
  release_date?: string | null;
  sport?: string;
  description?: string | null;
}

export interface ProductLineWithBrand extends ProductLine {
  brand: Brand;
}

export interface ProductLineSummary {
  id: string;
  brand_name: string;
  name: string;
  year: number;
  checklist_count: number;
  inventory_count: number;
  completion_pct: number;
}
