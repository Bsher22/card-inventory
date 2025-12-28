/**
 * Grading Types - FIXED to match Backend Schemas
 */

import type { Checklist } from './checklists';

// ============================================
// GRADING COMPANY TYPES
// ============================================

export interface GradingCompany {
  id: string;
  name: string;
  code: string;  // FIXED: was short_name
  website: string | null;
  is_active: boolean;
}

export interface GradingCompanyWithLevels extends GradingCompany {
  service_levels: GradingServiceLevel[];
}

// ============================================
// GRADING SERVICE LEVEL TYPES
// ============================================

export interface GradingServiceLevel {
  id: string;
  name: string;
  code: string | null;
  max_value: number | null;
  base_fee: number;  // FIXED: was price_per_card
  estimated_days: number | null;  // FIXED: was turnaround_days
  is_active: boolean;
}

// ============================================
// GRADING SUBMISSION ITEM TYPES
// ============================================

export interface GradingSubmissionItem {
  id: string;
  checklist_id: string;
  line_number: number | null;
  declared_value: number | null;
  fee_per_card: number | null;
  was_signed: boolean;
  status: string;
  grade_value: number | null;  // FIXED: was grade_received
  auto_grade: number | null;   // FIXED: was auto_grade_received
  cert_number: string | null;
  label_type: string | null;
  checklist?: Checklist;
}

export interface GradingSubmissionItemCreate {
  checklist_id: string;
  declared_value?: number;
  fee_per_card?: number | null;
  source_inventory_id?: string | null;
  was_signed?: boolean;
}

// ============================================
// GRADING SUBMISSION TYPES
// ============================================

export interface GradingSubmission {
  id: string;
  grading_company_id: string;  // FIXED: was company_id
  service_level_id: string | null;
  submission_number: string | null;
  reference_number: string | null;
  date_submitted: string;
  date_received: string | null;
  date_graded: string | null;
  date_shipped_back: string | null;
  date_returned: string | null;
  status: string;
  total_declared_value: number;
  grading_fee: number;  // FIXED: was total_fee
  shipping_to_cost: number;
  shipping_return_cost: number;
  insurance_cost: number;
  total_cards: number;
  cards_graded: number;
  notes: string | null;
  company?: GradingCompany;
  service_level?: GradingServiceLevel;
  items?: GradingSubmissionItem[];
}

export interface GradingSubmissionCreate {
  grading_company_id: string;  // FIXED: was company_id
  date_submitted: string;
  items: GradingSubmissionItemCreate[];
  service_level_id?: string | null;
  submission_number?: string | null;
  reference_number?: string | null;
  shipping_to_cost?: number;
  shipping_to_tracking?: string | null;
  insurance_cost?: number;
  notes?: string | null;
}

// Alias for compatibility
export type SubmissionCreate = GradingSubmissionCreate;

export interface SubmissionStatusUpdate {
  status: string;
  date_received?: string | null;
  date_graded?: string | null;
  date_shipped_back?: string | null;
  shipping_return_tracking?: string | null;
}

export interface GradedItemResult {
  item_id: string;
  status: string;
  grade_value?: number | null;
  auto_grade?: number | null;
  cert_number?: string | null;
  label_type?: string | null;
  notes?: string | null;
}

export interface SubmissionGradeResults {
  item_results: GradedItemResult[];
  date_returned?: string | null;
  shipping_return_cost?: number;
}

export interface GradingStats {
  pending_submissions: number;  // FIXED: was total_submissions
  cards_out_for_grading: number;  // FIXED: was pending_cards
  pending_fees: number;  // FIXED: was total_fees
  grade_distribution: Record<string, number>;
  total_graded: number;  // FIXED: was total_cards_graded
  gem_rate: number;
}

export interface PendingByCompany {
  company_id: string;
  company_name: string;
  pending_submissions: number;
  pending_cards: number;
  total_fees: number;
}
