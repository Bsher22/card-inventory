/**
 * Checklist Types
 */

import type { Player } from './players';
import type { ProductLine } from './products';

export interface Checklist {
  id: string;
  product_line_id: string;
  card_number: string;
  card_prefix: string | null;
  card_suffix: string | null;
  player_name_raw: string;
  player_id: string | null;
  team: string | null;
  card_type_id: string | null;
  set_name: string | null;
  parallel_name: string | null;
  is_autograph: boolean;
  is_relic: boolean;
  is_rookie_card: boolean;
  is_first_bowman: boolean;
  serial_numbered: number | null;
  raw_checklist_line: string | null;
  created_at: string;
  updated_at: string;
  player?: Player | null;
  product_line?: ProductLine | null;
  inventory_count?: number;
}

export interface ChecklistCreate {
  product_line_id: string;
  card_number: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw: string;
  player_id?: string | null;
  team?: string | null;
  card_type_id?: string | null;
  set_name?: string | null;
  parallel_name?: string | null;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  serial_numbered?: number | null;
}

export interface ChecklistUpdate {
  card_number?: string;
  card_prefix?: string | null;
  card_suffix?: string | null;
  player_name_raw?: string;
  player_id?: string | null;
  team?: string | null;
  card_type_id?: string | null;
  set_name?: string | null;
  parallel_name?: string | null;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  serial_numbered?: number | null;
}

export interface ChecklistWithDetails extends Checklist {
  player: Player | null;
  product_line: ProductLine | null;
}

export interface ChecklistFilters {
  product_line_id?: string;
  brand_id?: string;
  player_id?: string;
  search?: string;
  set_name?: string;
  is_autograph?: boolean;
  is_relic?: boolean;
  is_rookie_card?: boolean;
  is_first_bowman?: boolean;
  has_inventory?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChecklistUploadPreview {
  filename: string;
  detected_product: string | null;
  detected_year: number | null;
  total_rows: number;
  sample_rows: Record<string, unknown>[];
  column_mapping: Record<string, string>;
  detected_columns: Record<string, string>;
  columns_found: string[];
  unmapped_columns: string[];
}

export interface ChecklistUploadResult {
  product_line_id: string | null;
  total_rows: number;
  cards_created: number;
  cards_updated: number;
  players_created: number;
  players_matched: number;
  errors: string[];
  success: boolean;
  imported: number;
  skipped: number;
}
