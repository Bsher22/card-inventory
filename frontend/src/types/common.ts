/**
 * Common TypeScript Types
 * Shared types used across multiple domains
 */

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

/** Card condition options for raw (non-slabbed) cards */
export type CardCondition = 'MT' | 'NM-MT' | 'NM' | 'EX-MT' | 'EX' | 'VG-EX' | 'VG' | 'GOOD' | 'FAIR' | 'POOR';

/** Grading company names */
export type GradingCompanyName = 'PSA' | 'BGS' | 'SGC' | 'CGC' | 'HGA' | 'CSG' | 'AGS';

/** Product types for Bowman family */
export type BowmanProductType = 'Bowman' | 'Bowman Chrome' | 'Bowman Draft' | 'Bowman Sapphire';

/** Base type names */
export type BaseTypeName = 'Paper' | 'Chrome' | 'Mega' | 'Sapphire';

// ============================================
// CONSTANTS
// ============================================

export const CONDITION_OPTIONS: CardCondition[] = [
  'MT', 'NM-MT', 'NM', 'EX-MT', 'EX', 'VG-EX', 'VG', 'GOOD', 'FAIR', 'POOR'
];

export const GRADING_COMPANIES: GradingCompanyName[] = [
  'PSA', 'BGS', 'SGC', 'CGC', 'HGA', 'CSG', 'AGS'
];

export const PARALLEL_CATEGORIES = {
  CORE: 'Core',
  PATTERNED: 'Patterned',
  SHIMMER_WAVE: 'Shimmer/Wave',
  EXCLUSIVE: 'Exclusive',
  SNACK_PACK: 'Snack Pack',
  YEAR_SPECIFIC: 'Year-Specific',
} as const;

export const BASE_TYPES = {
  PAPER: 'Paper',
  CHROME: 'Chrome',
  MEGA: 'Mega',
  SAPPHIRE: 'Sapphire',
} as const;
