/**
 * Grading Types - Aligned with Backend Schemas
 */

import type { Checklist } from './checklists';

// ============================================
// GRADING COMPANY TYPES
// ============================================

export interface GradingCompany {
  id: string;
  name: string;
  short_name: string;
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
  company_id: string;
  name: string;
  price_per_card: number;
  turnaround_days: number | null;
  is_active: boolean;
}

// ============================================
// GRADING SUBMISSION ITEM TYPES
// ============================================

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

// ============================================
// GRADING SUBMISSION TYPES
// ============================================

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

// Alias for compatibility
export type SubmissionCreate = GradingSubmissionCreate;

export interface SubmissionGradeResults {
  date_returned?: string;
  items: {
    item_id: string;
    grade_received?: number;
    auto_grade_received?: number;
    cert_number?: string;
    notes?: string;
  }[];
}

export interface GradingStats {
  total_submissions: number;
  total_cards_submitted: number;
  total_cards_graded: number;
  total_fees: number;
  average_grade: number | null;
  pending_cards: number;
}

export interface PendingByCompany {
  company_id: string;
  company_name: string;
  pending_submissions: number;
  pending_cards: number;
  total_fees: number;
}
