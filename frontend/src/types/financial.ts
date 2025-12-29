/**
 * Financial Types
 * Types for Purchases, Sales, and Analytics
 */

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

// ============================================
// INVENTORY TYPES (for reference in sales)
// ============================================

export interface InventoryWithCard {
  id: string;
  checklist_id: string;
  quantity: number;
  condition?: string;
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company?: string | null;
  grade_value?: string | null;
  cert_number?: string | null;
  total_cost: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  checklist?: Checklist;
}

// ============================================
// CHECKLIST TYPES (for reference)
// ============================================

export interface Checklist {
  id: string;
  product_line_id: string;
  card_number: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw: string;
  team?: string | null;
  is_autograph: boolean;
  is_rookie_card: boolean;
  is_first_bowman: boolean;
  set_name?: string | null;
  parallel_id?: string | null;
  serial_numbered?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  product_line?: ProductLine;
  player?: Player;
}

export interface ProductLine {
  id: string;
  brand_id: string;
  name: string;
  year: number;
  release_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: Brand;
}

export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Player {
  id: string;
  name: string;
  team?: string | null;
}
