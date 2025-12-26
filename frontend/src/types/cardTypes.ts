/**
 * Card Types and Parallels TypeScript Types
 * These types are in perfect alignment with the backend Pydantic schemas
 * 
 * @see backend/app/schemas_card_types.py
 */

// ============================================
// CARD BASE TYPES
// ============================================

export interface CardBaseType {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface CardBaseTypeCreate {
  name: string;
  description?: string | null;
  sort_order?: number;
}

export interface CardBaseTypeUpdate {
  name?: string;
  description?: string | null;
  sort_order?: number;
}

export interface CardBaseTypeWithCounts extends CardBaseType {
  checklist_count: number;
  inventory_count: number;
}

// ============================================
// PARALLEL CATEGORIES
// ============================================

export interface ParallelCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ParallelCategoryCreate {
  name: string;
  sort_order?: number;
}

export interface ParallelCategoryUpdate {
  name?: string;
  sort_order?: number;
}

export interface ParallelCategoryWithParallels extends ParallelCategory {
  parallels: Parallel[];
}

// ============================================
// PARALLELS
// ============================================

export interface Parallel {
  id: string;
  category_id: string | null;
  name: string;
  short_name: string;
  print_run: number | null;
  is_numbered: boolean;
  is_one_of_one: boolean;
  pattern_description: string | null;
  year_introduced: number | null;
  typical_source: string | null;
  sort_order: number;
  created_at: string;
  display_name?: string;
}

export interface ParallelCreate {
  category_id?: string | null;
  name: string;
  short_name: string;
  print_run?: number | null;
  is_numbered?: boolean;
  is_one_of_one?: boolean;
  pattern_description?: string | null;
  year_introduced?: number | null;
  typical_source?: string | null;
  sort_order?: number;
}

export interface ParallelUpdate {
  category_id?: string | null;
  name?: string;
  short_name?: string;
  print_run?: number | null;
  is_numbered?: boolean;
  is_one_of_one?: boolean;
  pattern_description?: string | null;
  year_introduced?: number | null;
  typical_source?: string | null;
  sort_order?: number;
}

export interface ParallelWithCategory extends Parallel {
  category: ParallelCategory | null;
}

export interface ParallelWithInventoryCount extends Parallel {
  inventory_count: number;
}

// ============================================
// CARD PREFIX MAPPINGS
// ============================================

export interface CardPrefixMapping {
  id: string;
  prefix: string;
  product_type: string;
  card_type: string;
  is_autograph: boolean;
  is_prospect: boolean;
  base_type_name: string | null;
  notes: string | null;
}

export interface CardPrefixMappingCreate {
  prefix: string;
  product_type: string;
  card_type: string;
  is_autograph?: boolean;
  is_prospect?: boolean;
  base_type_name?: string | null;
  notes?: string | null;
}

// ============================================
// UPDATED CHECKLIST TYPES
// ============================================

export interface ChecklistWithTypes {
  id: string;
  product_line_id: string;
  card_number: string;
  card_prefix: string | null;
  card_suffix: string | null;
  player_id: string | null;
  player_name_raw: string | null;
  base_type_id: string | null;
  set_name: string | null;
  is_autograph: boolean;
  is_rookie_card: boolean;
  team: string | null;
  raw_checklist_line: string | null;
  notes: string | null;
  created_at: string;
  
  // Nested
  base_type?: CardBaseType | null;
}

export interface ChecklistCreateWithTypes {
  product_line_id: string;
  card_number: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw?: string | null;
  player_id?: string | null;
  base_type_id?: string | null;
  set_name?: string | null;
  is_autograph?: boolean;
  is_rookie_card?: boolean;
  team?: string | null;
  raw_checklist_line?: string | null;
  notes?: string | null;
}

// ============================================
// UPDATED INVENTORY TYPES
// ============================================

export interface InventoryWithParallel {
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
  raw_condition: string;
  storage_location: string | null;
  notes: string | null;
  total_cost: number;
  created_at: string;
  updated_at: string;
  
