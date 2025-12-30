/**
 * Grading & Authentication Types
 */

// ============================================
// SHARED TYPES
// ============================================

export interface GradingServiceLevel {
  id: string;
  name: string;
  code: string | null;
  max_value: number | null;
  base_fee: number;
  estimated_days: number | null;
  is_active: boolean;
}

export interface GradingCompanyWithLevels {
  id: string;
  name: string;
  code: string;
  website: string | null;
  service_type: 'grading' | 'authentication' | 'both';
  is_active: boolean;
  service_levels: GradingServiceLevel[];
}

export interface PendingByCompany {
  company_id: string;
  company_name: string;
  company_code: string;
  pending_count: number;
  pending_value: number;
  oldest_submission_date: string | null;
}

// ============================================
// CARD GRADING TYPES
// ============================================

export interface CardGradingItem {
  id: string;
  inventory_id: string | null;
  checklist_id: string | null;
  line_number: number | null;
  declared_value: number;
  fee_per_card: number | null;
  was_signed: boolean;
  status: 'pending' | 'graded' | 'authentic' | 'altered' | 'counterfeit' | 'ungradeable' | 'lost';
  grade_value: number | null;
  auto_grade: number | null;
  cert_number: string | null;
  label_type: string | null;
  notes: string | null;
  // Nested details
  player_name?: string;
  card_number?: string;
  product_line_name?: string;
}

export interface CardGradingSubmission {
  id: string;
  company_id: string;
  service_level_id: string | null;
  submission_number: string | null;
  reference_number: string | null;
  date_submitted: string;
  date_shipped: string | null;
  date_received: string | null;
  date_graded: string | null;
  date_shipped_back: string | null;
  date_returned: string | null;
  status: 'pending' | 'shipped' | 'received' | 'grading' | 'shipped_back' | 'returned' | 'cancelled';
  grading_fee: number;
  shipping_to_cost: number;
  shipping_to_tracking: string | null;
  shipping_return_cost: number;
  shipping_return_tracking: string | null;
  insurance_cost: number;
  total_cards: number;
  cards_graded: number;
  total_declared_value: number;
  notes: string | null;
  items: CardGradingItem[];
  // Nested company info
  company_name?: string;
  company_code?: string;
  service_level_name?: string;
}

export interface CardGradingItemCreate {
  inventory_id: string;
  checklist_id?: string;
  declared_value?: number;
  fee_per_card?: number;
  was_signed?: boolean;
}

export interface CardGradingSubmissionCreate {
  company_id: string;
  service_level_id?: string;
  date_submitted: string;
  items: CardGradingItemCreate[];
  submission_number?: string;
  reference_number?: string;
  shipping_to_cost?: number;
  shipping_to_tracking?: string;
  insurance_cost?: number;
  notes?: string;
}

export interface CardGradingStatusUpdate {
  status: string;
  date_shipped?: string;
  date_received?: string;
  date_graded?: string;
  date_shipped_back?: string;
  date_returned?: string;
  shipping_to_tracking?: string;
  shipping_return_tracking?: string;
}

export interface CardGradeResult {
  item_id: string;
  status: string;
  grade_value?: number;
  auto_grade?: number;
  cert_number?: string;
  label_type?: string;
  notes?: string;
}

export interface CardGradingResultsSubmit {
  item_results: CardGradeResult[];
  date_returned?: string;
  shipping_return_cost?: number;
}

export interface CardGradingStats {
  pending_submissions: number;
  cards_out_for_grading: number;
  pending_fees: number;
  total_graded: number;
  grade_distribution: Record<string, number>;
  gem_rate: number;
  avg_grade?: number;
  by_company?: Record<string, number>;
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

export type AuthItemType = 'card' | 'memorabilia' | 'collectible';

export interface AuthItem {
  id: string;
  item_type: AuthItemType;
  inventory_id: string | null;
  standalone_item_id: string | null;
  line_number: number | null;
  description: string | null;
  signer_name: string | null;
  declared_value: number;
  fee_per_item: number | null;
  status: 'pending' | 'authentic' | 'not_authentic' | 'inconclusive' | 'lost';
  cert_number: string | null;
  sticker_number: string | null;
  letter_number: string | null;
  notes: string | null;
  // Nested card details
  player_name?: string;
  card_number?: string;
  product_line_name?: string;
  // Nested standalone details
  item_name?: string;
  item_category?: string;
}

export interface AuthSubmission {
  id: string;
  company_id: string;
  service_level_id: string | null;
  submission_number: string | null;
  reference_number: string | null;
  date_submitted: string;
  date_shipped: string | null;
  date_received: string | null;
  date_completed: string | null;
  date_shipped_back: string | null;
  date_returned: string | null;
  status: 'pending' | 'shipped' | 'received' | 'processing' | 'shipped_back' | 'returned' | 'cancelled';
  authentication_fee: number;
  shipping_to_cost: number;
  shipping_to_tracking: string | null;
  shipping_return_cost: number;
  shipping_return_tracking: string | null;
  insurance_cost: number;
  total_items: number;
  items_authenticated: number;
  total_declared_value: number;
  notes: string | null;
  items: AuthItem[];
  // Nested company info
  company_name?: string;
  company_code?: string;
  service_level_name?: string;
}

export interface AuthItemCreate {
  item_type: AuthItemType;
  inventory_id?: string;
  standalone_item_id?: string;
  description?: string;
  signer_name?: string;
  declared_value?: number;
  fee_per_item?: number;
}

export interface AuthSubmissionCreate {
  company_id: string;
  service_level_id?: string;
  date_submitted: string;
  items: AuthItemCreate[];
  submission_number?: string;
  reference_number?: string;
  shipping_to_cost?: number;
  shipping_to_tracking?: string;
  insurance_cost?: number;
  notes?: string;
}

export interface AuthStatusUpdate {
  status: string;
  date_shipped?: string;
  date_received?: string;
  date_completed?: string;
  date_shipped_back?: string;
  date_returned?: string;
  shipping_to_tracking?: string;
  shipping_return_tracking?: string;
}

export interface AuthResult {
  item_id: string;
  status: string;
  cert_number?: string;
  sticker_number?: string;
  letter_number?: string;
  notes?: string;
}

export interface AuthResultsSubmit {
  item_results: AuthResult[];
  date_returned?: string;
  shipping_return_cost?: number;
}

export interface AuthStats {
  pending_submissions: number;
  items_out_for_auth: number;
  pending_fees: number;
  total_authenticated: number;
  pass_rate: number;
  by_item_type: Record<string, number>;
  by_company: Record<string, number>;
}

// ============================================
// LEGACY ALIASES (for backwards compatibility)
// ============================================

/** @deprecated Use GradingServiceLevel */
export type ServiceLevel = GradingServiceLevel;

/** @deprecated Use GradingCompanyWithLevels */
export type GradingCompany = GradingCompanyWithLevels;