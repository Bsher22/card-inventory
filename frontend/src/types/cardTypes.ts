/**
 * Card Types and Parallels Types
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
// FILTER TYPES
// ============================================

export interface ParallelFilter {
  category_id?: string;
  is_numbered?: boolean;
  max_print_run?: number;
  min_print_run?: number;
  year_introduced?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;  // Index signature for buildQueryString
}

// ============================================
// CHECKLIST PARSING TYPES (for PDF/Excel imports)
// ============================================

export interface ChecklistCreateWithTypes {
  card_number: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw: string;
  team?: string | null;
  set_name?: string | null;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  serial_numbered?: number | null;
  base_type_id?: string | null;
  parallel_id?: string | null;
}

export interface ChecklistParseResult {
  success: boolean;
  product_name: string | null;
  year: number | null;
  total_cards: number;
  prospect_cards: number;
  auto_cards: number;
  first_bowman_cards: number;
  parsed_cards: ChecklistCreateWithTypes[];
  errors: string[];
  warnings: string[];
}

export interface BulkChecklistImportResult {
  success: boolean;
  product_line_id: string | null;
  cards_created: number;
  cards_updated: number;
  cards_skipped: number;
  players_created: number;
  players_matched: number;
  errors: string[];
}

// ============================================
// HELPER FUNCTIONS
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
