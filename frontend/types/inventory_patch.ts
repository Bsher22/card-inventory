/**
 * Inventory Type Update - Add auth_company field
 * 
 * Add these fields to your inventory types in frontend/src/types/inventory.ts
 */

// Define the allowed values
export type AuthCompany = 'PSA/DNA' | 'Beckett';

// ============================================
// Add to Inventory interface:
// ============================================
//   auth_company: AuthCompany | null;

// ============================================
// Add to InventoryCreate interface:
// ============================================
//   auth_company?: AuthCompany | null;

// ============================================
// Add to InventoryUpdate interface:
// ============================================
//   auth_company?: AuthCompany | null;


// ============================================
// Full example of Inventory interface:
// ============================================
/*
export interface Inventory {
  id: string;
  checklist_id: string;
  base_type_id: string | null;
  parallel_id: string | null;
  quantity: number;
  serial_number: number | null;
  is_signed: boolean;
  is_slabbed: boolean;
  grade_company: string | null;
  grade_value: number | null;
  auto_grade: number | null;
  cert_number: string | null;
  auth_company: AuthCompany | null;  // <-- ADD THIS
  raw_condition: string;
  storage_location: string | null;
  notes: string | null;
  total_cost: number;
  created_at: string;
  updated_at: string;
}
*/


// ============================================
// Auth company options for dropdowns:
// ============================================
export const AUTH_COMPANIES = [
  { value: 'PSA/DNA', label: 'PSA/DNA' },
  { value: 'Beckett', label: 'Beckett Authentication' },
] as const;