  // Nested
  base_type?: CardBaseType | null;
  parallel?: Parallel | null;
}

export interface InventoryCreateWithParallel {
  checklist_id: string;
  base_type_id?: string | null;
  parallel_id?: string | null;
  quantity: number;
  serial_number?: number | null;
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

export interface InventoryUpdateWithParallel {
  base_type_id?: string | null;
  parallel_id?: string | null;
  quantity?: number;
  serial_number?: number | null;
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

export interface InventoryWithFullDetails extends InventoryWithParallel {
  checklist?: ChecklistWithTypes | null;
  product_line_name?: string | null;
  product_line_year?: number | null;
  player_name?: string | null;
  card_display?: string | null;
}

// ============================================
// PARSED CHECKLIST TYPES
// ============================================

export interface ParsedCard {
  card_number: string;
  card_prefix: string;
  card_suffix: string;
  player_name: string;
  team: string;
  is_autograph: boolean;
  is_rookie: boolean;
  set_name: string;
  base_type: string;
  raw_line: string;
}

export interface ChecklistParseResult {
  product_name: string;
  year: number;
  product_type: 'Bowman' | 'Bowman Chrome' | 'Bowman Draft' | 'Bowman Sapphire';
  cards: ParsedCard[];
  stats: {
    total_lines_processed: number;
    prospect_cards_found: number;
    skipped_non_prospect: number;
    parse_errors: number;
  };
}

export interface BulkChecklistImportResult {
  total_processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    card?: string;
    error: string;
  }>;
}

// ============================================
// FILTER TYPES
// ============================================

export interface ParallelFilter {
  category_id?: string;
  is_numbered?: boolean;
  max_print_run?: number;
  min_print_run?: number;
  year_introduced?: number;
  search?: string;
}

export interface InventoryFilter {
  checklist_id?: string;
  base_type_id?: string;
  parallel_id?: string;
  is_signed?: boolean;
  is_slabbed?: boolean;
  player_name?: string;
  team?: string;
  min_quantity?: number;
}

// ============================================
// UTILITY TYPES
// ============================================

/** Card condition options for raw (non-slabbed) cards */
export type CardCondition = 'MT' | 'NM-MT' | 'NM' | 'EX-MT' | 'EX' | 'VG-EX' | 'VG' | 'GOOD' | 'FAIR' | 'POOR';

/** Grading companies */
export type GradingCompany = 'PSA' | 'BGS' | 'SGC' | 'CGC' | 'HGA' | 'CSG' | 'AGS';

/** Product types for Bowman family */
export type BowmanProductType = 'Bowman' | 'Bowman Chrome' | 'Bowman Draft' | 'Bowman Sapphire';

/** Base type names */
export type BaseTypeName = 'Paper' | 'Chrome' | 'Mega' | 'Sapphire';

// ============================================
// HELPER TYPE FOR DISPLAY
// ============================================

/**
 * Helper to get display text for a parallel
 */
export function getParallelDisplayName(parallel: Parallel): string {
  if (parallel.display_name) return parallel.display_name;
  if (parallel.print_run === 1) return `${parallel.short_name} 1/1`;
  if (parallel.print_run) return `${parallel.short_name} /${parallel.print_run}`;
  return parallel.short_name;
}

/**
 * Helper to format card display string
 */
export function formatCardDisplay(
  cardNumber: string,
  playerName: string,
  parallel?: Parallel | null,
  serialNumber?: number | null
): string {
  let display = `${cardNumber} ${playerName}`;
  
  if (parallel) {
    display += ` ${parallel.short_name}`;
    if (parallel.print_run && serialNumber) {
      display += ` ${serialNumber}/${parallel.print_run}`;
    } else if (parallel.print_run) {
      display += ` /${parallel.print_run}`;
    }
  }
  
  return display;
}

// ============================================
// CONSTANTS
// ============================================

export const PARALLEL_CATEGORIES = {
  CORE: 'Core',
  PATTERNED: 'Patterned',
  SHIMMER_WAVE: 'Shimmer/Wave',
  EXCLUSIVE: 'Exclusive',
  SNACK_PACK: 'Snack Pack',
  YEAR_SPECIFIC: 'Year-Specific',
} as const;

export const BASE_TYPES = {
  PAPER: 'Paper',
  CHROME: 'Chrome',
  MEGA: 'Mega',
  SAPPHIRE: 'Sapphire',
} as const;

export const CONDITION_OPTIONS: CardCondition[] = [
  'MT', 'NM-MT', 'NM', 'EX-MT', 'EX', 'VG-EX', 'VG', 'GOOD', 'FAIR', 'POOR'
];

export const GRADING_COMPANIES: GradingCompany[] = [
  'PSA', 'BGS', 'SGC', 'CGC', 'HGA', 'CSG', 'AGS'
];