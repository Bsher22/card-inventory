// Types for Card Inventory Management System

// ============================================
// BASE TYPES
// ============================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ProductLine {
  id: string;
  brand_id: string;
  name: string;
  year: number;
  release_date: string | null;
  sport: string;
  description: string | null;
  created_at: string;
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

export interface Player {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  debut_year: number | null;
  is_rookie: boolean;
  is_prospect: boolean;
  mlb_id: number | null;
  created_at: string;
}

export interface CardType {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

// ============================================
// CHECKLIST TYPES
// ============================================

export interface Checklist {
  id: string;
  product_line_id: string;
  card_number: string;
  player_id: string | null;
  player_name_raw: string | null;
  card_type_id: string | null;
  parallel_name: string | null;
  serial_numbered: number | null;
  is_autograph: boolean;
  is_relic: boolean;
  is_rookie_card: boolean;
  is_short_print: boolean;
  team: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChecklistWithDetails extends Checklist {
  player: Player | null;
  card_type: CardType | null;
  product_line: ProductLine | null;
  inventory_quantity: number;
}

export interface ChecklistUploadPreview {
  total_rows: number;
  sample_rows: Record<string, unknown>[];
  detected_columns: Record<string, string>;
  unmapped_columns: string[];
}

export interface ChecklistUploadResult {
  product_line_id: string;
  total_rows: number;
  cards_created: number;
  cards_updated: number;
  players_created: number;
  players_matched: number;
  errors: string[];
}

// ============================================
// INVENTORY TYPES
// ============================================

export interface Inventory {
  id: string;
  checklist_id: string;
  quantity: number;
  condition: string;
  grade_company: string | null;
  grade_value: number | null;
  storage_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryWithCard extends Inventory {
  checklist: ChecklistWithDetails;
}

export interface PlayerInventorySummary {
  player_id: string;
  player_name: string;
  team: string | null;
  position: string | null;
  unique_cards: number;
  total_cards: number;
  auto_count: number;
  rookie_count: number;
  numbered_count: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
}

export interface InventoryAnalytics {
  total_unique_cards: number;
  total_quantity: number;
  total_cost_basis: number;
  total_revenue: number;
  total_profit: number;
  cards_by_brand: Record<string, number>;
  cards_by_year: Record<number, number>;
  top_players: PlayerInventorySummary[];
}

// ============================================
// FINANCIAL TYPES
// ============================================

export interface PurchaseItem {
  id: string;
  checklist_id: string;
  quantity: number;
  unit_cost: number;
  condition: string;
  notes: string | null;
}

export interface Purchase {
  id: string;
  purchase_date: string;
  vendor: string | null;
  invoice_number: string | null;
  total_cost: number | null;
  shipping_cost: number;
  notes: string | null;
  created_at: string;
  items: PurchaseItem[];
}

export interface SaleItem {
  id: string;
  checklist_id: string;
  quantity: number;
  sale_price: number;
  condition: string | null;
  cost_basis: number | null;
}

export interface Sale {
  id: string;
  sale_date: string;
  platform: string | null;
  buyer_name: string | null;
  order_number: string | null;
  subtotal: number | null;
  shipping_charged: number;
  shipping_cost: number;
  platform_fees: number;
  payment_fees: number;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface SalesAnalytics {
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  avg_sale_price: number;
  sales_by_platform: Record<string, number>;
  sales_by_month: Record<string, number>;
}

// ============================================
// FORM/INPUT TYPES
// ============================================

export interface ProductLineCreate {
  brand_id: string;
  name: string;
  year: number;
  release_date?: string;
  sport?: string;
  description?: string;
}

export interface InventoryCreate {
  checklist_id: string;
  quantity: number;
  condition?: string;
  grade_company?: string;
  grade_value?: number;
  storage_location?: string;
  notes?: string;
}

export interface PurchaseCreate {
  purchase_date: string;
  vendor?: string;
  invoice_number?: string;
  shipping_cost?: number;
  notes?: string;
  items: {
    checklist_id: string;
    quantity: number;
    unit_cost: number;
    condition?: string;
    notes?: string;
  }[];
}

export interface SaleCreate {
  sale_date: string;
  platform?: string;
  buyer_name?: string;
  order_number?: string;
  shipping_charged?: number;
  shipping_cost?: number;
  platform_fees?: number;
  payment_fees?: number;
  notes?: string;
  items: {
    checklist_id: string;
    quantity: number;
    sale_price: number;
    condition?: string;
  }[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiError {
  detail: string;
}

export interface BulkInventoryResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

// ============================================
// CONSIGNMENT TYPES
// ============================================

export interface Consigner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  default_fee: number | null;
  payment_method: string | null;
  payment_details: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface ConsignerStats {
  total_consignments: number;
  total_cards_sent: number;
  cards_signed: number;
  cards_refused: number;
  cards_pending: number;
  total_fees_paid: number;
  success_rate: number;
}

export interface ConsignmentItem {
  id: string;
  checklist_id: string;
  quantity: number;
  fee_per_card: number;
  status: 'pending' | 'signed' | 'refused' | 'lost' | 'returned_unsigned';
  date_signed: string | null;
  inscription: string | null;
  checklist?: ChecklistWithDetails;
}

export interface Consignment {
  id: string;
  consigner_id: string;
  reference_number: string | null;
  date_sent: string;
  date_returned: string | null;
  expected_return_date: string | null;
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  total_fee: number;
  fee_paid: boolean;
  fee_paid_date: string | null;
  shipping_out_cost: number;
  shipping_out_tracking: string | null;
  shipping_return_cost: number;
  shipping_return_tracking: string | null;
  notes: string | null;
  created_at: string;
  consigner?: Consigner;
  items: ConsignmentItem[];
}

export interface ConsignerCreate {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  default_fee?: number;
  payment_method?: string;
  payment_details?: string;
  notes?: string;
}

export interface ConsignmentItemCreate {
  checklist_id: string;
  quantity?: number;
  fee_per_card?: number;
  source_inventory_id?: string;
}

export interface ConsignmentCreate {
  consigner_id: string;
  date_sent: string;
  items: ConsignmentItemCreate[];
  reference_number?: string;
  expected_return_date?: string;
  shipping_out_cost?: number;
  shipping_out_tracking?: string;
  notes?: string;
}

export interface ConsignmentItemResult {
  item_id: string;
  status: 'signed' | 'refused' | 'lost' | 'returned_unsigned';
  inscription?: string;
  date_signed?: string;
  notes?: string;
}

export interface ConsignmentReturn {
  item_results: ConsignmentItemResult[];
  date_returned?: string;
  shipping_return_cost?: number;
  shipping_return_tracking?: string;
}

export interface PendingConsignmentsValue {
  items_out: number;
  cards_out: number;
  pending_fees: number;
}

// ============================================
// GRADING TYPES
// ============================================

export interface GradingCompany {
  id: string;
  name: string;
  code: string;
  website: string | null;
  is_active: boolean;
}

export interface GradingServiceLevel {
  id: string;
  grading_company_id: string;
  name: string;
  code: string | null;
  max_value: number | null;
  base_fee: number;
  estimated_days: number | null;
  is_active: boolean;
}

export interface GradingCompanyWithLevels extends GradingCompany {
  service_levels: GradingServiceLevel[];
}

export interface GradingSubmissionItem {
  id: string;
  checklist_id: string;
  line_number: number | null;
  declared_value: number | null;
  fee_per_card: number | null;
  was_signed: boolean;
  status: 'pending' | 'graded' | 'authentic' | 'altered' | 'counterfeit' | 'ungradeable' | 'lost';
  grade_value: number | null;
  auto_grade: number | null;
  cert_number: string | null;
  label_type: string | null;
  checklist?: ChecklistWithDetails;
}

export interface GradingSubmission {
  id: string;
  grading_company_id: string;
  service_level_id: string | null;
  submission_number: string | null;
  reference_number: string | null;
  date_submitted: string;
  date_received: string | null;
  date_graded: string | null;
  date_shipped_back: string | null;
  date_returned: string | null;
  status: 'preparing' | 'shipped' | 'received' | 'grading' | 'shipped_back' | 'complete' | 'cancelled';
  total_declared_value: number;
  grading_fee: number;
  shipping_to_cost: number;
  shipping_to_tracking: string | null;
  shipping_return_cost: number;
  shipping_return_tracking: string | null;
  insurance_cost: number;
  total_cards: number;
  cards_graded: number;
  notes: string | null;
  created_at: string;
  grading_company?: GradingCompany;
  service_level?: GradingServiceLevel;
  items: GradingSubmissionItem[];
}

export interface SubmissionItemCreate {
  checklist_id: string;
  declared_value?: number;
  fee_per_card?: number;
  source_inventory_id?: string;
  was_signed?: boolean;
}

export interface SubmissionCreate {
  grading_company_id: string;
  date_submitted: string;
  items: SubmissionItemCreate[];
  service_level_id?: string;
  submission_number?: string;
  reference_number?: string;
  shipping_to_cost?: number;
  shipping_to_tracking?: string;
  insurance_cost?: number;
  notes?: string;
}

export interface GradedItemResult {
  item_id: string;
  status: 'graded' | 'authentic' | 'altered' | 'counterfeit' | 'ungradeable' | 'lost';
  grade_value?: number;
  auto_grade?: number;
  cert_number?: string;
  label_type?: string;
  notes?: string;
}

export interface SubmissionGradeResults {
  item_results: GradedItemResult[];
  date_returned?: string;
  shipping_return_cost?: number;
}

export interface GradingStats {
  pending_submissions: number;
  cards_out_for_grading: number;
  pending_fees: number;
  grade_distribution: Record<string, number>;
  total_graded: number;
  gem_rate: number;
}

export interface PendingByCompany {
  company: string;
  code: string;
  pending_submissions: number;
  cards_out: number;
}
