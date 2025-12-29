// src/types/consignments.ts
// Consignment types with address fields for consigners

// ============================================
// CONSIGNER TYPES
// ============================================

export interface ConsignerBase {
  name: string;
  email?: string | null;
  phone?: string | null;
  
  // Address fields
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  // Legacy location label
  location?: string | null;
  
  // Payment info
  default_fee?: number | null;
  payment_method?: string | null;
  payment_details?: string | null;
  
  is_active: boolean;
  notes?: string | null;
}

export interface ConsignerCreate extends ConsignerBase {}

export interface ConsignerUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  location?: string | null;
  
  default_fee?: number | null;
  payment_method?: string | null;
  payment_details?: string | null;
  
  is_active?: boolean;
  notes?: string | null;
}

export interface Consigner extends ConsignerBase {
  id: string;
  formatted_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsignerSummary {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  is_active: boolean;
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


// ============================================
// CONSIGNMENT TYPES
// ============================================

// Note: ConsignmentStatus is exported from common.ts

export interface ConsignmentBase {
  consigner_id: string;
  reference_number?: string | null;
  date_sent: string;
  date_returned?: string | null;
  expected_return_date?: string | null;
  status: string;
  total_fee: number;
  fee_paid: boolean;
  fee_paid_date?: string | null;
  shipping_out_cost: number;
  shipping_out_tracking?: string | null;
  shipping_return_cost: number;
  shipping_return_tracking?: string | null;
  notes?: string | null;
}

export interface ConsignmentCreate extends ConsignmentBase {}

export interface ConsignmentUpdate {
  consigner_id?: string;
  reference_number?: string | null;
  date_sent?: string;
  date_returned?: string | null;
  expected_return_date?: string | null;
  status?: string;
  total_fee?: number;
  fee_paid?: boolean;
  fee_paid_date?: string | null;
  shipping_out_cost?: number;
  shipping_out_tracking?: string | null;
  shipping_return_cost?: number;
  shipping_return_tracking?: string | null;
  notes?: string | null;
}

export interface Consignment extends ConsignmentBase {
  id: string;
  consigner?: ConsignerSummary | null;
  created_at: string;
  updated_at: string;
}

export interface PendingConsignmentsValue {
  total_cards_out: number;
  total_pending_fees: number;
  consignments_out: number;
}

export interface ConsignmentReturn {
  date_returned: string;
  items: ConsignmentReturnItem[];
}

export interface ConsignmentReturnItem {
  consignment_item_id: string;
  status: 'signed' | 'rejected' | 'lost';
  date_signed?: string;
  inscription?: string;
  condition_notes?: string;
}


// ============================================
// CONSIGNMENT ITEM TYPES
// ============================================

export type ConsignmentItemStatus = 'pending' | 'signed' | 'rejected' | 'lost';

export interface ConsignmentItemBase {
  checklist_id: string;
  source_inventory_id?: string | null;
  target_inventory_id?: string | null;
  quantity: number;
  fee_per_card: number;
  status: ConsignmentItemStatus;
  date_signed?: string | null;
  inscription?: string | null;
  condition_notes?: string | null;
  notes?: string | null;
}

export interface ConsignmentItemCreate extends ConsignmentItemBase {}

export interface ConsignmentItemUpdate {
  checklist_id?: string;
  source_inventory_id?: string | null;
  target_inventory_id?: string | null;
  quantity?: number;
  fee_per_card?: number;
  status?: ConsignmentItemStatus;
  date_signed?: string | null;
  inscription?: string | null;
  condition_notes?: string | null;
  notes?: string | null;
}

export interface ConsignmentItem extends ConsignmentItemBase {
  id: string;
  consignment_id: string;
  created_at: string;
  updated_at: string;
}


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formats a consigner's address into a multi-line string.
 * Useful when the backend computed field isn't available.
 */
export function formatConsignerAddress(consigner: Consigner | (ConsignerSummary & { 
  street_address?: string | null;
  postal_code?: string | null;
  country?: string | null;
})): string | null {
  // If it's a full Consigner with formatted_address, use that
  if ('formatted_address' in consigner && consigner.formatted_address) {
    return consigner.formatted_address;
  }
  
  // Otherwise build it manually
  const parts: string[] = [];
  
  if ('street_address' in consigner && consigner.street_address) {
    parts.push(consigner.street_address);
  }
  
  const cityStateParts: string[] = [];
  if (consigner.city) cityStateParts.push(consigner.city);
  if (consigner.state) cityStateParts.push(consigner.state);
  
  if (cityStateParts.length > 0) {
    let line2 = cityStateParts.join(', ');
    if ('postal_code' in consigner && consigner.postal_code) {
      line2 += ` ${consigner.postal_code}`;
    }
    parts.push(line2);
  } else if ('postal_code' in consigner && consigner.postal_code) {
    parts.push(consigner.postal_code);
  }
  
  if ('country' in consigner && consigner.country && consigner.country !== 'USA') {
    parts.push(consigner.country);
  }
  
  return parts.length > 0 ? parts.join('\n') : null;
}


// ============================================
// CONSTANTS
// ============================================

/**
 * US state abbreviations for dropdowns
 */
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;

export const CONSIGNMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'shipped', label: 'Shipped', color: 'blue' },
  { value: 'with_signer', label: 'With Signer', color: 'yellow' },
  { value: 'returned', label: 'Returned', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

export const CONSIGNMENT_ITEM_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'signed', label: 'Signed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'lost', label: 'Lost', color: 'red' },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'Venmo', label: 'Venmo' },
  { value: 'PayPal', label: 'PayPal' },
  { value: 'Zelle', label: 'Zelle' },
  { value: 'Check', label: 'Check' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' },
] as const;