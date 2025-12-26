/**
 * Card Inventory TypeScript Types
 * ================================
 * 
 * Complete type definitions for the card inventory frontend.
 * Includes Beckett import types with is_first_bowman support.
 * 
 * Place in: frontend/src/types/index.ts
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


// ============================================
// PLAYER TYPES
// ============================================

export interface Player {
  id: string;
  name: string;
  name_normalized: string;
  team: string | null;
  position: string | null;
  debut_year: number | null;
  is_rookie: boolean;
  is_prospect: boolean;
  mlb_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerCreate {
  name: string;
  team?: string | null;
  position?: string | null;
  debut_year?: number | null;
  is_rookie?: boolean;
  is_prospect?: boolean;
  mlb_id?: number | null;
}

export interface PlayerUpdate {
  name?: string;
  team?: string | null;
  position?: string | null;
  debut_year?: number | null;
  is_rookie?: boolean;
  is_prospect?: boolean;
  mlb_id?: number | null;
}


// ============================================
// CHECKLIST TYPES
// ============================================

export interface Checklist {
  id: string;
  product_line_id: string;
  card_number: string;
  card_prefix: string | null;
  card_suffix: string | null;
  player_name_raw: string;
  player_id: string | null;
  team: string | null;
  card_type_id: string | null;
  set_name: string | null;
  parallel_name: string | null;
  is_autograph: boolean;
  is_relic: boolean;
  is_rookie_card: boolean;
  is_first_bowman: boolean;
  serial_numbered: number | null;
  raw_checklist_line: string | null;
  created_at: string;
  updated_at: string;
  player?: Player;
  product_line?: ProductLine;
  inventory_count?: number;
}

export interface ChecklistCreate {
  product_line_id: string;
  card_number: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw: string;
  player_id?: string | null;
  team?: string | null;
  card_type_id?: string | null;
  set_name?: string | null;
  parallel_name?: string | null;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  serial_numbered?: number | null;
}

export interface ChecklistUpdate {
  card_number?: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw?: string;
  player_id?: string | null;
  team?: string | null;
  card_type_id?: string | null;
  set_name?: string | null;
  parallel_name?: string | null;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  serial_numbered?: number | null;
}

export interface ChecklistFilters {
  product_line_id?: string;
  brand_id?: string;
  player_id?: string;
  search?: string;
  set_name?: string;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  has_inventory?: boolean;
  limit?: number;
  offset?: number;
}


// ============================================
// INVENTORY TYPES
// ============================================

export interface Inventory {
  id: string;
  checklist_id: string;
  quantity: number;
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company: string | null;
  grade_value: number | null;
  auto_grade: number | null;
  cert_number: string | null;
  raw_condition: string;
  storage_location: string | null;
  notes: string | null;
  total_cost: number;
  created_at: string;
  updated_at: string;
  checklist?: Checklist;
}

export interface InventoryCreate {
  checklist_id: string;
  quantity: number;
  is_signed?: boolean;
  is_slabbed?: boolean;
  grade_company?: string | null;
  grade_value?: number | null;
  auto_grade?: number | null;
  cert_number?: string | null;
  raw_condition?: string;
  storage_location?: string | null;
  notes?: string | null;
  total_cost?: number;
}

export interface InventoryUpdate {
  quantity?: number;
  is_signed?: boolean;
  is_slabbed?: boolean;
  grade_company?: string | null;
  grade_value?: number | null;
  auto_grade?: number | null;
  cert_number?: string | null;
  raw_condition?: string;
  storage_location?: string | null;
  notes?: string | null;
  total_cost?: number;
}


// ============================================
// BECKETT IMPORT TYPES
// ============================================

export interface BeckettParsedCard {
  set_name: string;
  card_number: string;
  card_prefix: string | null;
  card_suffix: string | null;
  player_name: string;
  team: string | null;
  is_rookie_card: boolean;
  is_autograph: boolean;
  is_relic: boolean;
  is_first_bowman: boolean;
  serial_numbered: number | null;
  notes: string | null;
  raw_line: string;
}

export interface BeckettImportPreview {
  product_name: string;
  year: number;
  brand: string;
  total_cards: number;
  first_bowman_count: number;
  auto_count: number;
  rookie_count: number;
  sets_found: Record<string, number>;
  sample_cards: BeckettParsedCard[];
  product_line_exists: boolean;
  product_line_id: string | null;
}

export interface BeckettImportResponse {
  success: boolean;
  product_line_id: string | null;
  product_line_name: string;
  year: number;
  brand: string;
  total_cards: number;
  cards_created: number;
  cards_updated: number;
  cards_skipped: number;
  players_created: number;
  players_matched: number;
  first_bowman_count: number;
  sets_imported: Record<string, number>;
  errors: string[];
  warnings: string[];
}


// ============================================
// CONSIGNMENT TYPES
// ============================================

export interface Consigner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  default_fee_per_card: number;
  payment_method: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsignerCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  default_fee_per_card?: number;
  payment_method?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ConsignerUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  default_fee_per_card?: number;
  payment_method?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ConsignmentItem {
  id: string;
  consignment_id: string;
  checklist_id: string;
  quantity: number;
  fee_per_card: number;
  status: string;
  notes: string | null;
  checklist?: Checklist;
}

export interface ConsignmentItemCreate {
  checklist_id: string;
  quantity?: number;
  fee_per_card?: number;
  notes?: string | null;
}

export interface Consignment {
  id: string;
  consigner_id: string;
  date_sent: string;
  date_returned: string | null;
  status: string;
  total_cards: number;
  total_fee: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  consigner?: Consigner;
  items?: ConsignmentItem[];
}

export interface ConsignmentCreate {
  consigner_id: string;
  date_sent: string;
  notes?: string | null;
  items: ConsignmentItemCreate[];
}


// ============================================
// GRADING TYPES
// ============================================

export interface GradingCompany {
  id: string;
  name: string;
  short_name: string;
  website: string | null;
  is_active: boolean;
}

export interface GradingServiceLevel {
  id: string;
  company_id: string;
  name: string;
  price_per_card: number;
  turnaround_days: number | null;
  is_active: boolean;
}

export interface GradingSubmissionItem {
  id: string;
  submission_id: string;
  checklist_id: string;
  declared_value: number;
  grade_received: number | null;
  auto_grade_received: number | null;
  cert_number: string | null;
  notes: string | null;
  checklist?: Checklist;
}

export interface GradingSubmissionItemCreate {
  checklist_id: string;
  declared_value?: number;
}

export interface GradingSubmission {
  id: string;
  company_id: string;
  service_level_id: string;
  submission_number: string | null;
  date_submitted: string;
  date_returned: string | null;
  status: string;
  total_cards: number;
  total_fee: number;
  shipping_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: GradingCompany;
  service_level?: GradingServiceLevel;
  items?: GradingSubmissionItem[];
}

export interface GradingSubmissionCreate {
  company_id: string;
  service_level_id: string;
  submission_number?: string | null;
  date_submitted: string;
  notes?: string | null;
  items: GradingSubmissionItemCreate[];
}


// ============================================
// FINANCIAL TYPES
// ============================================

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

export interface PurchaseItemCreate {
  checklist_id: string;
  quantity?: number;
  unit_price?: number;
  condition?: string;
  notes?: string | null;
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

export interface PurchaseCreate {
  purchase_date: string;
  vendor?: string | null;
  platform?: string | null;
  order_number?: string | null;
  shipping?: number;
  tax?: number;
  notes?: string | null;
  items: PurchaseItemCreate[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  checklist_id: string;
  quantity: number;
  sale_price: number;
  cost_basis: number;
  notes: string | null;
  checklist?: Checklist;
}

export interface SaleItemCreate {
  checklist_id: string;
  quantity?: number;
  sale_price?: number;
  notes?: string | null;
}

export interface Sale {
  id: string;
  sale_date: string;
  platform: string;
  buyer_name: string | null;
  order_number: string | null;
  gross_amount: number;
  platform_fees: number;
  payment_fees: number;
  shipping_collected: number;
  shipping_cost: number;
  net_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface SaleCreate {
  sale_date: string;
  platform: string;
  buyer_name?: string | null;
  order_number?: string | null;
  platform_fees?: number;
  payment_fees?: number;
  shipping_collected?: number;
  shipping_cost?: number;
  notes?: string | null;
  items: SaleItemCreate[];
}


// ============================================
// ANALYTICS TYPES
// ============================================

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

export interface PlayerSummary {
  player_id: string;
  player_name: string;
  team: string | null;
  total_cards: number;
  unique_cards: number;
  autograph_count: number;
  rookie_count: number;
  first_bowman_count: number;
  graded_count: number;
  total_value: number;
}

export interface ProductLineSummary {
  product_line_id: string;
  product_line_name: string;
  year: number;
  brand_name: string;
  checklist_count: number;
  inventory_count: number;
  completion_percentage: number;
  total_value: number;
}


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