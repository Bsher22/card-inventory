/**
 * Financial Types
 * Types for Purchases, Sales, and Analytics
 */

import type { Checklist } from './checklists';

// ============================================
// PURCHASE TYPES
// ============================================

export interface PurchaseItemCreate {
  checklist_id: string;
  quantity: number;
  unit_price: number;
  condition?: string;
  notes?: string | null;
}

export interface PurchaseCreate {
  purchase_date: string;
  vendor?: string | null;
  platform?: string | null;
  order_number?: string | null;
  shipping: number;
  tax: number;
  notes?: string | null;
  items: PurchaseItemCreate[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  checklist_id: string;
  quantity: number;
  unit_price: number;
  condition?: string;
  notes?: string | null;
  checklist?: Checklist;
}

export interface Purchase {
  id: string;
  purchase_date: string;
  vendor?: string | null;
  platform?: string | null;
  order_number?: string | null;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

// ============================================
// SALE TYPES
// ============================================

export interface SaleItemCreate {
  checklist_id: string;
  quantity: number;
  sale_price: number;
  notes?: string | null;
}

export interface SaleCreate {
  sale_date: string;
  platform: string;
  buyer_name?: string | null;
  order_number?: string | null;
  platform_fees: number;
  payment_fees: number;
  shipping_collected: number;
  shipping_cost: number;
  notes?: string | null;
  items: SaleItemCreate[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  checklist_id: string;
  quantity: number;
  sale_price: number;
  cost_basis: number;
  notes?: string | null;
  checklist?: Checklist;
}

export interface Sale {
  id: string;
  sale_date: string;
  platform: string;
  buyer_name?: string | null;
  order_number?: string | null;
  gross_amount: number;
  platform_fees: number;
  payment_fees: number;
  shipping_collected: number;
  shipping_cost: number;
  net_amount: number;
  notes?: string | null;
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
