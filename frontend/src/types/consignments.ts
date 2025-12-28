/**
 * Consignment Types - FIXED to match Backend Schemas
 */

import type { Checklist } from './checklists';

// ============================================
// CONSIGNER TYPES
// ============================================

export interface Consigner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;  // FIXED: added
  default_fee: number | null;  // FIXED: was default_fee_per_card
  payment_method: string | null;
  payment_details: string | null;  // FIXED: added
  notes: string | null;
  is_active: boolean;
}

export interface ConsignerCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  default_fee?: number | null;  // FIXED: was default_fee_per_card
  payment_method?: string | null;
  payment_details?: string | null;
  notes?: string | null;
}

export interface ConsignerUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  default_fee?: number | null;  // FIXED: was default_fee_per_card
  payment_method?: string | null;
  payment_details?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface ConsignerStats {
  total_consignments: number;
  total_cards_sent: number;
  cards_signed: number;  // FIXED: was total_cards_returned
  cards_refused: number;  // FIXED: added
  cards_pending: number;  // FIXED: was pending_cards
  total_fees_paid: number;
  success_rate: number;
}

// ============================================
// CONSIGNMENT ITEM TYPES
// ============================================

export interface ConsignmentItem {
  id: string;
  checklist_id: string;
  quantity: number;
  fee_per_card: number;
  status: string;
  date_signed: string | null;  // FIXED: added
  inscription: string | null;  // FIXED: added
  checklist?: Checklist;
}

export interface ConsignmentItemCreate {
  checklist_id: string;
  quantity?: number;
  fee_per_card?: number | null;
  source_inventory_id?: string | null;  // FIXED: added
}

export interface ConsignmentItemResult {
  item_id: string;
  status: string;  // 'signed', 'refused', 'lost', 'returned_unsigned'
  inscription?: string | null;
  date_signed?: string | null;
  notes?: string | null;
}

// ============================================
// CONSIGNMENT TYPES
// ============================================

export interface Consignment {
  id: string;
  consigner_id: string;
  reference_number: string | null;  // FIXED: added
  date_sent: string;
  date_returned: string | null;
  expected_return_date: string | null;  // FIXED: added
  status: string;
  total_fee: number;
  fee_paid: boolean;  // FIXED: added
  notes: string | null;
  consigner?: Consigner;
  items?: ConsignmentItem[];
}

export interface ConsignmentCreate {
  consigner_id: string;
  date_sent: string;
  items: ConsignmentItemCreate[];
  reference_number?: string | null;
  expected_return_date?: string | null;
  shipping_out_cost?: number;
  shipping_out_tracking?: string | null;
  notes?: string | null;
}

export interface ConsignmentReturn {
  item_results: ConsignmentItemResult[];
  date_returned?: string | null;
  shipping_return_cost?: number;
  shipping_return_tracking?: string | null;
}

export interface PendingConsignmentsValue {
  total_pending_cards: number;
  total_pending_fees: number;
  consignments_count: number;
}
