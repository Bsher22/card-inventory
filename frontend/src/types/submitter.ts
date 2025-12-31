/**
 * Submitter Types
 * 
 * Third-party submission services for grading and authentication.
 */

// ============================================
// SUBMITTER TYPES
// ============================================

export interface Submitter {
  id: string;
  name: string;
  code: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  offers_grading: boolean;
  offers_authentication: boolean;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitterCreate {
  name: string;
  code?: string | null;
  website?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  offers_grading?: boolean;
  offers_authentication?: boolean;
  is_active?: boolean;
  is_default?: boolean;
  notes?: string | null;
}

export interface SubmitterUpdate {
  name?: string;
  code?: string | null;
  website?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  offers_grading?: boolean;
  offers_authentication?: boolean;
  is_active?: boolean;
  is_default?: boolean;
  notes?: string | null;
}

export interface SubmitterSummary {
  id: string;
  name: string;
  code: string | null;
  offers_grading: boolean;
  offers_authentication: boolean;
  is_default: boolean;
}

export interface SubmitterStats {
  id: string;
  name: string;
  total_grading_submissions: number;
  total_auth_submissions: number;
  pending_grading: number;
  pending_auth: number;
  cards_graded: number;
  items_authenticated: number;
}