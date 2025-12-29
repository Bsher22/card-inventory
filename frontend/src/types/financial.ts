/**
 * Financial Types: Purchase, Sale, Analytics
 * 
 * Features:
 * 1. INLINE CARD ENTRY for purchases:
 *    - PurchaseItemCreate.checklist_id is optional
 *    - Can provide year, card_type, player inline instead
 *    
 * 2. EBAY INTEGRATION:
 *    - SaleItem.checklist_id is nullable for eBay imports
 *    - Sale has source and ebay_listing_sale_id fields
 */

import type { Checklist } from './checklists';

// ============================================
// PURCHASE ITEM TYPES
// ============================================

export interface PurchaseItemCreate {
  /** Reference to existing checklist (optional - use this OR inline fields) */
  checklist_id?: string | null;
  
  /** Card year - required if no checklist_id */
  year?: number | null;
  
  /** Product type (Bowman Chrome, etc.) - required if no checklist_id */
  card_type?: string | null;
  
  /** Player name - required if no checklist_id */
  player?: string | null;
  
  /** Parallel name (Gold, Orange, etc.) */
  parallel?: string | null;
  
  /** Card number (BCP-61, etc.) */
  card_number?: string | null;
  
  /** Is autograph card product (pack-pulled auto) */
  is_auto?: boolean;
  
  /** Card has signature (bought already signed) */
  is_signed?: boolean;
  
  /** Quantity */
  quantity: number;
  
  /** Price per card */
  unit_price: number;
  
  /** Condition (Raw, NM, etc.) */
  condition?: string;
  
  /** Notes */
  notes?: string | null;
  
  /** Is card graded/slabbed */
  is_slabbed?: boolean;
  
  /** Grade company (PSA, BGS, etc.) */
  grade_company?: string | null;
  
  /** Grade value (e.g., 9.5) */
  grade_value?: number | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  checklist_id: string;
  quantity: number;
  unit_price: number;
  condition: string;
  notes: string | null;
  checklist?: Checklist;
}

// ============================================
// PURCHASE TYPES
// ============================================

export interface PurchaseCreate {
  purchase_date: string;
  vendor?: string | null;
  platform?: string | null;
  order_number?: string | null;
  shipping: number;
  tax: number;
  notes?: string | null;
  items: PurchaseItemCreate[];
  add_to_inventory: boolean;
}

export interface Purchase {
  id: string;
  purchase_date: string;
  vendor: string | null;
  platform: string | null;
  order_number: string | null;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

// ============================================
// SALE ITEM TYPES - WITH EBAY INTEGRATION
// ============================================

export interface SaleItemCreate {
  /** Optional: for eBay imports without card-level linkage */
  checklist_id?: string | null;
  quantity: number;
  sale_price: number;
  notes?: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  /** Nullable: for eBay imports without card-level linkage */
  checklist_id: string | null;
  quantity: number;
  sale_price: number;
  cost_basis: number | null;
  notes: string | null;
  checklist?: Checklist;
}

// ============================================
// SALE TYPES - WITH EBAY INTEGRATION
// ============================================

export interface SaleCreate {
  sale_date: string;
  platform?: string | null;
  buyer_name?: string | null;
  order_number?: string | null;
  platform_fees: number;
  payment_fees: number;
  shipping_collected: number;
  shipping_cost: number;
  notes?: string | null;
  items: SaleItemCreate[];
  /** 'manual' or 'ebay_import' */
  source?: string;
  ebay_listing_sale_id?: string | null;
}

export interface Sale {
  id: string;
  sale_date: string;
  platform: string | null;
  buyer_name: string | null;
  order_number: string | null;
  gross_amount: number;
  platform_fees: number;
  payment_fees: number;
  shipping_collected: number;
  shipping_cost: number;
  net_amount: number;
  notes: string | null;
  /** 'manual' or 'ebay_import' */
  source: string;
  ebay_listing_sale_id: string | null;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface SalesAnalytics {
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  avg_sale_price: number;
  sales_by_platform: Record<string, number>;
  sales_by_month: Record<string, number>;
}

export interface PurchaseAnalytics {
  total_purchases: number;
  total_spent: number;
  avg_purchase_price: number;
  purchases_by_vendor: Record<string, number>;
  purchases_by_month: Record<string, number>;
}

export interface DashboardStats {
  total_cards: number;
  total_cost_basis: number;
  total_revenue: number;
  total_profit: number;
  unique_players: number;
  unique_products: number;
  autograph_count: number;
  first_bowman_count: number;
  rookie_count: number;
  graded_count: number;
}

// ============================================
// DROPDOWN OPTIONS
// ============================================

export interface PurchaseOptions {
  card_types: string[];
  parallels: string[];
  platforms: string[];
  grade_companies: string[];
}

export const CARD_TYPE_OPTIONS = [
  'Bowman',
  'Bowman Chrome',
  'Bowman Draft',
  'Bowman Sapphire',
  'Bowman Sterling',
  "Bowman's Best",
  'Topps Chrome',
  'Topps',
  'Other',
];

export const PARALLEL_OPTIONS = [
  'Base',
  'Refractor',
  'Gold',
  'Gold Refractor',
  'Orange',
  'Orange Refractor',
  'Blue',
  'Blue Refractor',
  'Purple',
  'Purple Refractor',
  'Green',
  'Green Refractor',
  'Red',
  'Red Refractor',
  'Black',
  'Black Refractor',
  'Atomic',
  'X-Fractor',
  'Prism',
  'Shimmer',
  'Speckle',
  'Mojo',
  'Aqua',
  'Pink',
  'Yellow',
  'Superfractor',
  'Printing Plate',
  'Other',
];

export const PLATFORM_OPTIONS = [
  'eBay',
  'COMC',
  'MySlabs',
  'Mercari',
  'Facebook',
  'Twitter/X',
  'Instagram',
  'Card Show',
  'LCS',
  'Direct',
  'Other',
];

export const GRADE_COMPANY_OPTIONS = [
  'PSA',
  'BGS',
  'SGC',
  'CGC',
  'CSG',
  'HGA',
];

// ============================================
// DEFAULT VALUES FOR FORMS
// ============================================

export const DEFAULT_PURCHASE_ITEM: PurchaseItemCreate = {
  checklist_id: null,
  year: new Date().getFullYear(),
  card_type: 'Bowman Chrome',
  player: '',
  parallel: 'Base',
  card_number: null,
  is_auto: false,
  is_signed: false,
  quantity: 1,
  unit_price: 0,
  condition: 'Raw',
  notes: null,
  is_slabbed: false,
  grade_company: null,
  grade_value: null,
};

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const DEFAULT_PURCHASE_CREATE: PurchaseCreate = {
  purchase_date: getTodayString(),
  vendor: null,
  platform: null,
  order_number: null,
  shipping: 0,
  tax: 0,
  notes: null,
  items: [{ ...DEFAULT_PURCHASE_ITEM }],
  add_to_inventory: true,
};
