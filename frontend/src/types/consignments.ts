/**
 * Consignment Types
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

export interface ConsignerStats {
  total_consignments: number;
  total_cards_sent: number;
  total_cards_returned: number;
  total_fees_paid: number;
  pending_cards: number;
  success_rate: number;
}

// ============================================
// CONSIGNMENT ITEM TYPES
// ============================================

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

// ============================================
// CONSIGNMENT TYPES
// ============================================

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

export interface ConsignmentReturn {
  date_returned: string;
  items: {
    item_id: string;
    status: string;
    notes?: string;
  }[];
}

export interface PendingConsignmentsValue {
  total_pending_cards: number;
  total_pending_fees: number;
  consignments_count: number;
}
