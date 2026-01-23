/**
 * Inventory Types - Aligned with Backend Schemas
 */

import type { Checklist } from './checklists';
import type { CardBaseType, Parallel } from './cardTypes';
import type { PlayerInventorySummary } from './players';

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
  raw_condition: string;
  storage_location: string | null;
  notes: string | null;
  card_cost: number;
  signing_cost: number;
  grading_cost: number;
  total_cost: number;
  consigner: string | null;
  how_obtained: string | null;
  created_at: string;
  updated_at: string;
  checklist?: Checklist;
  base_type?: CardBaseType | null;
  parallel?: Parallel | null;
}

export interface InventoryCreate {
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
  card_cost?: number;
  signing_cost?: number;
  grading_cost?: number;
  total_cost?: number;
  consigner?: string | null;
  how_obtained?: string | null;
}

export interface InventoryUpdate {
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
  card_cost?: number;
  signing_cost?: number;
  grading_cost?: number;
  total_cost?: number;
  consigner?: string | null;
  how_obtained?: string | null;
}

export interface InventoryWithCard extends Inventory {
  checklist: Checklist;
}

export interface InventoryWithDetails extends InventoryWithCard {
  base_type: CardBaseType | null;
  parallel: Parallel | null;
}

export interface InventoryFilter {
  checklist_id?: string;
  product_line_id?: string;
  player_id?: string;
  base_type_id?: string;
  parallel_id?: string;
  is_signed?: boolean;
  is_slabbed?: boolean;
  player_name?: string;
  team?: string;
  min_quantity?: number;
  search?: string;
}

export interface BulkInventoryResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface InventorySummary {
  total_unique_cards: number;
  total_quantity: number;
  total_cost_basis: number;
  signed_count: number;
  slabbed_count: number;
  raw_count: number;
}

export interface PlayerInventoryGroup {
  player_name: string;
  total_quantity: number;
  total_cost: number;
  unsigned: InventoryWithCard[];
  signed: InventoryWithCard[];
  slabbed: InventoryWithCard[];
  unsigned_qty: number;
  signed_qty: number;
  slabbed_qty: number;
  card_cost: number;
  signing_cost: number;
  grading_cost: number;
}

export interface InventoryAnalytics {
  total_unique_cards: number;
  total_quantity: number;
  total_cost_basis: number;
  total_revenue: number;
  total_profit: number;
  cards_by_brand: Record<string, number>;
  cards_by_year: Record<number, number>;
  top_players: PlayerInventorySummary[];
}
