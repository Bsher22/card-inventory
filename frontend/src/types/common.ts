/**
 * Common Types and Constants
 */

// ============================================
// CONDITION OPTIONS
// ============================================

export const CONDITION_OPTIONS = [
  { value: 'MINT', label: 'Mint' },
  { value: 'NM', label: 'Near Mint' },
  { value: 'EX', label: 'Excellent' },
  { value: 'VG', label: 'Very Good' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
] as const;

export type Condition = typeof CONDITION_OPTIONS[number]['value'];

// ============================================
// PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ErrorResponse {
  detail: string;
}

// ============================================
// STATUS TYPES
// ============================================

export const CONSIGNMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
} as const;

export type ConsignmentStatus = typeof CONSIGNMENT_STATUS[keyof typeof CONSIGNMENT_STATUS];

export const GRADING_STATUS = {
  PENDING: 'pending',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  GRADED: 'graded',
  RETURNED: 'returned',
} as const;

export type GradingStatus = typeof GRADING_STATUS[keyof typeof GRADING_STATUS];

// ============================================
// PLATFORM OPTIONS
// ============================================

export const SALE_PLATFORMS = [
  'eBay',
  'Whatnot',
  'COMC',
  'MySlabs',
  'Facebook',
  'Instagram',
  'In Person',
  'Other',
] as const;

export type SalePlatform = typeof SALE_PLATFORMS[number];

// ============================================
// GRADING COMPANIES
// ============================================

export const GRADING_COMPANIES = [
  { code: 'PSA', name: 'Professional Sports Authenticator' },
  { code: 'BGS', name: 'Beckett Grading Services' },
  { code: 'SGC', name: 'Sportscard Guaranty Corporation' },
  { code: 'CGC', name: 'Certified Guaranty Company' },
  { code: 'CSG', name: 'Certified Sports Guaranty' },
] as const;

export type GradingCompanyCode = typeof GRADING_COMPANIES[number]['code'];
